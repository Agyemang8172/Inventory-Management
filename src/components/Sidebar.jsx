import { useLocation, useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../utils/auth'
import  { Roles }  from '../types'
import { FaHome, FaUser, FaUsers } from 'react-icons/fa'
import { SlCalender } from 'react-icons/sl'
import { FaGear } from 'react-icons/fa6'
import { CiLogout } from 'react-icons/ci'
import {  FaUsersGear } from 'react-icons/fa6'
import {ReactNode} from 'react'


interface NavItem {
  label:string,
  path: String,
  icon:ReactNode,
  roles:Role[]
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void    // a function that takes no args and returns nothing
}

const allNavItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <FaHome />,
    roles: ['staff'],
  },
  {
    label: 'HR Dashboard',
    path: '/hr-dashboard',
    icon: <FaUsers />,
    roles: ['hr', 'superadmin'],
  },
  {
    label: 'My Profile',
    path: '/profile',
    icon: <FaUser />,
    roles: ['staff'],
  },
  {
    label: 'My Schedule',
    path: '/schedule',
    icon: <SlCalender />,
    roles: ['staff'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <FaGear />,
    roles: ['staff', 'hr', 'superadmin'],
  },

  {
    label: 'Manage Staff',
    path: '/manage-staff',
    icon: <FaUsersGear />,
    roles: ['superadmin'],
  },
]

const roleLabel: Record<Role, string> = {
  staff: 'Staff',
  hr: 'HR Manager',
  superadmin: 'Super Admin',
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getCurrentUser()

  const allowedNavItems = allNavItems.filter((item) =>
    item.roles.includes(currentUser?.role)
  )

  const initials = [currentUser?.firstName, currentUser?.lastName]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('')

  const handleLogOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64
          bg-slate-900
          flex flex-col
          z-30
          transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Top-right corner bracket — MERIDIAN signature */}
        <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-yellow-500 opacity-30 rounded-tr-sm pointer-events-none" />

        {/* ── BRAND BLOCK ────────────────────────────────────────────────── */}
        <div className="px-6 pt-10 pb-6">
          {/* Gold strip at very top of sidebar — mirrors Layout gold strip */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-500 via-yellow-400/60 to-transparent" />

          <h2 className="text-2xl font-bold text-yellow-500 tracking-tight leading-none font-serif">
            AttendPro
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-sans">
            Attendance Management
          </p>
          <div className="mt-5 h-px bg-yellow-500/20" />
        </div>

        {/* ── NAV ITEMS ──────────────────────────────────────────────────── */}
        <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const isActive = location.pathname === item.path

            return (
              <div
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  onClose()
                }}
                className={`
                  flex items-center gap-3
                  px-4 py-3
                  rounded-lg
                  text-sm font-medium font-sans
                  cursor-pointer
                  transition-all duration-150
                  ${
                    isActive
                      ? 'border-l-2 border-yellow-500 bg-yellow-500/10 text-yellow-500 pl-3'
                      : 'border-l-2 border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }
                `}
              >
                <span className={`text-base shrink-0 ${isActive ? 'text-yellow-500' : ''}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
            )
          })}
        </nav>

        {/* ── BOTTOM SECTION ─────────────────────────────────────────────── */}
        <div className="px-4 pb-6 pt-4 border-t border-yellow-500/10">

          {/* User identity block */}
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
              <span className="text-yellow-500 text-xs font-bold font-sans">
                {initials || '??'}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-slate-100 text-sm font-medium truncate font-sans">
                {currentUser?.firstName} {currentUser?.lastName}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 font-sans">
                {roleLabel[currentUser?.role] || currentUser?.role}
              </span>
            </div>
          </div>

          {/* Logout */}
          <div
            onClick={handleLogOut}
            className="
              flex items-center gap-3
              px-4 py-3
              rounded-lg
              text-sm font-medium font-sans
              cursor-pointer
              transition-all duration-150
              border-l-2 border-transparent
              text-slate-400
              hover:text-red-400
              hover:bg-red-500/10
              hover:border-red-500
            "
          >
            <CiLogout className="text-base shrink-0" />
            <span>Logout</span>
          </div>

          {/* Status line */}
          <div className="flex items-center gap-2 mt-4 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-slate-500 text-[10px] font-mono">
              System Online v1.0
            </span>
          </div>
        </div>

        {/* Bottom-right corner bracket */}
        <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-yellow-500 opacity-30 rounded-br-sm pointer-events-none" />

      </aside>
    </>
  )
}

export default Sidebar