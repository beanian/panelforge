import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-2xl font-semibold text-muted-foreground">{title}</h1>
    </div>
  );
}

export default function App() {
  return (
    <>
      <div className="flex h-screen">
        <nav className="w-64 border-r bg-muted/40 p-4 flex flex-col gap-1">
          <h1 className="text-lg font-bold mb-4 px-2">PanelForge</h1>
          <a href="/" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm">Panel Map</a>
          <a href="/pins" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm">Pin Manager</a>
          <a href="/components" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm">Component Library</a>
          <a href="/power" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">Power Budget</a>
          <a href="/progress" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">Build Progress</a>
          <a href="/wiring" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">Wiring Diagram</a>
          <a href="/mobiflight" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">MobiFlight</a>
          <a href="/bom" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">BOM Generator</a>
          <a href="/journal" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">Journal</a>
          <a href="/reference" className="px-2 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground">Reference</a>
        </nav>
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<PlaceholderPage title="Panel Map — Coming Soon" />} />
            <Route path="/pins" element={<PlaceholderPage title="Pin Manager — Coming Soon" />} />
            <Route path="/components" element={<PlaceholderPage title="Component Library — Coming Soon" />} />
            <Route path="/power" element={<PlaceholderPage title="Power Budget — Coming Soon" />} />
            <Route path="/progress" element={<PlaceholderPage title="Build Progress — Coming Soon" />} />
            <Route path="/wiring" element={<PlaceholderPage title="Wiring Diagram — Coming Soon" />} />
            <Route path="/mobiflight" element={<PlaceholderPage title="MobiFlight Export — Coming Soon" />} />
            <Route path="/bom" element={<PlaceholderPage title="BOM Generator — Coming Soon" />} />
            <Route path="/journal" element={<PlaceholderPage title="Journal — Coming Soon" />} />
            <Route path="/reference" element={<PlaceholderPage title="Reference — Coming Soon" />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </>
  );
}
