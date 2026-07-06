import { Link, Outlet, useLocation } from 'react-router-dom'
import { NuMark } from './NuMark'

const NAV = [
  { to: '/admin/displays', label: 'Displays' },
  { to: '/admin/chapel', label: 'Chapel' },
]

export default function Shell() {
  const loc = useLocation()
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-white/10 backdrop-blur-glass bg-nu-midnight/60">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center gap-8">
          <Link to="/admin/displays" className="flex items-center gap-3">
            <NuMark size={32} />
            <div className="leading-tight">
              <div className="font-serif text-[18px] text-nu-wisp leading-none">
                Northwest University
              </div>
              <div className="text-[11px] font-bold tracking-[0.28em] uppercase text-nu-tour mt-1">
                Operations Center
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-2 ml-2">
            {NAV.map((n) => {
              const active = loc.pathname.startsWith(n.to)
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={[
                    'px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-colors',
                    active
                      ? 'bg-nu-tour/15 text-nu-tour border border-nu-tour/40'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="nu-pill">
              <span className="w-1.5 h-1.5 rounded-full bg-nu-leaf animate-pulse" />
              Phase 2
            </span>
            <span className="text-[12px] text-nu-skylight">v0.2</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-nu-midnight/60 backdrop-blur-glass">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between text-[12px] text-nu-skylight">
          <span>Northwest University · Campus Digital Signage</span>
          <span>Kirkland, Washington · Since 1934</span>
        </div>
      </footer>
    </div>
  )
}
