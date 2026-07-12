import { useState, useEffect } from 'react'
import { getCurrentUser } from '../utils/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import KpiCard from '../components/ui/KpiCard'
import AttendanceTable from '../components/ui/AttendanceTable'
import { FaClock, FaFire, FaChartLine, FaExclamationTriangle } from 'react-icons/fa'
import { BsCircleFill } from 'react-icons/bs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isLate = (clockInStr) => {
  const d = new Date(clockInStr)
  return d.getHours() > 6 || (d.getHours() === 6 && d.getMinutes() >= 30)
}

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const formatTodayLong = () =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const user = getCurrentUser()

  const [records, setRecords]         = useState([])
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockLoading, setClockLoading] = useState(false)
  const [fetching, setFetching]       = useState(true)

  useEffect(() => {
    fetchAttendance()
  }, [])

  // ── Fetch attendance + derive clock state ──────────────────────────────────
  const fetchAttendance = async () => {
    try {
      const res  = await api.get('/attendance/my-attendance')
      const data = res.data.data || []
      setRecords(data)

      const openSession = data.find((r) => r.sessionStatus === 'open')
      setIsClockedIn(!!openSession)

      // Auto clock-out alert (fires when backend adds these fields — safe to run now)
      const stale = data.filter(
        (r) => r.autoClosedOut === true && r.alertDismissed === false
      )
      stale.forEach(async (r) => {
        const date = new Date(r.date).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        toast(
          `You forgot to clock out on ${date}. The system clocked you out at 11:59 PM. Please review your record.`,
          { icon: '⚠️', duration: 7000 }
        )
        try { await api.patch(`/attendance/${r._id}/dismiss-alert`) } catch (_) {}
      })
    } catch {
      toast.error('Failed to load attendance records.')
    } finally {
      setFetching(false)
    }
  }

  // ── Clock In ───────────────────────────────────────────────────────────────
  const handleClockIn = async () => {
    setClockLoading(true)
    try {
      await api.post('/attendance/clock-in')
      toast.success('Clocked in successfully.')
      await fetchAttendance()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock in failed.')
    } finally {
      setClockLoading(false)
    }
  }

  // ── Clock Out ──────────────────────────────────────────────────────────────
  const handleClockOut = async () => {
    setClockLoading(true)
    try {
      await api.post('/attendance/clock-out')
      toast.success('Clocked out successfully.')
      await fetchAttendance()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock out failed.')
    } finally {
      setClockLoading(false)
    }
  }

  // ── KPI calculations ───────────────────────────────────────────────────────

  // 1. Weekly Hours — sum hoursWorked for the last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const weeklyHours = records
    .filter((r) => new Date(r.date) >= sevenDaysAgo)
    .reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
    .toFixed(1)

  // 2. Streak — consecutive closed sessions going backwards from today
  const sortedClosed = [...records]
    .filter((r) => r.sessionStatus === 'closed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  let streak = 0
  let prevDate = null
  for (const r of sortedClosed) {
    const d = new Date(r.date)
    d.setHours(0, 0, 0, 0)
    if (!prevDate) {
      streak = 1
      prevDate = d
    } else {
      const diff = (prevDate - d) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        streak++
        prevDate = d
      } else {
        break
      }
    }
  }

  // 3. Attendance Rate — closed sessions this calendar month / 22 working days
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const closedThisMonth = records.filter(
    (r) => r.sessionStatus === 'closed' && new Date(r.date) >= startOfMonth
  ).length
  const attendanceRate =
    closedThisMonth > 0
      ? Math.min(Math.round((closedThisMonth / 22) * 100), 100)
      : 0

  // 4. Late Arrivals — records this month where clockIn >= 06:30
  const lateArrivals = records.filter(
    (r) => new Date(r.date) >= startOfMonth && isLate(r.clockIn)
  ).length

  // ──────────────────────────────────────────────────────────────────────────


  return (
    <Layout>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">

        {/* Left — date eyebrow + big greeting */}
        <div>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-4">
            {formatTodayLong()}
          </p>
          <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 font-serif leading-none tracking-tight">
            {getGreeting()},<br />
            {user?.firstName}.
          </h1>
          {/* Gold divider — solid, visible */}
          <div className="mt-5 h-0.5 w-20 bg-yellow-500" />
        </div>

        {/* Right — clock status pill + action button */}
        <div className="flex items-center gap-4 sm:mb-1">

          {/* Status indicator */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
            <BsCircleFill
              className={`text-[8px] ${isClockedIn ? 'text-green-500' : 'text-red-400'}`}
            />
            <span className="text-slate-600 text-xs font-mono">
              {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </span>
          </div>

          {/* Primary CTA — solid gold when clocking in, soft red when out */}
          {isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={clockLoading}
              className="
                px-6 py-2.5 rounded-xl
                text-sm font-semibold font-sans
                bg-red-50 text-red-500
                border border-red-200
                hover:bg-red-100
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {clockLoading ? 'Processing…' : 'Clock Out'}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={clockLoading}
              className="
                px-6 py-2.5 rounded-xl
                text-sm font-semibold font-sans
                bg-yellow-500 text-slate-900
                hover:bg-yellow-400
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm shadow-yellow-500/20
              "
            >
              {clockLoading ? 'Processing…' : 'Clock In'}
            </button>
          )}
        </div>
      </header>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <KpiCard
          icon={<FaClock />}
          label="Weekly Hours"
          value={weeklyHours}
          subtext="/ 40 hrs target"
          colorScheme="blue"
        />
        <KpiCard
          icon={<FaFire />}
          label="Streak"
          value={streak}
          subtext="days on time"
          colorScheme="gold"
        />
        <KpiCard
          icon={<FaChartLine />}
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          subtext="this month"
          colorScheme="green"
        />
        <KpiCard
          icon={<FaExclamationTriangle />}
          label="Late Arrivals"
          value={lateArrivals}
          subtext="this month"
          colorScheme="red"
        />
      </div>

      {/* ── Attendance History ────────────────────────────────────────────── */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Attendance History
          </p>
          <div className="mt-2 h-0.5 w-10 bg-yellow-500/60" />
        </div>

        {fetching ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center shadow-sm">
            <p className="text-slate-400 text-sm font-sans animate-pulse">
              Loading records…
            </p>
          </div>
        ) : (
          <AttendanceTable records={records} showEmployee={false} />
        )}
      </section>

    </Layout>
  )
}

export default Dashboard