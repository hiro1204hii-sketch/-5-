import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Property, Equipment, Option, Meta, yen, yenSigned, num } from '../api';
import { PageHeader, Empty } from '../components/ui';

interface SpecDetail { id: number; name: string; items: { category: string; equipment_id: number | null }[]; }

export default function EstimateCreate() {
  const nav = useNavigate();
  const [props, setProps] = useState<Property[]>([]);
  const [specs, setSpecs] = useState<{ id: number; name: string }[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [specSetId, setSpecSetId] = useState<number | null>(null);
  const [grade, setGrade] = useState('standard');
  const [eqSel, setEqSel] = useState<Record<string, number>>({});
  const [optSel, setOptSel] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    api.get<Property[]>('/properties').then((p) => { setProps(p); if (p[0]) setPropertyId(p[0].id); });
    api.get<{ id: number; name: string }[]>('/standard-specs').then(setSpecs);
    api.get<Equipment[]>('/equipment').then(setEquipment);
    api.get<Option[]>('/options').then(setOptions);
    api.get<Meta>('/meta').then(setMeta);
  }, []);

  // 標準仕様セット選択時：カテゴリ別の標準住設を自動セット
  useEffect(() => {
    if (!specSetId) return;
    api.get<SpecDetail>(`/standard-specs/${specSetId}`).then((d) => {
      const map: Record<string, number> = {};
      for (const it of d.items) if (it.equipment_id) map[it.category] = it.equipment_id;
      setEqSel(map);
    });
  }, [specSetId]);

  // 入力変化のたびに概算を再計算（保存しない）
  useEffect(() => {
    if (!propertyId) { setResult(null); return; }
    api.post('/estimates/calculate', { property_id: propertyId, spec_set_id: specSetId, equipment: eqSel, options: optSel, grade })
      .then(setResult).catch(() => setResult(null));
  }, [propertyId, specSetId, eqSel, optSel, grade]);

  const categories = Object.keys(eqSel).length ? Object.keys(eqSel) : (result?.equipmentLines || []).map((e: any) => e.category);
  const eqByCat = (c: string) => equipment.filter((e) => e.category === c);
  const optByCat = (c: string) => options.filter((o) => o.category === c);
  const toggleOpt = (id: number) => setOptSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const save = async () => {
    if (!propertyId) return;
    const r = await api.post<{ id: number }>('/estimates', { property_id: propertyId, spec_set_id: specSetId, equipment: eqSel, options: optSel, grade, name });
    nav(`/estimates/${r.id}`);
  };

  const t = result?.totals;

  return (
    <div>
      <PageHeader title="概算見積作成" desc="物件と標準仕様を選び、住設・オプションを調整。工事項目は計算方式に従い自動算出され、標準仕様との差額が即時表示される。" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 入力 */}
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">① 物件・標準仕様</h2>
            <div className="space-y-3">
              <div>
                <label className="label">物件</label>
                <select className="input" value={propertyId ?? ''} onChange={(e) => setPropertyId(+e.target.value)}>
                  {props.map((p) => <option key={p.id} value={p.id}>{p.name}（延床{p.total_floor_area}㎡）</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">標準仕様セット</label>
                  <select className="input" value={specSetId ?? ''} onChange={(e) => setSpecSetId(e.target.value ? +e.target.value : null)}>
                    <option value="">（適用しない）</option>
                    {specs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">グレード</label>
                  <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
                    {meta?.grades.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">② 住設の選択</h2>
              <div className="space-y-3">
                {categories.map((c: string) => (
                  <div key={c}>
                    <label className="label">{c}</label>
                    <select className="input" value={eqSel[c] ?? ''} onChange={(e) => setEqSel((s) => ({ ...s, [c]: +e.target.value }))}>
                      <option value="">（未選択）</option>
                      {eqByCat(c).map((e) => <option key={e.id} value={e.id}>{e.maker} {e.product_name} — {yen(e.sale_price + e.install_cost)}{e.is_standard ? '（標準）' : ''}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">③ オプション</h2>
            <div className="space-y-3">
              {meta?.equipmentCategories.filter((c) => optByCat(c).length).map((c) => (
                <div key={c}>
                  <div className="mb-1 text-xs font-medium text-slate-500">{c}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {optByCat(c).map((o) => (
                      <button key={o.id} onClick={() => toggleOpt(o.id)} className={`badge border ${optSel.includes(o.id) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {o.name} {yenSigned(o.sale_price)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 結果 */}
        <div className="space-y-5 lg:col-span-3">
          {!result ? (
            <div className="card"><Empty text="物件を選択すると概算が表示されます" /></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-4"><div className="text-xs text-slate-500">概算売価</div><div className="mt-1 text-2xl font-bold text-brand-600">{yen(t.total_sale)}</div></div>
                <div className="card p-4"><div className="text-xs text-slate-500">概算原価</div><div className="mt-1 text-2xl font-bold text-slate-700">{yen(t.total_cost)}</div></div>
                <div className="card p-4"><div className="text-xs text-slate-500">粗利 ({t.gross_margin}%)</div><div className="mt-1 text-2xl font-bold text-emerald-600">{yen(t.gross_profit)}</div></div>
              </div>

              {/* 標準仕様との差額 */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">標準仕様との差額</div>
                <table className="w-full">
                  <thead><tr className="border-b border-slate-50"><th className="th">カテゴリ</th><th className="th">標準 → 選択</th><th className="th text-right">標準</th><th className="th text-right">オプション</th><th className="th text-right">差額</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.equipmentLines.map((e: any) => (
                      <tr key={e.category}>
                        <td className="td"><span className="badge bg-slate-100 text-slate-600">{e.category}</span></td>
                        <td className="td text-xs">{e.standard_equipment_name} <span className="text-slate-300">→</span> <b>{e.equipment_name}</b></td>
                        <td className="td text-right text-slate-500">{yen(e.standard_price)}</td>
                        <td className="td text-right text-slate-500">{e.option_total ? yenSigned(e.option_total) : '—'}</td>
                        <td className={`td text-right font-semibold ${e.diff > 0 ? 'text-red-500' : e.diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{e.diff === 0 ? '±0' : yenSigned(e.diff)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t border-slate-100 bg-slate-50"><td className="td font-semibold" colSpan={4}>差額合計</td><td className={`td text-right font-bold ${t.diff_total >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>{yenSigned(t.diff_total)}</td></tr></tfoot>
                </table>
              </div>

              {/* 工事項目内訳 */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">工事項目 内訳（自動計算）</div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-50"><th className="th">工事項目</th><th className="th text-right">数量</th><th className="th text-right">単価</th><th className="th text-right">金額</th><th className="th">計算式</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {result.workLines.map((w: any) => (
                        <tr key={w.work_item_id} className="hover:bg-slate-50">
                          <td className="td"><span className="text-xs text-slate-400">{w.category}</span><br /><span className="font-medium text-slate-700">{w.work_item_name}</span></td>
                          <td className="td text-right">{num(w.quantity)}<span className="text-xs text-slate-400">{w.unit}</span></td>
                          <td className="td text-right text-slate-500">{yen(w.unit_price)}</td>
                          <td className="td text-right font-medium">{yen(w.amount)}</td>
                          <td className="td text-xs text-slate-400">{w.calc_formula}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card flex items-center gap-3 p-4">
                <input className="input flex-1" placeholder="概算見積の名称（任意）" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn-primary" onClick={save}>この概算を保存</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
