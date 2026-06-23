/**
 * Seeds demo doctor staff for the demo org.
 * Run with: node scripts/seed-demo-doctors.js
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const dbUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=no-verify');
const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_ORG_SLUG = 'clinic1-c5d8f3';

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) { console.error('Demo org not found'); process.exit(1); }
  console.log('Org:', org.id, org.name);

  // Get the first branch
  const branch = await prisma.branch.findFirst({ where: { orgId: org.id } });
  if (!branch) { console.error('No branch found for demo org'); process.exit(1); }
  console.log('Branch:', branch.id, branch.name);

  // Update the existing ORG_OWNER (Demo 123) to have a specialization
  const owner = await prisma.user.findFirst({ where: { orgId: org.id } });
  if (owner) {
    await prisma.staffProfile.upsert({
      where: { userId: owner.id },
      update: { specialization: 'General Physician', designation: 'Chief Medical Officer' },
      create: { userId: owner.id, specialization: 'General Physician', designation: 'Chief Medical Officer' },
    });
    console.log('Updated owner staffProfile:', owner.firstName, owner.lastName);
  }

  // Create demo doctors
  const bcrypt = await import('bcryptjs');
  const demoPassword = await bcrypt.default.hash('Demo@1234', 10);

  const doctors = [
    { firstName: 'Arun', lastName: 'Mehta', email: 'arun.mehta@clinic1demo.com', specialization: 'General Physician', designation: 'Senior Doctor' },
    { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@clinic1demo.com', specialization: 'Pediatrics', designation: 'Pediatrician' },
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar@clinic1demo.com', specialization: 'Orthopedics', designation: 'Orthopedic Surgeon' },
  ];

  for (const doc of doctors) {
    let user = await prisma.user.findFirst({ where: { email: doc.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          org: { connect: { id: org.id } },
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          passwordHash: demoPassword,
          status: 'ACTIVE',
        },
      });
      console.log('Created user:', user.firstName, user.lastName, user.id);
    } else {
      console.log('User already exists:', user.firstName, user.lastName, user.id);
    }

    // Ensure DOCTOR userBranch
    const existing = await prisma.userBranch.findFirst({ where: { userId: user.id, branchId: branch.id, role: 'DOCTOR' } });
    if (!existing) {
      await prisma.userBranch.create({ data: { userId: user.id, branchId: branch.id, role: 'DOCTOR' } });
    }

    // Ensure staffProfile
    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: { specialization: doc.specialization, designation: doc.designation },
      create: { userId: user.id, specialization: doc.specialization, designation: doc.designation },
    });

    console.log('Done:', doc.firstName, doc.lastName, '→ DOCTOR in branch', branch.name);
  }

  console.log('\n✅ Demo doctors seeded successfully!');
  await prisma.$disconnect();
  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
