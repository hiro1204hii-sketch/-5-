import { useEffect, useState } from 'react';
import { api, Equipment, yen } from '../api';
import { PageHeader, Modal, Field, Empty } from '../components/ui';

interface SpecSet { id: number; name: string; note: string; }
interface SpecDetail extends SpecSet { items: { id: number; category: string; equipment_id: number | null; product_name?: string; maker?: string; sale_price?: number; install_cost?: number }[]; }

export default function StandardSpecs() {
  const [sets, setSets] = useState<SpecSet[]>([]);
  const [detail, setDetail] = useState<SpecDetail | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [editing, setEditing] = useState<{ name: string; note: string; items: { category: string; equipment_id: number | null }[] } | null>(null);

  const load = () => api.get<SpecSet[]>('/standard-specs').then(setSets);
  useEffect(() => { load(); api.get<Equipment[]>('/equipment').then(setEquipment); }, []);

  const openDetail = async (id: number) => setDetail(await api.get<SpecDetail>(`/standard-specs/${id}`));

  const startEdit = (d: SpecDetail) => {
    setEditing({ name: d.name, note: d.note, items: d.items.map((i) => ({ category: i.category, equipment_id: i.equipment_id })) });
  };

  const saveEdit = async () => {
    if (!editing || !detail) return;
    await api.put(`/standard-specs/${detail.id}`, editing);
    setEditing(null);
    openDetail(detail.id);
    load();
  };

  const eqByCat = (cat: string) => equipment.filter((e) => e.category === cat);

  return (
    <div>
      <PageHeader title="標準仕様管理" desc="住宅タイプごとの標準仕様セット（例: SW標準仕様）。概算作成時に自動選択され、差額計算の基準になる。" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          {sets.map((s) => (
            <button key={s.id} onClick={() => openDetail(s.id)} className={`card w-full p-4 text-left transition hover:border-brand-300 ${detail?.id === s.id ? 'border-brand-400 ring-2 ring-brand-100' : ''}`}>
              <div className="font-semibold text-slate-800">{s.name}</div>
              <div className="mt-0.5 text-xs text-slate-400">{s.note}</div>
            </button>
          ))}
          {sets.length === 0 && <Empty text="仕様セットがありません" />}
        </div>

        <div className="lg:col-span-2">
          {!detail ? (
            <div className="card"><Empty text="左から仕様セットを選択してください" /></div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <h2 className="font-semibold text-slate-800">{detail.name}</h2>
                <button className="btn-ghost text-xs" onClick={() => startEdit(detail)}>標準仕様を編集</button>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-slate-50"><th className="th">カテゴリ</th><th className="th">標準住設</th><th className="th text-right">標準価格(売価+施工)</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {detail.items.map((i) => (
                    <tr key={i.id}>
                      <td className="td"><span className="badge bg-slate-100 text-slate-600">{i.category}</span></td>
                      <td className="td font-medium text-slate-800">{i.product_name ? `${i.maker} ${i.product_name}` : '（未設定）'}</td>
                      <td className="td text-right">{i.product_name ? yen((i.sale_price || 0) + (i.install_cost || 0)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="標準仕様を編集" wide>
        {editing && (
          <div className="space-y-4">
            <Field label="仕様セット名"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <div className="space-y-2">
              <div className="label">カテゴリ別 標準住設</div>
              {editing.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-slate-600">{it.category}</span>
                  <select className="input" value={it.equipment_id ?? ''} onChange={(e) => {
                    const v = e.target.value ? +e.target.value : null;
                    setEditing({ ...editing, items: editing.items.map((x, i) => i === idx ? { ...x, equipment_id: v } : x) });
                  }}>
                    <option value="">（未設定）</option>
                    {eqByCat(it.category).map((e) => <option key={e.id} value={e.id}>{e.maker} {e.product_name}（{yen(e.sale_price)}）</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setEditing(null)}>キャンセル</button><button className="btn-primary" onClick={saveEdit}>保存</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
