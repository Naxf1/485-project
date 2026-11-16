import { Router } from 'express';
import { signToken } from '../../lib/token';
import type { AppContext } from '../context';

export function authRoutes(ctx: AppContext): Router {
  const router = Router();

  router.post('/login', async (req, res, next) => {
    try {
      const userId = (req.body as { userId?: unknown } | undefined)?.userId;

      if (typeof userId !== 'string' || userId.trim() === '') {
        res.status(400).json({ error: 'INVALID_BODY', message: 'userId is required.' });
        return;
      }

      const user = await ctx.repos.users.findById(userId.trim());
      if (!user) {
        res.status(401).json({ error: 'UNKNOWN_USER', message: 'Unknown user.' });
        return;
      }

      res.json({ token: signToken(user.id, ctx.secret, ctx.now()), user });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
