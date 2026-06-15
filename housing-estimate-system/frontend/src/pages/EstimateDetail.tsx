import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, yen, yenSigned, num } from '../api';
import { PageHeader, Empty } from '../components/ui';

export default function EstimateDetail() {
  const { id } = useParams();
  const [e, setE] = useState<any>(null);
  useEffect(() => { api.get<any>(`/estimates/${id}`).then(setE); }, [id]);
  if (!e) return <Empty text="読み込み中..." />;

  const diffTotal = (e.equipmentLines || []).reduce((s: number, x: any) => s + x.diff, 0);

  return (
    <div>
      <PageHeader title={e.name} desc={`物件: ${e.property_name} ／ 延床 ${e.total_floor_area}㎡`} action={<Link to="/estimates" className="btn-ghost">一覧へ戻る</Link>} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4"><div className="text-xs text-slate-500">概算売価</div><div className="mt-1 text-2xl font-bold text-brand-600">{yen(e.total_sale)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">概算原価</div><div className="mt-1 text-2xl font-bold text-slate-700">{yen(e.total_cost)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">粗利</div><div className="mt-1 text-2xl font-bold text-emerald-600">{yen(e.total_sale - e.total_cost)}</div></div>
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">標準仕様との差額</div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-50"><th className="th">カテゴリ</th><th className="th">選択住設</th><th className="th text-right">標準価格</th><th className="th text-right">選択価格</th><th className="th text-right">オプション</th><th className="th text-right">差額</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {e.equipmentLines.map((x: any) => (
              <tr key={x.id}>
                <td className="td"><span className="badge bg-slate-100 text-slate-600">{x.category}</span></td>
                <td className="td font-medium text-slate-700">{x.equipment_name}</td>
                <td className="td text-right text-slate-500">{yen(x.standard_price)}</td>
                <td className="td text-right">{yen(x.selected_price)}</td>
                <td className="td text-right text-slate-500">{x.option_total ? yenSigned(x.option_total) : '—'}</td>
                <td className={`td text-right font-semibold ${x.diff > 0 ? 'text-red-500' : x.diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{x.diff === 0 ? '±0' : yenSigned(x.diff)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-slate-100 bg-slate-50"><td className="td font-semibold" colSpan={5}>差額合計</td><td className={`td text-right font-bold ${diffTotal >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{yenSigned(diffTotal)}</td></tr></tfoot>
        </table>
      </div>

      {e.optionLines?.length > 0 && (
        <div className="card mb-6 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">選択オプション</div>
          <table className="w-full">
            <thead><tr className="border-b border-slate-50"><th className="th">カテゴリ</th><th className="th">オプション</th><th className="th text-right">売価</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {e.optionLines.map((o: any) => (
                <tr key={o.id}><td className="td text-slate-500">{o.category}</td><td className="td font-medium text-slate-700">{o.option_name}</td><td className="td text-right">{yen(o.sale_price)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">工事項目 内訳</div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-50"><th className="th">工事項目</th><th className="th text-right">数量</th><th className="th">単位</th><th className="th text-right">単価</th><th className="th text-right">金額</th><th className="th">計算式</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {e.workLines.map((w: any) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <td className="td"><span className="text-xs text-slate-400">{w.note}</span><br /><span className="font-medium text-slate-700">{w.work_item_name}</span></td>
                <td className="td text-right">{num(w.quantity)}</td>
                <td className="td text-slate-500">{w.unit}</td>
                <td className="td text-right text-slate-500">{yen(w.unit_price)}</td>
                <td className="td text-right font-medium">{yen(w.amount)}</td>
                <td className="td text-xs text-slate-400">{w.calc_formula}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
