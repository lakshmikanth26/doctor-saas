import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantContext } from '../../middleware/tenantContext.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './inventory.service.js';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/low-stock', async (req, res, next) => {
  try { return sendSuccess(res, await service.getLowStockItems(req.org.id)); } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { search, category, lowStock, page, limit } = req.query;
    return sendSuccess(res, await service.listItems(req.org.id, { search, category, lowStock, page: +page || 1, limit: +limit || 25 }));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try { return sendSuccess(res, await service.createItem(req.org.id, req.body), 'Item created', 201); } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try { return sendSuccess(res, await service.updateItem(req.org.id, req.params.id, req.body)); } catch (e) { next(e); }
});

router.post('/:id/adjust', async (req, res, next) => {
  try { return sendSuccess(res, await service.adjustStock(req.org.id, req.params.id, req.body), 'Stock adjusted', 201); } catch (e) { next(e); }
});

router.get('/:id/transactions', async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    return sendSuccess(res, await service.getTransactions(req.org.id, req.params.id, { page: +page || 1, limit: +limit || 50 }));
  } catch (e) { next(e); }
});

export default router;
