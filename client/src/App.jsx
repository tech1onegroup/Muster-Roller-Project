import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { Camera, History, Users, Building2, Menu } from 'lucide-react'
import Attendance from './pages/Attendance'
import AttendanceHistory from './pages/AttendanceHistory'
import Laborers from './pages/Laborers'
import Contractors from './pages/Contractors'

const navItems = [
  { path: '/', icon: Camera, label: 'Attendance' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/laborers', icon: Users, label: 'Laborers' },
  { path: '/contractors', icon: Building2, label: 'Contractors' },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex" style={{ background: 'var(--background)', height: '100dvh', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — Samsung One UI: spacious, rounded active states */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--deep-dark)' }}
      >
        {/* Brand header */}
        <div className="px-6 py-6 border-b border-white/8">
          <h1 className="text-xl tracking-tight" style={{ fontFamily: "'Anthropic Serif', Georgia, serif", color: 'var(--primary-foreground)', fontWeight: 500 }}>
            <span style={{ color: 'var(--accent)' }}>Labour</span> Attendance
          </h1>
          <p className="text-xs mt-1.5" style={{ color: 'rgba(255,252,248,0.4)' }}>Face Recognition System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-1.5">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                }`
              }
              style={({ isActive }) => ({
                borderRadius: '12px',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isActive ? '#fffcf8' : 'rgba(255,252,248,0.5)',
                boxShadow: isActive ? '0px 0px 0px 1px rgba(255,255,255,0.06)' : 'none',
              })}
            >
              <Icon size={20} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/6">
          <p className="text-xs" style={{ color: 'rgba(255,252,248,0.25)' }}>OneGroup &copy; 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-5"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--border)',
            paddingTop: 'calc(16px + env(safe-area-inset-top))',
            paddingBottom: '16px',
            paddingLeft: 'calc(20px + env(safe-area-inset-left))',
            paddingRight: 'calc(20px + env(safe-area-inset-right))',
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg" style={{ background: 'var(--muted)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Open menu">
            <Menu size={20} style={{ color: 'var(--foreground)' }} />
          </button>
          <h1 className="text-lg" style={{ color: 'var(--primary)', fontFamily: "'Anthropic Serif', Georgia, serif", fontWeight: 500 }}>Labour Attendance</h1>
        </header>

        {/* Page content — Samsung One UI: generous padding */}
        <main
          className="flex-1 overflow-y-auto p-5 lg:p-10"
          style={{
            paddingLeft: 'max(20px, env(safe-area-inset-left))',
            paddingRight: 'max(20px, env(safe-area-inset-right))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Routes>
            <Route path="/" element={<Attendance />} />
            <Route path="/history" element={<AttendanceHistory />} />
            <Route path="/laborers" element={<Laborers />} />
            <Route path="/contractors" element={<Contractors />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
