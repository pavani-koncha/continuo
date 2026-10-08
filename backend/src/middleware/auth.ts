import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storageService } from '../services/storageService.js';
import { AuthUser } from '../types.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'continuo_secure_jwt_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token missing or invalid'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const user = storageService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found'
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication session'
    });
  }
}
