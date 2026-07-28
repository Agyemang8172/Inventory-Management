import { useState, ReactNode } from 'react'
import Sidebar from './Sidebar'
import { CiMenuBurger } from 'react-icons/ci'


interface LayoutProps{
  children: ReactNode
}

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile topbar — only visible below lg */}
      <div className="lg:hidden bg-slate-900 px-4 py-3 flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-slate-400 hover:text-yellow-500 transition-colors text-xl"
        >
          <CiMenuBurger />
        </button>
        <span className="text-slate-100 text-sm font-bold font-serif tracking-wide">
          AttendPro
        </span>
      </div>

      {/* Page content — offset for sidebar on desktop */}
      <main className="lg:ml-64 min-h-screen flex flex-col">

        {/* MERIDIAN gold strip — runs across the top of every authenticated page */}
        <div className="h-0.5 w-full bg-gradient-to-r from-yellow-500 via-yellow-400/60 to-transparent" />

        <div className="flex-1 p-6 lg:p-10">
          {children}
        </div>

      </main>
    </div>
  )
}

export default Layout