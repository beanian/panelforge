import { Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import PanelMapPage from '@/pages/PanelMapPage';
import ComponentLibraryPage from '@/pages/ComponentLibraryPage';
import PinManagerPage from '@/pages/PinManagerPage';
import BuildProgressPage from '@/pages/BuildProgressPage';
import PowerBudgetPage from '@/pages/PowerBudgetPage';
import MobiFlightPage from '@/pages/MobiFlightPage';
import BomGeneratorPage from '@/pages/BomGeneratorPage';
import WiringDiagramPage from '@/pages/WiringDiagramPage';
import JournalPage from '@/pages/JournalPage';
import ReferencePage from '@/pages/ReferencePage';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-2 py-1.5 rounded-md text-sm transition-colors duration-150 ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'hover:bg-accent text-foreground'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <>
      <div className="flex h-screen">
        <nav className="w-64 border-r bg-muted/40 p-4 flex flex-col gap-1">
          <h1 className="text-lg font-bold mb-4 px-2">PanelForge</h1>
          <NavItem to="/">Panel Map</NavItem>
          <NavItem to="/pins">Pin Manager</NavItem>
          <NavItem to="/components">Component Library</NavItem>
          <NavItem to="/power">Power Budget</NavItem>
          <NavItem to="/progress">Build Progress</NavItem>
          <NavItem to="/wiring">Wiring Diagram</NavItem>
          <NavItem to="/mobiflight">MobiFlight</NavItem>
          <NavItem to="/bom">BOM Generator</NavItem>
          <NavItem to="/journal">Journal</NavItem>
          <NavItem to="/reference">Reference</NavItem>
        </nav>
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<PanelMapPage />} />
            <Route path="/pins" element={<PinManagerPage />} />
            <Route path="/components" element={<ComponentLibraryPage />} />
            <Route path="/power" element={<PowerBudgetPage />} />
            <Route path="/progress" element={<BuildProgressPage />} />
            <Route path="/wiring" element={<WiringDiagramPage />} />
            <Route path="/mobiflight" element={<MobiFlightPage />} />
            <Route path="/bom" element={<BomGeneratorPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/reference" element={<ReferencePage />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </>
  );
}
