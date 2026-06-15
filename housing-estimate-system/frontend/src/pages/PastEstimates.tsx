import { useEffect, useRef, useState } from 'react';
import { api, yen, num } from '../api';
import { PageHeader, Modal, Empty } from '../components/ui';

const HEADER_MAP: Record<string, string> = {
  物件名: 'property_name', property_name: 'property_name',
  延床面積: 'total_floor_area', total_floor_area: 'total_floor_area',
  工事項目: 'work_item', work_item: 'work_item',
  明細: 'detail', detail: 'detail',
  数量: 'quantity', quantity: 'quantity',
  単価: 'unit_price', unit_price: 'unit_price',
  金額: 'amount', amount: 'amount',
  作成日: 'created_date', created_date: 'created_date',
};

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => HEADER_MAP[h.trim()] || h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: any = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

const TEMPLATE = '物件名,延床面積,工事項目,明細,数量,単価,金額,作成日\nサンプル邸,105,基礎工事,ベタ基礎,56,28000,1568000,2025-06-01';

export default function PastEstimates() {
  const [list, setList] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get<any[]>('/past-estimates').then(setList);
  useEffect(() => { load(); }, []);

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(parseCSV(String(reader.result)));
    reader.readAsText(f, 'utf-8');
  };

  const doImport = async () => {
    if (!preview) return;
    const res = await api.post<{ imported: number }>('/past-estimates/import', { rows: preview });
    alert(`${res.imported} 件を取り込みました`);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'past_estimates_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="過去見積データベース" desc="過去の見積を蓄積。CSV取込で一括登録し、単価分析の元データになる。" action={
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={downloadTemplate}>CSVテンプレート</button>
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>CSV取込</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      } />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr><th className="th">物件名</th><th className="th text-right">延床</th><th className="th">工事項目</th><th className="th">明細</th><th className="th text-right">数量</th><th className="th text-right">単価</th><th className="th text-right">金額</th><th className="th">作成日</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td text-slate-600">{r.property_name}</td>
                <td className="td text-right">{r.total_floor_area}㎡</td>
                <td className="td"><span className="badge bg-slate-100 text-slate-600">{r.work_item}</span></td>
                <td className="td font-medium text-slate-700">{r.detail}</td>
                <td className="td text-right">{num(r.quantity)}</td>
                <td className="td text-right">{yen(r.unit_price)}</td>
                <td className="td text-right font-medium">{yen(r.amount)}</td>
                <td className="td text-xs text-slate-400">{r.created_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty text="過去見積がありません。CSVを取り込んでください。" />}
      </div>

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={`CSVプレビュー（${preview?.length || 0} 件）`} wide>
        {preview && (
          <div>
            <div className="max-h-80 overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50"><tr><th className="th">物件名</th><th className="th">工事項目</th><th className="th">明細</th><th className="th text-right">数量</th><th className="th text-right">単価</th><th className="th">作成日</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.slice(0, 50).map((r, i) => (
                    <tr key={i}><td className="td">{r.property_name}</td><td className="td">{r.work_item}</td><td className="td">{r.detail}</td><td className="td text-right">{r.quantity}</td><td className="td text-right">{r.unit_price}</td><td className="td">{r.created_date}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPreview(null)}>キャンセル</button>
              <button className="btn-primary" onClick={doImport}>{preview.length} 件を取り込む</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
