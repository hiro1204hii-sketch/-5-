import { Router } from 'express';
import { db } from '../lib/db';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req, res) => {
  const recentProperties = db
    .prepare('SELECT id,name,total_floor_area,is_sw,is_gx,created_at FROM properties ORDER BY created_at DESC LIMIT 5')
    .all();

  const priceHistory = db
    .prepare(
      `SELECT ph.*, wi.name AS work_item_name
       FROM price_history ph LEFT JOIN work_items wi ON wi.id = ph.work_item_id
       ORDER BY ph.changed_at DESC LIMIT 8`
    )
    .all();

  const estimateCount = (db.prepare('SELECT COUNT(*) AS c FROM estimates').get() as any).c;
  const propertyCount = (db.prepare('SELECT COUNT(*) AS c FROM properties').get() as any).c;
  const pastEstimateCount = (db.prepare('SELECT COUNT(*) AS c FROM past_estimates').get() as any).c;
  const pastPropertyCount = (
    db.prepare('SELECT COUNT(DISTINCT property_name) AS c FROM past_estimates').get() as any
  ).c;

  // 工事項目別 単価推移（直近の改定があった項目トップ6）
  const trendItems = db
    .prepare(
      `SELECT wi.id, wi.name, wi.unit, wi.standard_price,
              (SELECT new_price FROM price_history p WHERE p.work_item_id=wi.id ORDER BY changed_at DESC LIMIT 1) AS latest_change,
              (SELECT old_price FROM price_history p WHERE p.work_item_id=wi.id ORDER BY changed_at ASC LIMIT 1) AS first_price
       FROM work_items wi
       WHERE wi.level=3 AND EXISTS (SELECT 1 FROM price_history p WHERE p.work_item_id=wi.id)
       ORDER BY wi.sort_order LIMIT 6`
    )
    .all()
    .map((r: any) => ({
      ...r,
      rise_rate:
        r.first_price > 0 ? Math.round(((r.standard_price - r.first_price) / r.first_price) * 1000) / 10 : 0,
    }));

  res.json({
    recentProperties,
    priceHistory,
    counts: {
      estimates: estimateCount,
      properties: propertyCount,
      pastEstimates: pastEstimateCount,
      pastProperties: pastPropertyCount,
    },
    trendItems,
  });
});
