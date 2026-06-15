import { useEffect, useState } from 'react';
import { api, Equipment as Eq, Meta, yen } from '../api';
import { PageHeader, Modal, Field, Empty } from '../components/ui';

const blank: Partial<Eq> = { category: '', maker: '', product_name: '', grade: 'standard', is_standard: 0, list_price: 0, cost: 0, sale_price: 0, install_cost: 0, note: '' };

export default function Equipment() {
  const [list, setList] = useState<Eq[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cat, setCat] = useState<string>('');
  const [form, setForm] = useState<Partial<Eq> | null>(null);

  const load = () => api.get<Eq[]>('/equipment').then(setList);
  useEffect(() => { load(); api.get<Meta>('/meta').then(setMeta); }, []);

  const cats = meta?.equipmentCategories || [];
  const shown = cat ? list.filter((e) => e.category === cat) : list;

  const save = async () => {
    if (!form) return;
    if (!form.category || !form.product_name) return alert('カテゴリと商品名は必須です');
    if (form.id) await api.put(`/equipment/${form.id}`, form);
    else await api.post('/equipment', form);
    setForm(null); load();
  };
  const remove = async (id: number) => { if (confirm('削除しますか？')) { await api.del(`/equipment/${id}`); load(); } };

  const set = (k: keyof Eq, v: any) => setForm((f) => ({ ...f!, [k]: v }));

  return (
    <div>
      <PageHeader title="住設マスター" desc="カテゴリ別の住宅設備。標準仕様と差額計算の基準になる。" action={<button className="btn-primary" onClick={() => setForm({ ...blank, category: cat || cats[0] })}>＋ 住設を登録</button>} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button onClick={() => setCat('')} className={`badge ${cat === '' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>すべて</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`badge ${cat === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{c}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr><th className="th">カテゴリ</th><th className="th">メーカー / 商品</th><th className="th">グレード</th><th className="th text-right">定価</th><th className="th text-right">売価</th><th className="th text-right">原価</th><th className="th text-right">施工費</th><th className="th"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shown.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td"><span className="badge bg-slate-100 text-slate-600">{e.category}</span></td>
                <td className="td">
                  <span className="font-medium text-slate-800">{e.product_name}</span>
                  <span className="ml-1 text-xs text-slate-400">{e.maker}</span>
                  {e.is_standard ? <span className="badge ml-2 bg-emerald-50 text-emerald-700">標準</span> : null}
                </td>
                <td className="td text-slate-500">{e.grade}</td>
                <td className="td text-right text-slate-500">{yen(e.list_price)}</td>
                <td className="td text-right font-medium">{yen(e.sale_price)}</td>
                <td className="td text-right text-slate-500">{yen(e.cost)}</td>
                <td className="td text-right text-slate-500">{yen(e.install_cost)}</td>
                <td className="td text-right">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => setForm(e)}>編集</button>
                  <button className="ml-3 text-xs text-red-500 hover:underline" onClick={() => remove(e.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <Empty text="住設がありません" />}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? '住設を編集' : '住設を登録'}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="カテゴリ *">
                <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">選択</option>
                  {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="メーカー"><input className="input" value={form.maker} onChange={(e) => set('maker', e.target.value)} /></Field>
            </div>
            <Field label="商品名 *"><input className="input" value={form.product_name} onChange={(e) => set('product_name', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="グレード">
                <select className="input" value={form.grade} onChange={(e) => set('grade', e.target.value)}>
                  <option value="standard">標準</option><option value="high">上位</option><option value="premium">最上位</option>
                </select>
              </Field>
              <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_standard} onChange={(e) => set('is_standard', e.target.checked ? 1 : 0)} />標準仕様にする</label>
              <Field label="定価"><input type="number" className="input" value={form.list_price} onChange={(e) => set('list_price', +e.target.value)} /></Field>
              <Field label="売価"><input type="number" className="input" value={form.sale_price} onChange={(e) => set('sale_price', +e.target.value)} /></Field>
              <Field label="原価"><input type="number" className="input" value={form.cost} onChange={(e) => set('cost', +e.target.value)} /></Field>
              <Field label="施工費"><input type="number" className="input" value={form.install_cost} onChange={(e) => set('install_cost', +e.target.value)} /></Field>
            </div>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setForm(null)}>キャンセル</button><button className="btn-primary" onClick={save}>保存</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
