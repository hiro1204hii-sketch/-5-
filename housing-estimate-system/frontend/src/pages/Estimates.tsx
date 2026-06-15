import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, yen } from '../api';
import { PageHeader, Empty } from '../components/ui';

export default function Estimates() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.get<any[]>('/estimates').then(setList); }, []);

  return (
    <div>
      <PageHeader title="概算見積一覧" desc="保存済みの概算見積。蓄積されたデータが将来の精度向上に活用される。" action={<Link className="btn-primary" to="/estimates/new">＋ 新規作成</Link>} />
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr><th className="th">名称</th><th className="th">物件</th><th className="th text-right">延床</th><th className="th text-right">概算売価</th><th className="th text-right">概算原価</th><th className="th">作成日</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td"><Link to={`/estimates/${e.id}`} className="font-medium text-brand-600 hover:underline">{e.name}</Link></td>
                <td className="td text-slate-600">{e.property_name}</td>
                <td className="td text-right">{e.total_floor_area}㎡</td>
                <td className="td text-right font-medium">{yen(e.total_sale)}</td>
                <td className="td text-right text-slate-500">{yen(e.total_cost)}</td>
                <td className="td text-xs text-slate-400">{e.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty text="概算見積がありません" />}
      </div>
    </div>
  );
}
