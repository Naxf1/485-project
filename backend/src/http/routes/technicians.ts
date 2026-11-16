import { Router } from 'express';
import { requireRole } from '../middleware';
import type { AppContext } from '../context';

export function technicianRoutes(ctx: AppContext): Router {
  const router = Router();

  router.get('/', requireRole('supervisor'), async (_req, res, next) => {
    try {
      const technicians = await ctx.repos.technicians.list();
      res.json({ technicians });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
