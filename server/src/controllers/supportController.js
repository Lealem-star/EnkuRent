import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getTickets = async (req, res, next) => {
  try {
    const { status, priority, category, search } = req.query;
    const where = {};

    // Role-based scoping
    if (req.user.isSuperAdmin) {
      // Super admin sees all tickets
    } else if (req.user.isOwner) {
      where.OR = [
        { ownerId: req.user.id },
        { userId: req.user.id },
      ];
    } else if (req.user.role === 'MANAGER') {
      where.OR = [
        { ownerId: req.user.ownerId || undefined },
        { userId: req.user.id },
      ];
    } else {
      // Tenants see only their own tickets
      where.userId = req.user.id;
    }

    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (category && category !== 'ALL') where.category = category;

    if (search) {
      const searchCondition = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true, companyName: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return successResponse(res, 'Support tickets retrieved', tickets);
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true, companyName: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) return errorResponse(res, 'Ticket not found', 404);

    if (!req.user.isSuperAdmin && ticket.userId !== req.user.id) {
      return errorResponse(res, 'Access denied for this support ticket', 403);
    }

    return successResponse(res, 'Ticket retrieved', ticket);
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const { subject, message, priority = 'MEDIUM', category = 'GENERAL' } = req.body;

    if (!subject || !message) {
      return errorResponse(res, 'Subject and message are required', 400);
    }

    const ticketNumber = `TICK-${Date.now().toString().slice(-6)}`;

    // Resolve ownerId
    let ownerId = req.user.isOwner ? req.user.id : req.user.ownerId || null;
    if (!ownerId && req.user.role === 'TENANT') {
      const tenantRecord = await prisma.tenant.findFirst({
        where: { OR: [{ userId: req.user.id }, { email: req.user.email }] },
        include: {
          contracts: {
            where: { status: 'ACTIVE' },
            include: { office: { include: { building: true } } },
          },
        },
      });
      if (tenantRecord?.contracts?.[0]?.office?.building?.ownerId) {
        ownerId = tenantRecord.contracts[0].office.building.ownerId;
      }
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          ticketNumber,
          userId: req.user.id,
          ownerId,
          subject,
          description: message,
          priority,
          category,
          status: 'OPEN',
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: req.user.id,
          senderName: req.user.name || 'User',
          senderRole: req.user.role || 'TENANT',
          message,
          isInternal: false,
        },
      });

      return t;
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      meta: { ticketNumber: ticket.ticketNumber, subject: ticket.subject },
    });

    return successResponse(res, 'Support ticket submitted successfully', ticket, 201);
  } catch (error) {
    next(error);
  }
};

export const replyToTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, isInternal = false } = req.body;

    if (!message) {
      return errorResponse(res, 'Message text is required', 400);
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!ticket) return errorResponse(res, 'Ticket not found', 404);

    if (!req.user.isSuperAdmin && ticket.userId !== req.user.id) {
      return errorResponse(res, 'Access denied for this support ticket', 403);
    }

    const reply = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: req.user.id,
        senderName: req.user.name || 'User',
        senderRole: req.user.role || 'USER',
        message,
        isInternal: req.user.isSuperAdmin ? Boolean(isInternal) : false,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Update ticket status
    let newStatus = ticket.status;
    if (req.user.isSuperAdmin && !isInternal) {
      newStatus = 'WAITING_FOR_CUSTOMER';
    } else if (!req.user.isSuperAdmin) {
      newStatus = 'IN_PROGRESS';
    }

    await prisma.supportTicket.update({
      where: { id },
      data: { status: newStatus, updatedAt: new Date() },
    });

    return successResponse(res, 'Reply added successfully', reply, 201);
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedToId } = req.body;

    const data = {};
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data,
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: updated.id,
      meta: { status: updated.status, priority: updated.priority },
    });

    return successResponse(res, 'Ticket status updated successfully', updated);
  } catch (error) {
    next(error);
  }
};
