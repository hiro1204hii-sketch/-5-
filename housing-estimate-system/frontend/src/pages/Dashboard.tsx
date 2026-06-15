import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, yen, yenSigned } from '../api';
import { PageHeader, StatCard, Empty } from '../components/ui';

interface DashData {
  recentProperties: any[];
  priceHistory: any[];
  counts: { estimates: number; properties: number; pastEstimates: number; pastProperties: number };
  trendItems: any[];
}

export default function Dashboard() {
  const [d, setD] = useState<DashData | null>(null);
  useEffect(() => {
    api.get<DashData>('/dashboard').then(setD).catch(console.error);
  }, []);

  if (!d) return <Empty text="読み込み中..." />;

  return (
    <div>
      <PageHeader title="ダッシュボード" desc="概算精度向上の起点となる最新の状況" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="概算作成件数" value={d.counts.estimates} sub="保存済みの概算見積" accent="text-brand-600" />
        <StatCard label="登録物件数" value={d.counts.properties} />
        <StatCard label="過去見積 明細件数" value={d.counts.pastEstimates} sub={`${d.counts.pastProperties} 物件分`} />
        <StatCard label="単価改定 履歴" value={d.priceHistory.length} sub="直近の改定数" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 最近作成した物件 */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">最近作成した物件</h2>
            <Link to="/properties" className="text-xs text-brand-600 hover:underline">一覧へ</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {d.recentProperties.length === 0 && <Empty text="物件がありません" />}
            {d.recentProperties.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">延床 {p.total_floor_area}㎡</div>
                </div>
                <div className="flex gap-1.5">
                  {p.is_sw ? <span className="badge bg-emerald-50 text-emerald-700">SW</span> : null}
                  {p.is_gx ? <span className="badge bg-amber-50 text-amber-700">GX</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 単価更新履歴 */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">単価更新履歴</h2>
            <Link to="/work-items" className="text-xs text-brand-600 hover:underline">工事項目へ</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {d.priceHistory.length === 0 && <Empty text="履歴がありません" />}
            {d.priceHistory.map((h) => {
              const diff = h.new_price - h.old_price;
              return (
                <div key={h.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{h.work_item_name}</div>
                    <div className="text-xs text-slate-400">{h.reason} ・ {h.changed_at?.slice(0, 10)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-700">{yen(h.old_price)} → {yen(h.new_price)}</div>
                    <div className={`text-xs font-medium ${diff >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{yenSigned(diff)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 工事項目別 単価推移 */}
      <div className="card mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">工事項目別 単価推移</h2>
          <Link to="/analytics" className="text-xs text-brand-600 hover:underline">分析へ</Link>
        </div>
        {d.trendItems.length === 0 ? (
          <Empty text="推移データがありません" />
        ) : (
          <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {d.trendItems.map((t) => (
              <div key={t.id} className="bg-white px-5 py-4">
                <div className="text-sm font-medium text-slate-700">{t.name}</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-lg font-bold text-slate-800">{yen(t.standard_price)}<span className="text-xs font-normal text-slate-400">/{t.unit}</span></div>
                  <span className={`badge ${t.rise_rate >= 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {t.rise_rate >= 0 ? '▲' : '▼'} {Math.abs(t.rise_rate)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
