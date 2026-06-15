import { useEffect, useState } from 'react';
import { api, WorkItem, Meta, yen } from '../api';
import { PageHeader, Modal, Field, Empty } from '../components/ui';

export default function WorkItems() {
  const [tree, setTree] = useState<WorkItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [edit, setEdit] = useState<WorkItem | null>(null);
  const [history, setHistory] = useState<any[] | null>(null);

  const load = () => api.get<WorkItem[]>('/work-items/tree').then(setTree);
  useEffect(() => {
    load();
    api.get<Meta>('/meta').then(setMeta);
  }, []);

  const save = async () => {
    if (!edit) return;
    await api.put(`/work-items/${edit.id}`, edit);
    setEdit(null);
    load();
  };

  const showHistory = async (id: number) => {
    const h = await api.get<any[]>(`/work-items/${id}/history`);
    setHistory(h);
  };

  return (
    <div>
      <PageHeader
        title="工事項目マスター"
        desc="大項目 > 小項目の階層。単価を変更すると更新履歴が自動記録され、精度分析の基礎データになる。"
      />

      <div className="space-y-4">
        {tree.map((major) => (
          <div key={major.id} className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
              <span className="badge bg-brand-50 text-brand-700">大項目</span>
              <span className="font-semibold text-slate-800">{major.name}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="th">小項目</th>
                  <th className="th">単位</th>
                  <th className="th text-right">標準単価</th>
                  <th className="th text-right">原価</th>
                  <th className="th">計算方式</th>
                  <th className="th">更新日</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(major.children || []).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{c.name}</td>
                    <td className="td text-slate-500">{c.unit}</td>
                    <td className="td text-right">{yen(c.standard_price)}</td>
                    <td className="td text-right text-slate-500">{yen(c.cost)}</td>
                    <td className="td"><span className="badge bg-slate-100 text-slate-600">{meta?.calcMethods[c.calc_method] || c.calc_method}</span></td>
                    <td className="td text-xs text-slate-400">{c.updated_at?.slice(0, 10)}</td>
                    <td className="td text-right">
                      <button className="text-xs text-brand-600 hover:underline" onClick={() => setEdit(c)}>編集</button>
                      <button className="ml-3 text-xs text-slate-500 hover:underline" onClick={() => showHistory(c.id)}>履歴</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {tree.length === 0 && <Empty text="読み込み中..." />}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`工事項目を編集: ${edit?.name || ''}`}>
        {edit && meta && (
          <div className="space-y-4">
            <Field label="工事項目名"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="単位"><input className="input" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></Field>
              <Field label="計算方式">
                <select className="input" value={edit.calc_method} onChange={(e) => setEdit({ ...edit, calc_method: e.target.value })}>
                  {Object.entries(meta.calcMethods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="標準単価(円)"><input type="number" className="input" value={edit.standard_price} onChange={(e) => setEdit({ ...edit, standard_price: +e.target.value })} /></Field>
              <Field label="原価(円)"><input type="number" className="input" value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: +e.target.value })} /></Field>
            </div>
            <Field label="備考"><input className="input" value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              標準単価・原価を変更すると <b>単価更新履歴</b> に自動記録されます。
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>キャンセル</button>
              <button className="btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={history !== null} onClose={() => setHistory(null)} title="単価更新履歴">
        {history && history.length === 0 && <Empty text="履歴はありません" />}
        {history && history.length > 0 && (
          <table className="w-full">
            <thead><tr className="border-b border-slate-100"><th className="th">変更日</th><th className="th text-right">単価</th><th className="th text-right">原価</th><th className="th">理由</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="td">{h.changed_at?.slice(0, 10)}</td>
                  <td className="td text-right">{yen(h.old_price)} → {yen(h.new_price)}</td>
                  <td className="td text-right text-slate-500">{yen(h.old_cost)} → {yen(h.new_cost)}</td>
                  <td className="td text-slate-500">{h.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
