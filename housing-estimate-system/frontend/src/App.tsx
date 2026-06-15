import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import WorkItems from './pages/WorkItems';
import Equipment from './pages/Equipment';
import Options from './pages/Options';
import StandardSpecs from './pages/StandardSpecs';
import Estimates from './pages/Estimates';
import EstimateCreate from './pages/EstimateCreate';
import EstimateDetail from './pages/EstimateDetail';
import PastEstimates from './pages/PastEstimates';
import Analytics from './pages/Analytics';

const NAV = [
  { to: '/', label: 'ダッシュボード', icon: '▤', end: true },
  { to: '/properties', label: '物件管理', icon: '🏠' },
  { to: '/estimates/new', label: '概算見積作成', icon: '🧮' },
  { to: '/estimates', label: '概算見積一覧', icon: '📄' },
  { type: 'divider', label: 'マスター' },
  { to: '/work-items', label: '工事項目マスター', icon: '🛠' },
  { to: '/equipment', label: '住設マスター', icon: '🚿' },
  { to: '/options', label: 'オプションマスター', icon: '➕' },
  { to: '/standard-specs', label: '標準仕様管理', icon: '📐' },
  { type: 'divider', label: '蓄積・分析' },
  { to: '/past-estimates', label: '過去見積DB', icon: '🗄' },
  { to: '/analytics', label: '単価分析', icon: '📈' },
] as const;

export default function App() {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">概</div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-800">住宅概算・原価管理</div>
            <div className="text-[10px] text-slate-400">Phase1 MVP</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item, i) =>
            'type' in item ? (
              <div key={i} className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {item.label}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={(item as any).end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
          目的: 概算精度の継続的向上
        </div>
      </aside>

      <main className="ml-60 flex-1">
        <div className="mx-auto max-w-7xl px-8 py-7">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/work-items" element={<WorkItems />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/options" element={<Options />} />
            <Route path="/standard-specs" element={<StandardSpecs />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/estimates/new" element={<EstimateCreate />} />
            <Route path="/estimates/:id" element={<EstimateDetail />} />
            <Route path="/past-estimates" element={<PastEstimates />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
