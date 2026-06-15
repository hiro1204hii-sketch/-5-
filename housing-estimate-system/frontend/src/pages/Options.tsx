import { useEffect, useState } from 'react';
import { api, Option, Meta, yen } from '../api';
import { PageHeader, Modal, Field, Empty } from '../components/ui';

const blank: Partial<Option> = { category: '', name: '', cost: 0, sale_price: 0, note: '' };

export default function Options() {
  const [list, setList] = useState<Option[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [form, setForm] = useState<Partial<Option> | null>(null);

  const load = () => api.get<Option[]>('/options').then(setList);
  useEffect(() => { load(); api.get<Meta>('/meta').then(setMeta); }, []);
  const cats = meta?.equipmentCategories || [];

  const save = async () => {
    if (!form) return;
    if (!form.category || !form.name) return alert('カテゴリとオプション名は必須です');
    if (form.id) await api.put(`/options/${form.id}`, form); else await api.post('/options', form);
    setForm(null); load();
  };
  const remove = async (id: number) => { if (confirm('削除しますか？')) { await api.del(`/options/${id}`); load(); } };
  const set = (k: keyof Option, v: any) => setForm((f) => ({ ...f!, [k]: v }));

  const grouped = list.reduce<Record<string, Option[]>>((acc, o) => { (acc[o.category] ||= []).push(o); return acc; }, {});

  return (
    <div>
      <PageHeader title="オプションマスター" desc="住設カテゴリごとの追加オプション。概算時に選択すると差額に加算される。" action={<button className="btn-primary" onClick={() => setForm({ ...blank, category: cats[0] })}>＋ オプションを登録</button>} />

      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, opts]) => (
          <div key={cat} className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700">{cat}</div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-50"><th className="th">オプション名</th><th className="th text-right">売価</th><th className="th text-right">原価</th><th className="th text-right">粗利</th><th className="th"></th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {opts.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{o.name}</td>
                    <td className="td text-right">{yen(o.sale_price)}</td>
                    <td className="td text-right text-slate-500">{yen(o.cost)}</td>
                    <td className="td text-right text-emerald-600">{yen(o.sale_price - o.cost)}</td>
                    <td className="td text-right">
                      <button className="text-xs text-brand-600 hover:underline" onClick={() => setForm(o)}>編集</button>
                      <button className="ml-3 text-xs text-red-500 hover:underline" onClick={() => remove(o.id)}>削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {list.length === 0 && <Empty text="オプションがありません" />}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'オプションを編集' : 'オプションを登録'}>
        {form && (
          <div className="space-y-4">
            <Field label="カテゴリ *">
              <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">選択</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="オプション名 *"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="売価"><input type="number" className="input" value={form.sale_price} onChange={(e) => set('sale_price', +e.target.value)} /></Field>
              <Field label="原価"><input type="number" className="input" value={form.cost} onChange={(e) => set('cost', +e.target.value)} /></Field>
            </div>
            <Field label="備考"><input className="input" value={form.note || ''} onChange={(e) => set('note', e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setForm(null)}>キャンセル</button><button className="btn-primary" onClick={save}>保存</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
