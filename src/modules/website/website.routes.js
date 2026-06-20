import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './website.service.js';

const router = Router();

// Public routes (no auth) — for clinic public websites
router.get('/public/:orgSlug', async (req, res, next) => {
  try { return sendSuccess(res, await service.getPublicSite(req.params.orgSlug)); } catch (e) { next(e); }
});

// Protected routes
router.use(authenticate, tenantContext);

router.get('/', async (req, res, next) => {
  try { return sendSuccess(res, await service.getWebsite(req.org.id)); } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try { return sendSuccess(res, await service.upsertWebsite(req.org.id, req.body)); } catch (e) { next(e); }
});

router.post('/publish', async (req, res, next) => {
  try { return sendSuccess(res, await service.publishWebsite(req.org.id), 'Website published'); } catch (e) { next(e); }
});

// Pages
router.get('/pages', async (req, res, next) => {
  try { return sendSuccess(res, await service.listPages(req.org.id)); } catch (e) { next(e); }
});

router.put('/pages/:slug', async (req, res, next) => {
  try { return sendSuccess(res, await service.upsertPage(req.org.id, req.params.slug, req.body)); } catch (e) { next(e); }
});

router.delete('/pages/:slug', async (req, res, next) => {
  try { await service.deletePage(req.org.id, req.params.slug); return sendSuccess(res, null, 'Page deleted'); } catch (e) { next(e); }
});

// Blogs
router.get('/blogs', async (req, res, next) => {
  try {
    const { published, page, limit } = req.query;
    return sendSuccess(res, await service.listBlogs(req.org.id, { published, page: +page || 1, limit: +limit || 10 }));
  } catch (e) { next(e); }
});

router.put('/blogs/:slug', async (req, res, next) => {
  try { return sendSuccess(res, await service.upsertBlog(req.org.id, req.params.slug, req.body)); } catch (e) { next(e); }
});

router.delete('/blogs/:slug', async (req, res, next) => {
  try { await service.deleteBlog(req.org.id, req.params.slug); return sendSuccess(res, null, 'Blog deleted'); } catch (e) { next(e); }
});

export default router;
