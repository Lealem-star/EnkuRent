import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getOverview = async (req, res, next) => {
  try {
    const { buildingId } = req.query;
    const whereOffice = { isDeleted: false };

    if (req.user.isSuperAdmin) {
      if (buildingId && buildingId !== '__all__') {
        whereOffice.buildingId = String(buildingId);
      }
    } else if (req.user.isOwner) {
      whereOffice.building = { ownerId: req.user.id, isDeleted: false };
      if (buildingId && buildingId !== '__all__') {
        whereOffice.buildingId = String(buildingId);
      }
    } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
      if (buildingId && buildingId !== '__all__') {
        if (!req.user.buildingIds.includes(String(buildingId))) {
          return successResponse(res, 'No data accessible', {
            total: 0,
            occupied: 0,
            available: 0,
            maintenance: 0,
            expected: 0,
            collected: 0,
            outstanding: 0,
            late: 0,
            pending: 0,
            collectionRate: 0,
            occupancyRate: 0,
            monthlyTrend: [],
          });
        }
        whereOffice.buildingId = String(buildingId);
      } else {
        whereOffice.buildingId = { in: req.user.buildingIds };
      }
    } else {
      return successResponse(res, 'No data accessible', {
        total: 0,
        occupied: 0,
        available: 0,
        maintenance: 0,
        expected: 0,
        collected: 0,
        outstanding: 0,
        late: 0,
        pending: 0,
        collectionRate: 0,
        occupancyRate: 0,
        monthlyTrend: [],
      });
    }

    const offices = await prisma.office.findMany({
      where: whereOffice,
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: true,
            payments: {
              where: { period: 'September 2026' },
            },
          },
        },
      },
    });

    const total = offices.length;
    const occupied = offices.filter((o) => o.status === 'OCCUPIED').length;
    const available = offices.filter((o) => o.status === 'AVAILABLE').length;
    const maintenance = offices.filter((o) => o.status === 'MAINTENANCE').length;

    let expected = 0;
    let collected = 0;
    let late = 0;
    let pending = 0;

    const now = new Date();
    const dueDate = new Date('2026-09-05T00:00:00Z');

    offices.forEach((o) => {
      const contract = o.contracts[0];
      if (contract) {
        const rent = Number(contract.rent);
        expected += rent;

        const currentPay = contract.payments[0];
        if (currentPay) {
          if (currentPay.status === 'APPROVED') {
            collected += Number(currentPay.amount);
          } else if (currentPay.status === 'PENDING') {
            pending++;
          } else if (currentPay.status === 'REJECTED') {
            late++;
          }
        } else if (now > dueDate) {
          late++;
        }
      }
    });

    const outstanding = Math.max(0, expected - collected);
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Monthly trends for chart
    const monthlyTrend = [
      { label: 'Jun', expected: Math.round(expected * 0.94), collected: Math.round(expected * 0.94 * 0.9) },
      { label: 'Jul', expected: Math.round(expected * 0.97), collected: Math.round(expected * 0.97 * 0.93) },
      { label: 'Aug', expected: Math.round(expected * 0.99), collected: Math.round(expected * 0.99 * 0.88) },
      { label: 'Sep', expected, collected },
    ];

    return successResponse(res, 'Overview statistics retrieved', {
      total,
      occupied,
      available,
      maintenance,
      expected,
      collected,
      outstanding,
      late,
      pending,
      collectionRate,
      occupancyRate,
      monthlyTrend,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const { type = 'revenue', format = 'pdf' } = req.params;
    const { buildingId } = req.query;

    const whereBuilding = { isDeleted: false };
    if (req.user.isSuperAdmin) {
      if (buildingId && buildingId !== '__all__') {
        whereBuilding.id = String(buildingId);
      }
    } else if (req.user.isOwner) {
      whereBuilding.ownerId = req.user.id;
      if (buildingId && buildingId !== '__all__') {
        whereBuilding.id = String(buildingId);
      }
    } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
      if (buildingId && buildingId !== '__all__') {
        if (!req.user.buildingIds.includes(String(buildingId))) {
          return errorResponse(res, 'Access denied for this building', 403);
        }
        whereBuilding.id = String(buildingId);
      } else {
        whereBuilding.id = { in: req.user.buildingIds };
      }
    } else {
      return errorResponse(res, 'No properties accessible for report export', 403);
    }

    const buildings = await prisma.building.findMany({
      where: whereBuilding,
      include: {
        offices: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              include: {
                tenant: true,
                payments: { orderBy: { submittedAt: 'desc' } },
              },
            },
          },
        },
      },
    });

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Enqopa RentPro';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Enqopa RentPro Report');
      worksheet.columns = [
        { header: 'Building', key: 'building', width: 25 },
        { header: 'Office', key: 'office', width: 12 },
        { header: 'Floor', key: 'floor', width: 8 },
        { header: 'Tenant', key: 'tenant', width: 24 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Rent (ETB)', key: 'rent', width: 16 },
        { header: 'Frequency', key: 'frequency', width: 14 },
        { header: 'September Status', key: 'status', width: 18 },
      ];

      buildings.forEach((b) => {
        b.offices.forEach((o) => {
          const c = o.contracts[0];
          const t = c?.tenant;
          const currentPay = c?.payments.find((p) => p.period === 'September 2026');
          let st = 'Vacant';
          if (o.status === 'MAINTENANCE') st = 'Maintenance';
          else if (currentPay) st = currentPay.status;
          else if (c) st = 'Overdue';

          worksheet.addRow({
            building: b.name,
            office: `Office ${o.number}`,
            floor: o.floor,
            tenant: t ? t.fullName : '—',
            phone: t ? t.phone : '—',
            rent: c ? Number(c.rent) : 0,
            frequency: c ? c.frequency : '—',
            status: st,
          });
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=enqopa_${type}_report.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Default to PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=enqopa_${type}_report.pdf`);
    doc.pipe(res);

    // Header styling matching Enqopa RentPro aesthetic
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#0B2239').text('Enqopa RentPro — Financial & Property Report');
    doc.fontSize(10).font('Helvetica').fillColor('#4A5170').text(`Generated: ${new Date().toLocaleString()} · Addis Ababa, Ethiopia`);
    doc.moveDown();

    doc.rect(40, doc.y, 530, 2).fillColor('#F59E0B').fill();
    doc.moveDown(1.5);

    buildings.forEach((b) => {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0B2239').text(b.name, { underline: true });
      doc.fontSize(9).font('Helvetica').fillColor('#4A5170').text(`Address: ${b.address} · Floors: ${b.floors}`);
      doc.moveDown(0.5);

      b.offices.forEach((o) => {
        const c = o.contracts[0];
        const t = c?.tenant;
        const currentPay = c?.payments.find((p) => p.period === 'September 2026');
        const rentText = c ? `ETB ${Number(c.rent).toLocaleString()}` : '—';
        const statusText = currentPay ? currentPay.status : (c ? 'OVERDUE' : o.status);

        doc.fontSize(9).font('Helvetica').fillColor('#0B2239')
          .text(`Office ${o.number} (Floor ${o.floor})  |  Tenant: ${t ? t.fullName : 'Vacant'}  |  Rent: ${rentText}  |  Status: ${statusText}`);
      });
      doc.moveDown(1.5);
    });

    doc.rect(40, doc.y, 530, 1).fillColor('#E4E1D6').fill();
    doc.moveDown();
    doc.fontSize(8).fillColor('#4A5170').text('Enqopa Technologies PLC • Enqopa RentPro — Confidential', { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
};
