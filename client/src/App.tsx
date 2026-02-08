import { Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import {
  Map,
  Cpu,
  Library,
  Zap,
  Cable,
  Radio,
  ClipboardList,
  BookOpen,
  FileText,
  Crosshair,
} from 'lucide-react';
import PanelMapPage from '@/pages/PanelMapPage';
import ComponentLibraryPage from '@/pages/ComponentLibraryPage';
import PinManagerPage from '@/pages/PinManagerPage';
import PowerBudgetPage from '@/pages/PowerBudgetPage';
import MobiFlightPage from '@/pages/MobiFlightPage';
import BomGeneratorPage from '@/pages/BomGeneratorPage';
import WiringDiagramPage from '@/pages/WiringDiagramPage';
import JournalPage from '@/pages/JournalPage';
import ReferencePage from '@/pages/ReferencePage';
import SectionCalibrationPage from '@/pages/SectionCalibrationPage';

const NAV_GROUPS = [
  {
    items: [
      { to: '/', label: 'Panel Map', icon: Map },
    ],
  },
  {
    label: 'Build',
    items: [
      { to: '/components', label: 'Components', icon: Library },
      { to: '/pins', label: 'Pin Manager', icon: Cpu },
      { to: '/calibrate-sections', label: 'Calibrate', icon: Crosshair },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/power', label: 'Power Budget', icon: Zap },
      { to: '/wiring', label: 'Wiring', icon: Cable },
      { to: '/bom', label: 'BOM', icon: ClipboardList },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/mobiflight', label: 'MobiFlight', icon: Radio },
      { to: '/journal', label: 'Journal', icon: BookOpen },
      { to: '/reference', label: 'Reference', icon: FileText },
    ],
  },
];

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      end
    >
      {({ isActive }) => (
        <span
          data-active={isActive}
          className={`nav-link flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
            isActive
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <Icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
          {label}
        </span>
      )}
    </NavLink>
  );
}

export default function App() {
  return (
    <>
      <div className="flex h-screen">
        {/* Sidebar */}
        <nav className="w-56 border-r border-border/50 sidebar-nav flex flex-col">
          {/* Brand */}
          <div className="px-4 py-5 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center">
                <span className="text-primary font-bold text-sm font-mono">PF</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight">PanelForge</h1>
                <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">BAe 146 Build</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi}>
                {group.label && <div className="nav-group-label">{group.label}</div>}
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              v0.1.0
            </p>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 bg-background">
          <Routes>
            <Route path="/" element={<PanelMapPage />} />
            <Route path="/pins" element={<PinManagerPage />} />
            <Route path="/components" element={<ComponentLibraryPage />} />
            <Route path="/power" element={<PowerBudgetPage />} />
            <Route path="/wiring" element={<WiringDiagramPage />} />
            <Route path="/mobiflight" element={<MobiFlightPage />} />
            <Route path="/bom" element={<BomGeneratorPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/reference" element={<ReferencePage />} />
            <Route path="/calibrate-sections" element={<SectionCalibrationPage />} />
          </Routes>
        </main>
      </div>
      <Toaster
        theme="dark"
        toastOptions={{
          className: 'font-sans',
        }}
      />
    </>
  );
}
