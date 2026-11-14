import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Super Admin - Platform Finance Overview
 * Clearly separates Enqopa SaaS Subscription Revenue from Landlords' Rental Volume
 */
export const getPlatformFinanceOverview = async (req, res, next) => {
  try {
    const [
      subInvoicesApproved,
      subInvoicesPending,
      rentalPaymentsApproved,
      rentalPaymentsPending,
      activeSubs,
      plansWithRevenue,
      recentSubInvoices,
      recentRentalTransactions,
    ] = await Promise.all([
      prisma.subscriptionInvoice.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.subscriptionInvoice.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      prisma.subscriptionPlan.findMany({
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: { amount: true, billingCycle: true },
          },
        },
      }),
      prisma.subscriptionInvoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          owner: { select: { id: true, name: true, email: true, companyName: true } },
          subscription: { include: { plan: true } },
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          tenant: { select: { fullName: true, phone: true } },
          building: { select: { name: true } },
          office: { select: { number: true } },
        },
      }),
    ]);

    // Calculate MRR / ARR for Enqopa
    let mrr = 0;
    activeSubs.forEach((sub) => {
      const p = sub.plan;
      if (p) {
        if (sub.billingCycle === 'YEARLY') {
          mrr += Number(p.priceYearly) / 12;
        } else {
          mrr += Number(p.priceMonthly);
        }
      }
    });
    const arr = mrr * 12;

    // Breakdown revenue by plan
    const planBreakdown = plansWithRevenue.map((plan) => {
      const activeCount = plan.subscriptions.length;
      const totalRevenue = plan.subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);
      return {
        planId: plan.id,
        planName: plan.name,
        slug: plan.slug,
        activeCount,
        totalRevenue,
      };
    });

    return successResponse(res, 'Platform financial overview retrieved', {
      // 1. Enqopa SaaS Subscription Revenue (Company's actual income)
      saasRevenue: {
        totalCollected: Number(subInvoicesApproved._sum.amount || 0),
        approvedInvoicesCount: subInvoicesApproved._count || 0,
        pendingRevenue: Number(subInvoicesPending._sum.amount || 0),
        pendingInvoicesCount: subInvoicesPending._count || 0,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        activePayingOwners: activeSubs.length,
        planBreakdown,
      },

      // 2. Landlord Rental Volume (Escrow/Pass-through money collected by landlords)
      landlordRentVolume: {
        totalCollectedRent: Number(rentalPaymentsApproved._sum.amount || 0),
        approvedPaymentsCount: rentalPaymentsApproved._count || 0,
        pendingRent: Number(rentalPaymentsPending._sum.amount || 0),
        pendingPaymentsCount: rentalPaymentsPending._count || 0,
      },

      // Recent transaction logs
      recentSubInvoices,
      recentRentalTransactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin - List all SaaS Subscription Invoices
 */
export const getSubscriptionInvoices = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { txnRef: { contains: search } },
        { owner: { name: { contains: search } } },
        { owner: { email: { contains: search } } },
        { owner: { companyName: { contains: search } } },
      ];
    }

    const invoices = await prisma.subscriptionInvoice.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, companyName: true, phone: true } },
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, 'Subscription invoices retrieved', invoices);
  } catch (error) {
    next(error);
  }
};

/**
 * Export Platform Financial Report to Excel
 */
export const exportFinanceExcel = async (req, res, next) => {
  try {
    const [invoices, payments] = await Promise.all([
      prisma.subscriptionInvoice.findMany({
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        include: { tenant: true, building: true, office: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Enqopa RentPro';
    workbook.created = new Date();

    // Sheet 1: Enqopa SaaS Subscription Revenue
    const saasSheet = workbook.addWorksheet('Enqopa SaaS Revenue');
    saasSheet.columns = [
      { header: 'Invoice #', key: 'invoiceNumber', width: 16 },
      { header: 'Owner Name', key: 'ownerName', width: 24 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'Period', key: 'period', width: 20 },
      { header: 'Billing Cycle', key: 'cycle', width: 14 },
      { header: 'Amount (ETB)', key: 'amount', width: 16 },
      { header: 'Payment Method', key: 'method', width: 18 },
      { header: 'Txn Ref', key: 'txnRef', width: 22 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Date', key: 'createdAt', width: 16 },
    ];

    invoices.forEach((inv) => {
      saasSheet.addRow({
        invoiceNumber: inv.invoiceNumber,
        ownerName: inv.owner?.name || '—',
        company: inv.owner?.companyName || '—',
        period: inv.period,
        cycle: inv.billingCycle,
        amount: Number(inv.amount),
        method: inv.paymentMethod,
        txnRef: inv.txnRef || '—',
        status: inv.status,
        createdAt: inv.createdAt.toISOString().split('T')[0],
      });
    });

    // Sheet 2: Landlord Rental Payments
    const rentalSheet = workbook.addWorksheet('Landlord Rental Volume');
    rentalSheet.columns = [
      { header: 'Payment ID', key: 'id', width: 16 },
      { header: 'Tenant', key: 'tenant', width: 24 },
      { header: 'Building', key: 'building', width: 20 },
      { header: 'Unit / Office', key: 'office', width: 14 },
      { header: 'Period', key: 'period', width: 18 },
      { header: 'Amount (ETB)', key: 'amount', width: 16 },
      { header: 'Method', key: 'method', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Date', key: 'date', width: 16 },
    ];

    payments.forEach((p) => {
      rentalSheet.addRow({
        id: p.id.slice(0, 8),
        tenant: p.tenant?.fullName || '—',
        building: p.building?.name || '—',
        office: p.office?.number ? `Unit ${p.office.number}` : '—',
        period: p.period,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        date: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : '—',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Enqopa_RentPro_Platform_Finance.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Export Platform Financial Report to PDF
 */
export const exportFinancePDF = async (req, res, next) => {
  try {
    const [subInvoices, rentalSummary] = await Promise.all([
      prisma.subscriptionInvoice.findMany({
        where: { status: 'APPROVED' },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalSaasRevenue = subInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalRentVolume = Number(rentalSummary._sum.amount || 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Enqopa_RentPro_Financial_Report.pdf"'
    );

    doc.pipe(res);

    // Header
    doc
      .fontSize(20)
      .fillColor('#0B2239')
      .text('Enqopa RentPro — Platform Financial Statement', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#64748B')
      .text(`Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary Box
    doc.rect(40, doc.y, 515, 75).fillAndStroke('#FEF3C7', '#F59E0B');
    const boxY = doc.y + 12;
    doc
      .fontSize(11)
      .fillColor('#0B2239')
      .text('Enqopa SaaS Subscription Revenue:', 55, boxY)
      .font('Helvetica-Bold')
      .text(`ETB ${totalSaasRevenue.toLocaleString()}`, 280, boxY);

    doc
      .font('Helvetica')
      .text('Managed Landlord Rental Volume:', 55, boxY + 22)
      .font('Helvetica-Bold')
      .text(`ETB ${totalRentVolume.toLocaleString()}`, 280, boxY + 22);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text('Note: Enqopa SaaS revenue strictly accounts for platform software licenses and excludes landlords\' rental receipts.', 55, boxY + 44);

    doc.y = boxY + 80;
    doc.moveDown(1);

    // Invoices Table
    doc.fontSize(14).fillColor('#0B2239').font('Helvetica-Bold').text('Recent SaaS Subscription Invoices');
    doc.moveDown(0.5);

    doc.fontSize(9).fillColor('#0B2239');
    let startY = doc.y;
    doc.text('Invoice #', 45, startY);
    doc.text('Client / Company', 140, startY);
    doc.text('Period', 310, startY);
    doc.text('Amount (ETB)', 420, startY);
    doc.text('Status', 500, startY);

    doc.moveTo(40, startY + 14).lineTo(550, startY + 14).strokeColor('#CBD5E1').stroke();
    let currentY = startY + 20;

    subInvoices.slice(0, 15).forEach((inv) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }
      doc.font('Helvetica').fontSize(8).fillColor('#1E293B');
      doc.text(inv.invoiceNumber, 45, currentY);
      doc.text(inv.owner?.companyName || inv.owner?.name || '—', 140, currentY, { width: 160 });
      doc.text(inv.period, 310, currentY);
      doc.text(Number(inv.amount).toLocaleString(), 420, currentY);
      doc.text(inv.status, 500, currentY);
      currentY += 18;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
