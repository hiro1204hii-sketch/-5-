import { useEffect, useState } from 'react';
import { api, Property } from '../api';
import { PageHeader, Modal, Field, Empty } from '../components/ui';

const empty: Partial<Property> = {
  name: '', total_floor_area: 100, building_area: 55, site_area: 165, floors: 2, rooms: 4,
  is_two_household: 0, is_sw: 0, insulation_grade: 4, seismic_grade: 2, is_long_life: 0, is_gx: 0, note: '',
};

export default function Properties() {
  const [list, setList] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Property>>(empty);

  const load = () => api.get<Property[]>('/properties').then(setList);
  useEffect(() => { load(); }, []);

  const edit = (p: Property) => { setForm(p); setOpen(true); };
  const create = () => { setForm(empty); setOpen(true); };

  const save = async () => {
    if (!form.name) return alert('物件名を入力してください');
    if (form.id) await api.put(`/properties/${form.id}`, form);
    else await api.post('/properties', form);
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('削除しますか？')) return;
    await api.del(`/properties/${id}`);
    load();
  };

  const set = (k: keyof Property, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const flag = (k: keyof Property, label: string) => (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
      <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked ? 1 : 0)} />
      {label}
    </label>
  );

  return (
    <div>
      <PageHeader
        title="物件管理"
        desc="概算の前提となる物件情報。面積・階数・各種フラグが計算方式・補正係数に反映される。"
        action={<button className="btn-primary" onClick={create}>＋ 物件を登録</button>}
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="th">物件名</th>
              <th className="th">延床</th>
              <th className="th">建築</th>
              <th className="th">階数</th>
              <th className="th">部屋数</th>
              <th className="th">仕様</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td font-medium text-slate-800">{p.name}</td>
                <td className="td">{p.total_floor_area}㎡</td>
                <td className="td">{p.building_area}㎡</td>
                <td className="td">{p.floors}階</td>
                <td className="td">{p.rooms}</td>
                <td className="td">
                  <div className="flex gap-1">
                    {p.is_sw ? <span className="badge bg-emerald-50 text-emerald-700">SW</span> : null}
                    {p.is_gx ? <span className="badge bg-amber-50 text-amber-700">GX</span> : null}
                    {p.is_two_household ? <span className="badge bg-violet-50 text-violet-700">二世帯</span> : null}
                    {p.is_long_life ? <span className="badge bg-sky-50 text-sky-700">長期優良</span> : null}
                  </div>
                </td>
                <td className="td text-right">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => edit(p)}>編集</button>
                  <button className="ml-3 text-xs text-red-500 hover:underline" onClick={() => remove(p.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty text="物件がありません。右上から登録してください。" />}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? '物件を編集' : '物件を登録'} wide>
        <div className="space-y-4">
          <Field label="物件名 *">
            <input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="〇〇様邸 新築工事" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="延床面積(㎡)"><input type="number" className="input" value={form.total_floor_area ?? 0} onChange={(e) => set('total_floor_area', +e.target.value)} /></Field>
            <Field label="建築面積(㎡)"><input type="number" className="input" value={form.building_area ?? 0} onChange={(e) => set('building_area', +e.target.value)} /></Field>
            <Field label="敷地面積(㎡)"><input type="number" className="input" value={form.site_area ?? 0} onChange={(e) => set('site_area', +e.target.value)} /></Field>
            <Field label="階数"><input type="number" className="input" value={form.floors ?? 0} onChange={(e) => set('floors', +e.target.value)} /></Field>
            <Field label="部屋数"><input type="number" className="input" value={form.rooms ?? 0} onChange={(e) => set('rooms', +e.target.value)} /></Field>
            <div />
            <Field label="断熱等級"><input type="number" className="input" value={form.insulation_grade ?? 0} onChange={(e) => set('insulation_grade', +e.target.value)} /></Field>
            <Field label="耐震等級"><input type="number" className="input" value={form.seismic_grade ?? 0} onChange={(e) => set('seismic_grade', +e.target.value)} /></Field>
            <div />
          </div>
          <div>
            <label className="label">仕様フラグ</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {flag('is_sw', 'SW工法')}
              {flag('is_gx', 'GX志向型')}
              {flag('is_two_household', '二世帯住宅')}
              {flag('is_long_life', '長期優良住宅')}
            </div>
          </div>
          <Field label="備考"><textarea className="input" rows={2} value={form.note || ''} onChange={(e) => set('note', e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={() => setOpen(false)}>キャンセル</button>
            <button className="btn-primary" onClick={save}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
