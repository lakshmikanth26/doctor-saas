import { z } from 'zod';
import * as authService from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
  clinicType: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    return sendSuccess(res, result, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    return sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token required', 400);
    const tokens = await authService.refreshTokens(refreshToken);
    return sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    return sendSuccess(res, {}, 'Logged out');
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res) => {
  return sendSuccess(res, { user: req.user, org: req.org });
};
