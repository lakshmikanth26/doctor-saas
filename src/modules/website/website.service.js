import { prisma } from '../../config/db.js';
import { AppError } from '../../utils/errors.js';

export async function getWebsite(orgId) {
  return prisma.clinicWebsite.findUnique({
    where: { orgId },
    include: {
      pages: { orderBy: { createdAt: 'asc' } },
      blogs: { where: { isPublished: true }, orderBy: { publishedAt: 'desc' }, take: 5 },
    },
  });
}

export async function upsertWebsite(orgId, data) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
  const subdomain = data.subdomain || org?.slug;
  if (!subdomain) throw new AppError('Subdomain is required', 400);

  return prisma.clinicWebsite.upsert({
    where: { orgId },
    create: { ...data, orgId, subdomain },
    update: data,
    include: { pages: true },
  });
}

export async function publishWebsite(orgId) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not configured', 404);
  return prisma.clinicWebsite.update({
    where: { orgId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}

export async function listPages(orgId) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not found', 404);
  return prisma.websitePage.findMany({
    where: { websiteId: site.id },
    orderBy: { createdAt: 'asc' },
  });
}

export async function upsertPage(orgId, slug, data) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not found', 404);

  return prisma.websitePage.upsert({
    where: { websiteId_slug: { websiteId: site.id, slug } },
    create: { ...data, slug, websiteId: site.id, title: data.title || slug },
    update: data,
  });
}

export async function deletePage(orgId, slug) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not found', 404);
  const page = await prisma.websitePage.findUnique({ where: { websiteId_slug: { websiteId: site.id, slug } } });
  if (!page) throw new AppError('Page not found', 404);
  return prisma.websitePage.delete({ where: { id: page.id } });
}

export async function listBlogs(orgId, { published, page = 1, limit = 10 }) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not found', 404);

  const where = {
    websiteId: site.id,
    ...(published !== undefined && { isPublished: published === 'true' }),
  };
  const [blogs, total] = await Promise.all([
    prisma.websiteBlog.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.websiteBlog.count({ where }),
  ]);
  return { blogs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function upsertBlog(orgId, slug, data) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not found', 404);

  const isPublished = data.isPublished ?? data.published;
  const blogData = {
    ...data,
    isPublished,
    ...(isPublished && !data.publishedAt && { publishedAt: new Date() }),
  };

  return prisma.websiteBlog.upsert({
    where: { websiteId_slug: { websiteId: site.id, slug } },
    create: { ...blogData, slug, websiteId: site.id, title: data.title || slug },
    update: blogData,
  });
}

export async function deleteBlog(orgId, slug) {
  const site = await prisma.clinicWebsite.findUnique({ where: { orgId } });
  if (!site) throw new AppError('Website not found', 404);
  const blog = await prisma.websiteBlog.findUnique({ where: { websiteId_slug: { websiteId: site.id, slug } } });
  if (!blog) throw new AppError('Blog not found', 404);
  return prisma.websiteBlog.delete({ where: { id: blog.id } });
}

export async function getPublicSite(orgSlug) {
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new AppError('Not found', 404);

  const site = await prisma.clinicWebsite.findUnique({
    where: { orgId: org.id },
    include: {
      pages: { where: { isPublished: true }, orderBy: { createdAt: 'asc' } },
      blogs: { where: { isPublished: true }, orderBy: { publishedAt: 'desc' } },
    },
  });
  if (!site || site.status !== 'PUBLISHED') throw new AppError('Not found', 404);
  return site;
}
