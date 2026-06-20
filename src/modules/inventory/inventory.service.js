import { prisma } from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function listItems(orgId, { search, lowStock, page = 1, limit = 25 }) {
  const where = {
    orgId,
    isActive: true,
    ...(search && {
      OR: [
        { itemName: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(lowStock === 'true' && {
      AND: [{ quantity: { lte: 10 } }],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { itemName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getLowStockItems(orgId) {
  return prisma.$queryRaw`
    SELECT * FROM inventory_items
    WHERE "orgId" = ${orgId}
    AND quantity <= "reorderLevel"
    ORDER BY "itemName"
  `;
}

export async function createItem(orgId, data) {
  return prisma.inventoryItem.create({
    data: { ...data, orgId },
  });
}

export async function updateItem(orgId, id, data) {
  const item = await prisma.inventoryItem.findFirst({ where: { id, orgId } });
  if (!item) throw new AppError('Item not found', 404);
  return prisma.inventoryItem.update({ where: { id }, data });
}

export async function adjustStock(orgId, itemId, { type, quantity, notes, referenceId, referenceType, performedBy }) {
  const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, orgId } });
  if (!item) throw new AppError('Item not found', 404);

  const delta = type === 'IN' ? quantity : -quantity;
  const newQty = item.quantity + delta;
  if (newQty < 0) throw new AppError('Insufficient stock', 400);

  const [transaction] = await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: itemId,
        type,
        quantity,
        notes,
        referenceId,
        referenceType,
        performedBy,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQty },
    }),
  ]);

  return transaction;
}

export async function getTransactions(orgId, itemId, { page = 1, limit = 50 }) {
  const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, orgId } });
  if (!item) throw new AppError('Item not found', 404);

  const where = { inventoryItemId: itemId };
  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      orderBy: { transactedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);
  return { transactions, total, page, limit };
}
