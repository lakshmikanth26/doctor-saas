import { prisma } from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function listStaff(orgId, { branchId, role, search, page = 1, limit = 25 }) {
  const where = {
    orgId,
    ...(branchId && { userBranches: { some: { branchId } } }),
    ...(role && { userBranches: { some: { role } } }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [staff, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        systemRole: true, status: true,
        staffProfile: true,
        userBranches: { include: { branch: { select: { id: true, name: true } } } },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { staff, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getStaff(orgId, id) {
  const member = await prisma.user.findFirst({
    where: { id, orgId },
    include: {
      staffProfile: true,
      userBranches: { include: { branch: true } },
    },
  });
  if (!member) throw new AppError('Staff member not found', 404);
  return member;
}

export async function updateProfile(orgId, id, data) {
  const member = await prisma.user.findFirst({ where: { id, orgId } });
  if (!member) throw new AppError('Staff member not found', 404);

  const {
    designation, specialization, licenseNumber, licenseExpiry,
    qualifications, consultationFee, bio,
    ...userFields
  } = data;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        firstName: userFields.firstName,
        lastName: userFields.lastName,
        phone: userFields.phone,
      },
    });

    await tx.staffProfile.upsert({
      where: { userId: id },
      create: {
        userId: id, designation, specialization, licenseNumber,
        licenseExpiry, qualifications, consultationFee, bio,
      },
      update: {
        designation, specialization, licenseNumber, licenseExpiry,
        qualifications, consultationFee, bio,
      },
    });

    return user;
  });
}

export async function getLeaveRequests(orgId, { userId, status, page = 1, limit = 25 }) {
  const where = { orgId, ...(userId && { userId }), ...(status && { status }) };
  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  return { leaves, total, page, limit };
}

export async function createLeaveRequest(orgId, userId, data) {
  return prisma.leaveRequest.create({
    data: { ...data, orgId, userId },
  });
}

export async function updateLeaveStatus(orgId, id, status, approvedById) {
  const leave = await prisma.leaveRequest.findFirst({ where: { id, orgId } });
  if (!leave) throw new AppError('Leave request not found', 404);
  return prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      approvedBy: approvedById,
      approvedAt: status === 'APPROVED' ? new Date() : null,
    },
  });
}

export async function getAttendance(orgId, { userId, branchId, from, to, page = 1, limit = 50 }) {
  const branchUsers = branchId
    ? await prisma.userBranch.findMany({ where: { branchId }, select: { userId: true } })
    : null;
  const branchUserIds = branchUsers?.map((ub) => ub.userId);

  const where = {
    ...(userId && { userId }),
    ...(branchId && { branchId }),
    ...(branchUserIds && !userId && { userId: { in: branchUserIds } }),
    ...(from && to && { date: { gte: new Date(from), lte: new Date(to) } }),
  };

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);
  return { records, total, page, limit };
}

export async function recordAttendance(orgId, userId, data) {
  const date = new Date(data.date);
  return prisma.attendance.upsert({
    where: { userId_branchId_date: { userId, branchId: data.branchId, date } },
    create: {
      userId,
      branchId: data.branchId,
      date,
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      method: data.method || 'MANUAL',
      notes: data.notes,
    },
    update: {
      checkOut: data.checkOut ? new Date(data.checkOut) : undefined,
      notes: data.notes,
    },
  });
}
