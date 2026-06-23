import { prisma } from '../../config/db.js';

// Public endpoint — portal uses orgSlug query param
export async function listPublicFees(req, res) {
  const { orgSlug } = req.query;
  if (!orgSlug) return res.status(400).json({ success: false, message: 'orgSlug required' });
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
  if (!org) return res.status(404).json({ success: false, message: 'Clinic not found' });
  const fees = await prisma.serviceType.findMany({
    where: { orgId: org.id, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, fee: true },
  });
  res.json({ success: true, data: fees });
}

export async function listFees(req, res) {
  const fees = await prisma.serviceType.findMany({
    where: { orgId: req.org.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: fees });
}

export async function createFee(req, res) {
  const { name, fee, isActive = true } = req.body;
  if (!name || fee === undefined) {
    return res.status(400).json({ success: false, message: 'name and fee are required' });
  }
  const record = await prisma.serviceType.create({
    data: { orgId: req.org.id, name, fee: parseFloat(fee), isActive },
  });
  res.status(201).json({ success: true, data: record });
}

export async function updateFee(req, res) {
  const { name, fee, isActive } = req.body;
  const record = await prisma.serviceType.updateMany({
    where: { id: req.params.id, orgId: req.org.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(fee !== undefined ? { fee: parseFloat(fee) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  if (!record.count) return res.status(404).json({ success: false, message: 'Not found' });
  const updated = await prisma.serviceType.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: updated });
}

export async function deleteFee(req, res) {
  const deleted = await prisma.serviceType.deleteMany({
    where: { id: req.params.id, orgId: req.org.id },
  });
  if (!deleted.count) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true });
}
