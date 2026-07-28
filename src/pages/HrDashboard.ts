import { useState, useEffect, useMemo } from 'react'
import { getCurrentUser } from '../utils/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import KpiCard from '../components/ui/KpiCard'
import AttendanceTable from '../components/ui/AttendanceTable'
import HoursChart from '../components/charts/HoursChart'
import SessionsChart from '../components/charts/SessionsChart'
import { FaUserCheck, FaClock, FaSearch } from 'react-icons/fa'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isLate = (clockInStr) => {
  const d = new Date(clockInStr)
  return d.getHours() > 6 || (d.getHours() === 6 && d.getMinutes() >= 30)
}

const isToday = (dateStr) => {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

const formatTodayLong = () =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// ─── Chart data builders ──────────────────────────────────────────────────────

// Bar chart: total org hours per day for last 7 days
const buildHoursChartData = (records) => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const label = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const dateStr = d.toDateString()
    const total = records
      .filter((r) => new Date(r.date).toDateString() === dateStr)
      .reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
    days.push({ day: label, hours: parseFloat(total.toFixed(1)) })
  }
  return days
}

// Donut chart: open / closed / late counts for last 7 days
const buildSessionsChartData = (records) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const week = records.filter((r) => new Date(r.date) >= sevenDaysAgo)
  const closed = week.filter(
    (r) => r.sessionStatus === 'closed' && !isLate(r.clockIn)
  ).length
  const late = week.filter(
    (r) => r.sessionStatus === 'closed' && isLate(r.clockIn)
  ).length
  const open = week.filter((r) => r.sessionStatus === 'open').length
  return [
    { name: 'Closed', value: closed },
    { name: 'Late', value: late },
    { name: 'Open', value: open },
  ].filter((s) => s.value > 0)
}

// ─── HrDashboard ──────────────────────────────────────────────────────────────

function HrDashboard() {
  const user = getCurrentUser()

  const [records, setRecords] = useState([])
  const [fetching, setFetching] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {


    const fetchAllAttendance = async () => {
    try {
      const res = await api.get('/attendance/all-attendance')
      setRecords(res.data.data || [])
    } catch (_error) {
      toast.error('Failed to load attendance records.')
    } finally {
      setFetching(false)
    }
  }
    fetchAllAttendance()
  }, [])

  

  // ── KPIs — today only ──────────────────────────────────────────────────────
  const clockedInToday = records.filter(
    (r) => isToday(r.date) && r.sessionStatus === 'open'
  ).length

  const lateToday = records.filter(
    (r) => isToday(r.date) && isLate(r.clockIn)
  ).length

  // ── Chart data ─────────────────────────────────────────────────────────────
  const hoursChartData = useMemo(() => buildHoursChartData(records), [records])
  const sessionsChartData = useMemo(() => buildSessionsChartData(records), [records])

  // ── Search filter — client-side, real-time ─────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records
    const q = searchQuery.toLowerCase()
    return records.filter((r) => {
      const name = r.user
        ? `${r.user.firstName} ${r.user.lastName}`.toLowerCase()
        : 'former employee'
      const dept = (r.user?.department || '').toLowerCase()
      const date = new Date(r.date)
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .toLowerCase()
      const status = (r.sessionStatus || '').toLowerCase()
      return (
        name.includes(q) ||
        dept.includes(q) ||
        date.includes(q) ||
        status.includes(q)
      )
    })
  }, [records, searchQuery])

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Layout>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
          {formatTodayLong()}
        </p>
        <p className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 mb-1">
          HR Dashboard
        </p>
        <h1 className="text-2xl font-bold text-slate-900 font-serif leading-tight">
          Welcome, {user?.firstName}.
        </h1>
        <p className="text-slate-400 text-sm font-sans mt-1">
          Full attendance overview — all staff.
        </p>
        <div className="mt-3 h-px w-12 bg-yellow-500/40" />
      </header>

      {/* ── KPI Grid — 2 cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <KpiCard
          icon={<FaUserCheck />}
          label="Clocked In Today"
          value={clockedInToday}
          subtext="active sessions"
          colorScheme="green"
        />
        <KpiCard
          icon={<FaClock />}
          label="Late Today"
          value={lateToday}
          subtext="after 06:30"
          colorScheme="gold"
        />
      </div>

      {/* ── Weekly Overview — Charts ─────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Weekly Overview
          </p>
          <div className="mt-2 h-px w-10 bg-yellow-500/40" />
        </div>

        {fetching ? (
          <div className="bg-slate-900 rounded-2xl p-8 flex items-center justify-center">
            <p className="text-slate-500 text-sm font-sans animate-pulse">
              Loading charts…
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar chart — org hours per day, last 7 days */}
            <div className="relative bg-slate-900 rounded-2xl p-6 overflow-hidden">
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-yellow-500 opacity-30 rounded-tr-sm pointer-events-none" />
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-4">
                Org Hours / Day — Last 7 Days
              </p>
              <HoursChart data={hoursChartData} />
            </div>

            {/* Donut chart — session breakdown this week */}
            <div className="relative bg-slate-900 rounded-2xl p-6 overflow-hidden">
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-yellow-500 opacity-30 rounded-tr-sm pointer-events-none" />
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-4">
                Session Breakdown — This Week
              </p>
              <SessionsChart data={sessionsChartData} />
            </div>
          </div>
        )}
      </section>

      {/* ── All Attendance ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            All Attendance
          </p>
          <div className="mt-2 h-px w-10 bg-yellow-500/40" />
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, department, date or status…"
            className="
              w-full pl-10 pr-4 py-3
              bg-slate-900
              border border-slate-700
              rounded-xl
              text-sm text-slate-200
              placeholder-slate-500
              font-sans
              focus:outline-none
              focus:border-yellow-500/50
              focus:ring-1 focus:ring-yellow-500/30
              transition-colors duration-150
            "
          />
        </div>

        {/* No results state */}
        {!fetching && searchQuery && filteredRecords.length === 0 && (
          <div className="bg-slate-900 rounded-2xl px-6 py-10 text-center mb-4">
            <p className="text-slate-400 text-sm font-sans">
              No results for <span className="text-slate-200 font-mono">"{searchQuery}"</span>
            </p>
            <p className="text-slate-600 text-xs font-sans mt-1">
              Try a different name, department, date or status.
            </p>
          </div>
        )}

        {fetching ? (
          <div className="bg-slate-900 rounded-2xl p-8 flex items-center justify-center">
            <p className="text-slate-500 text-sm font-sans animate-pulse">
              Loading records…
            </p>
          </div>
        ) : (
          (!searchQuery || filteredRecords.length > 0) && (
            <AttendanceTable records={filteredRecords} showEmployee={true} />
          )
        )}
      </section>

    </Layout>
  )
}

export default HrDashboard