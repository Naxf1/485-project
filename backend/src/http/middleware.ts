import type { RequestHandler, Response } from 'express';
import type { Role } from '../lib/constants';
import type { User } from '../domain/types';
import { verifyToken } from '../lib/token';
import type { AppContext } from './context';

export const currentUser = (res: Response): User | null =>
  (res.locals.user as User | undefined) ?? null;

export function authenticate(ctx: AppContext): RequestHandler {
  return (req, res, next) => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    const payload = token ? verifyToken(token, ctx.secret, ctx.now()) : null;

    if (!payload) {
      res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
      return;
    }

    ctx.repos.users
      .findById(payload.sub)
      .then((user) => {
        if (!user) {
          res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
          return;
        }
        res.locals.user = user;
        next();
      })
      .catch(next);
  };
}

export function requireRole(role: Role): RequestHandler {
  return (_req, res, next) => {
    const user = currentUser(res);

    if (!user) {
      res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
      return;
    }

    if (user.role !== role) {
      res.status(403).json({ error: 'FORBIDDEN', message: `Only a ${role} can do this.` });
      return;
    }

    next();
  };
}
