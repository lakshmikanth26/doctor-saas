import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}`, err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'A record with this value already exists' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
