import express from 'express';
import cors from 'cors';
import { seedIfEmpty } from './lib/seed';
import { CALC_METHODS } from './lib/calc';
import { db } from './lib/db';

import { dashboardRouter } from './routes/dashboard';
import { propertiesRouter } from './routes/properties';
import { workItemsRouter } from './routes/workItems';
import { equipmentRouter } from './routes/equipment';
import { optionsRouter } from './routes/options';
import { standardSpecsRouter } from './routes/standardSpecs';
import { estimatesRouter } from './routes/estimates';
import { pastEstimatesRouter } from './routes/pastEstimates';
import { analyticsRouter } from './routes/analytics';

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 計算方式・住設カテゴリ等のメタ情報
app.get('/api/meta', (_req, res) => {
  const categories = (db.prepare('SELECT DISTINCT category FROM equipment ORDER BY category').all() as any[]).map(
    (r) => r.category
  );
  res.json({
    calcMethods: CALC_METHODS,
    equipmentCategories: categories,
    grades: [
      { key: 'standard', label: '標準' },
      { key: 'high', label: '上位' },
      { key: 'premium', label: '最上位' },
    ],
  });
});

app.use('/api/dashboard', dashboardRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/work-items', workItemsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/options', optionsRouter);
app.use('/api/standard-specs', standardSpecsRouter);
app.use('/api/estimates', estimatesRouter);
app.use('/api/past-estimates', pastEstimatesRouter);
app.use('/api/analytics', analyticsRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`[backend] 住宅概算・原価管理システム API  http://localhost:${PORT}`);
});
