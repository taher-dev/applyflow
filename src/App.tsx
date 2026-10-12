import { useState } from 'react'
import { Briefcase, CheckCircle2, Sparkles, Layers, ShieldCheck, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'stack'>('status')

  const checklistItems = [
    { label: 'React 19 & Vite 8 Core Engine', detail: 'Blazing fast development server & production bundler' },
    { label: 'TypeScript Strict Mode', detail: 'Strict type safety with modern path mapping' },
    { label: 'Tailwind CSS v4 & Design Tokens', detail: 'Theme variables, responsive layout, and fluid typography' },
    { label: 'Official shadcn/ui Components', detail: 'Accessible primitive foundation and button variants' },
    { label: 'Path Alias Resolution (@/*)', detail: 'Direct imports from src directory configured across Vite and TS' },
    { label: 'ESLint Flat Config', detail: 'Code quality and React best-practice validation' },
  ]

  const stackDetails = [
    { name: 'Framework', value: 'React 19 + TypeScript' },
    { name: 'Bundler', value: 'Vite 8' },
    { name: 'Styling', value: 'Tailwind CSS v4' },
    { name: 'UI Primitives', value: 'shadcn/ui (Radix UI)' },
    { name: 'Icons', value: 'Lucide React' },
    { name: 'Import Alias', value: '@/* -> ./src/*' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8">
      <main className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold tracking-wide">
            <Briefcase className="size-3.5" />
            <span>ApplyFlow Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Project Foundation Established
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            The frontend architecture is verified, strictly typed, and ready for incremental feature development.
          </p>
        </header>

        {/* Action Controls */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Button
            variant={activeTab === 'status' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('status')}
          >
            <ShieldCheck className="size-4" />
            Foundation Status
          </Button>
          <Button
            variant={activeTab === 'stack' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('stack')}
          >
            <Layers className="size-4" />
            Stack Specs
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'status' ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Core Milestones
            </h2>
            <ul className="space-y-2.5">
              {checklistItems.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
                >
                  <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium leading-none">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Engine Specifications
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stackDetails.map((item) => (
                <div
                  key={item.name}
                  className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1"
                >
                  <dt className="text-xs text-muted-foreground font-medium">{item.name}</dt>
                  <dd className="text-sm font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Footer info badge */}
        <footer className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Terminal className="size-3.5" />
            <span>Ready for dashboard & tracking features</span>
          </div>
          <div className="inline-flex items-center gap-1 text-emerald-600 font-medium">
            <Sparkles className="size-3.5" />
            <span>Build & Lint Checks Passing</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
