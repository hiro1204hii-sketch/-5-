import { useEffect, useState } from 'react';
import { api, yen } from '../api';
import { PageHeader, Empty } from '../components/ui';

interface Row {
  work_item: string;
  avg: number; median: number; max: number; min: number; count: number;
  latest: number; latest_date: string; oldest: number; oldest_date: string; rise_rate: number;
}

export default function Analytics() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { api.get<Row[]>('/analytics/work-items').then(setRows); }, []);

  return (
    <div>
      <PageHeader title="単価分析" desc="過去見積DBを工事項目別に集計。平均・中央値・最大・最小・最新単価・上昇率から、概算単価の妥当性を検証する。" />

      {rows.length === 0 ? (
        <div className="card"><Empty text="分析できる過去見積がありません。過去見積DBから取り込んでください。" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="th">工事項目</th>
                <th className="th text-right">件数</th>
                <th className="th text-right">平均単価</th>
                <th className="th text-right">中央値</th>
                <th className="th text-right">最小</th>
                <th className="th text-right">最大</th>
                <th className="th text-right">最新単価</th>
                <th className="th text-right">上昇率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.work_item} className="hover:bg-slate-50">
                  <td className="td font-medium text-slate-800">{r.work_item}</td>
                  <td className="td text-right text-slate-500">{r.count}</td>
                  <td className="td text-right font-medium">{yen(r.avg)}</td>
                  <td className="td text-right">{yen(r.median)}</td>
                  <td className="td text-right text-slate-500">{yen(r.min)}</td>
                  <td className="td text-right text-slate-500">{yen(r.max)}</td>
                  <td className="td text-right">{yen(r.latest)}<div className="text-[10px] text-slate-400">{r.latest_date}</div></td>
                  <td className="td text-right">
                    <span className={`badge ${r.rise_rate > 0 ? 'bg-red-50 text-red-600' : r.rise_rate < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {r.rise_rate > 0 ? '▲' : r.rise_rate < 0 ? '▼' : ''} {Math.abs(r.rise_rate)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        ※ 上昇率 = (最新単価 − 最古単価) ÷ 最古単価 × 100。Phase3以降で実行予算データを加え、概算と実績の乖離分析へ拡張予定。
      </p>
    </div>
  );
}
