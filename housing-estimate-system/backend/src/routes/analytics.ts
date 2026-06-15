import { Router } from 'express';
import { db } from '../lib/db';

export const analyticsRouter = Router();

function stats(values: number[]) {
  if (values.length === 0) return { avg: 0, median: 0, max: 0, min: 0, count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    avg: Math.round(sum / sorted.length),
    median: Math.round(median),
    max: sorted[sorted.length - 1],
    min: sorted[0],
    count: sorted.length,
  };
}

/**
 * 工事項目別の単価分析。
 * 過去見積(past_estimates) の work_item 単位で
 * 平均/中央値/最大/最小/最新単価/上昇率 を算出する。
 * 上昇率 = (最新単価 - 最古単価) / 最古単価 × 100
 */
analyticsRouter.get('/work-items', (_req, res) => {
  const rows = db
    .prepare('SELECT work_item, unit_price, created_date FROM past_estimates WHERE unit_price > 0')
    .all() as any[];

  const byItem: Record<string, { price: number; date: string }[]> = {};
  for (const r of rows) {
    (byItem[r.work_item] ||= []).push({ price: r.unit_price, date: r.created_date || '' });
  }

  const result = Object.entries(byItem).map(([work_item, list]) => {
    const prices = list.map((l) => l.price);
    const sortedByDate = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const oldest = sortedByDate[0];
    const latest = sortedByDate[sortedByDate.length - 1];
    const rate = oldest.price > 0 ? ((latest.price - oldest.price) / oldest.price) * 100 : 0;
    return {
      work_item,
      ...stats(prices),
      latest: latest.price,
      latest_date: latest.date,
      oldest: oldest.price,
      oldest_date: oldest.date,
      rise_rate: Math.round(rate * 10) / 10,
    };
  });

  result.sort((a, b) => b.count - a.count);
  res.json(result);
});

// 特定工事項目の単価推移（折れ線データ）
analyticsRouter.get('/work-items/trend', (req, res) => {
  const item = req.query.work_item as string;
  const rows = db
    .prepare('SELECT created_date, unit_price, property_name FROM past_estimates WHERE work_item=? ORDER BY created_date')
    .all(item);
  res.json(rows);
});
