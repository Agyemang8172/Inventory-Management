import { useState, useEffect, useMemo, useRef } from 'react'
import { getCurrentUser } from '../utils/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import KpiCard from '../components/ui/KpiCard'
import AttendanceTable from '../components/ui/AttendanceTable'
import HoursChart from '../components/charts/HoursChart'
import SessionsChart from '../components/charts/SessionsChart'
import {
  FaUsers,
  FaUserCheck,
  FaClock,
  FaSearch,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
} from 'react-icons/fa'

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

// Generate last 12 months as { value: 'YYYY-MM', label: 'Month YYYY' }
const getLast12Months = () => {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    })
    months.push({ value, label })
  }
  return months
}

const currentMonthValue = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Chart data builders ──────────────────────────────────────────────────────

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

// ─── Export helpers ───────────────────────────────────────────────────────────

const buildExportRows = (records) => {
  const headers = [
    'Employee',
    'Department',
    'Date',
    'Clock In',
    'Clock Out',
    'Hours Worked',
    'Status',
  ]
  const rows = records.map((r) => [
    r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Former Employee',
    r.user?.department || '--',
    new Date(r.date).toLocaleDateString('en-GB'),
    r.clockIn
      ? new Date(r.clockIn).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--',
    r.clockOut
      ? new Date(r.clockOut).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--',
    r.hoursWorked != null ? r.hoursWorked.toFixed(2) : '--',
    r.sessionStatus || '--',
  ])
  return { headers, rows }
}

const exportCSV = (records, month) => {
  const { headers, rows } = buildExportRows(records)
  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`
  const content = [headers, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance-${month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const exportExcel = async (records, month) => {
  try {
    const XLSX = await import('xlsx')
    const { headers, rows } = buildExportRows(records)
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance-${month}.xlsx`)
  } catch (_err) {
    toast.error('Excel export requires xlsx package. Run: npm install xlsx')
  }
}

// ─── SuperAdminDashboard ──────────────────────────────────────────────────────

function SuperAdminDashboard() {
  const user = getCurrentUser()
  const printRef = useRef(null)

  const [records, setRecords] = useState([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())

  const monthOptions = useMemo(() => getLast12Months(), [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendanceRes, usersRes] = await Promise.all([
          api.get('/attendance/all-attendance'),
          api.get('/users?limit=1'),
        ])
        setRecords(attendanceRes.data.data || [])
        setTotalEmployees(usersRes.data.pagination?.totalUsers || 0)
      } catch (_err) {
        toast.error('Failed to load dashboard data.')
      } finally {
        setFetching(false)
      }
    }
    fetchData()
  }, [])

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const clockedInToday = records.filter(
    (r) => isToday(r.date) && r.sessionStatus === 'open'
  ).length

  const lateToday = records.filter(
    (r) => isToday(r.date) && isLate(r.clockIn)
  ).length

  // ── Chart data ─────────────────────────────────────────────────────────────
  const hoursChartData = useMemo(() => buildHoursChartData(records), [records])
  const sessionsChartData = useMemo(() => buildSessionsChartData(records), [records])

  // ── Monthly Report — filter records to selected month ──────────────────────
  const monthRecords = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return records.filter((r) => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }, [records, selectedMonth])

  const monthStats = useMemo(() => {
    const totalSessions = monthRecords.length
    const totalHours = monthRecords.reduce(
      (sum, r) => sum + (r.hoursWorked || 0),
      0
    )
    const uniqueDays = new Set(
      monthRecords.map((r) => new Date(r.date).toDateString())
    ).size
    const avgHoursPerDay =
      uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0.0'
    const lateCount = monthRecords.filter((r) => isLate(r.clockIn)).length
    const latePercent =
      totalSessions > 0
        ? Math.round((lateCount / totalSessions) * 100)
        : 0
    return { totalSessions, avgHoursPerDay, latePercent }
  }, [monthRecords])

  // ── Search filter ──────────────────────────────────────────────────────────
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

  // ── PDF export — print scoped panel ───────────────────────────────────────
  const handlePdfExport = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report — ${selectedMonth}</title>
          <style>
            body { font-family: sans-serif; padding: 32px; color: #0f172a; }
            h2 { font-size: 20px; margin-bottom: 4px; }
            p { font-size: 13px; color: #64748b; margin-bottom: 24px; }
            .stats { display: flex; gap: 32px; margin-bottom: 24px; }
            .stat label { font-size: 11px; text-transform: uppercase;
                          letter-spacing: 0.08em; color: #94a3b8; display: block; }
            .stat span { font-size: 28px; font-weight: 700; color: #0f172a; }
            .divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  // ── Selected month label for display ──────────────────────────────────────
  const selectedMonthLabel =
    monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Layout>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
          {formatTodayLong()}
        </p>
        <p className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 mb-1">
          System Overview
        </p>
        <h1 className="text-2xl font-bold text-slate-900 font-serif leading-tight">
          Welcome, {user?.firstName}.
        </h1>
        <p className="text-slate-400 text-sm font-sans mt-1">
          Full system attendance — all staff, all time.
        </p>
        <div className="mt-3 h-px w-12 bg-yellow-500/40" />
      </header>

      {/* ── KPI Grid — 3 cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KpiCard
          icon={<FaUsers />}
          label="Total Employees"
          value={fetching ? '—' : totalEmployees}
          subtext="active"
          colorScheme="blue"
        />
        <KpiCard
          icon={<FaUserCheck />}
          label="Clocked In Today"
          value={fetching ? '—' : clockedInToday}
          subtext="active sessions"
          colorScheme="green"
        />
        <KpiCard
          icon={<FaClock />}
          label="Late Today"
          value={fetching ? '—' : lateToday}
          subtext="late today"
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
            <div className="relative bg-slate-900 rounded-2xl p-6 overflow-hidden">
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-yellow-500 opacity-30 rounded-tr-sm pointer-events-none" />
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-4">
                Org Hours / Day — Last 7 Days
              </p>
              <HoursChart data={hoursChartData} />
            </div>

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

      {/* ── Monthly Report ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Monthly Report
          </p>
          <div className="mt-2 h-px w-10 bg-yellow-500/40" />
        </div>

        <div className="relative bg-slate-900 rounded-2xl p-6 border border-yellow-500/20 overflow-hidden">
          {/* Corner brackets — MERIDIAN signature */}
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-yellow-500 opacity-40 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-yellow-500 opacity-40 rounded-bl-sm pointer-events-none" />

          {/* Month picker */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <p className="text-slate-200 text-sm font-sans font-medium">
              Showing data for{' '}
              <span className="text-yellow-500 font-mono">
                {selectedMonthLabel}
              </span>
            </p>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="
                bg-slate-800 border border-slate-700
                text-slate-200 text-sm font-mono
                rounded-lg px-3 py-2
                focus:outline-none focus:border-yellow-500/50
                focus:ring-1 focus:ring-yellow-500/30
                transition-colors duration-150
                cursor-pointer
              "
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Printable content — ref used for PDF export */}
          <div ref={printRef}>
            {/* Hidden heading for PDF only */}
            <div className="hidden">
              <h2>Attendance Report — {selectedMonthLabel}</h2>
              <p>Generated by AttendPro on {new Date().toLocaleDateString()}</p>
            </div>

            {/* Stats grid */}
            {monthRecords.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-500 text-sm font-sans">
                  No records found for {selectedMonthLabel}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {/* Total Sessions */}
                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
                    Total Sessions
                  </p>
                  <p className="text-3xl font-bold text-slate-100 font-mono">
                    {monthStats.totalSessions}
                  </p>
                </div>

                {/* Avg Hours / Day */}
                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
                    Avg Hours / Day
                  </p>
                  <p className="text-3xl font-bold text-slate-100 font-mono">
                    {monthStats.avgHoursPerDay}
                    <span className="text-sm font-normal text-slate-500 ml-1 font-sans">
                      hrs
                    </span>
                  </p>
                </div>

                {/* Late % */}
                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
                    Late Arrivals
                  </p>
                  <p className="text-3xl font-bold text-slate-100 font-mono">
                    {monthStats.latePercent}
                    <span className="text-sm font-normal text-slate-500 ml-1 font-sans">
                      %
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => exportCSV(monthRecords, selectedMonth)}
              disabled={monthRecords.length === 0}
              className="
                flex items-center gap-2
                px-4 py-2 rounded-lg
                text-xs font-mono uppercase tracking-wider
                border border-green-500/30
                text-green-400
                bg-green-500/10
                hover:bg-green-500/20
                transition-colors duration-150
                disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              <FaFileCsv />
              CSV
            </button>

            <button
              onClick={() => exportExcel(monthRecords, selectedMonth)}
              disabled={monthRecords.length === 0}
              className="
                flex items-center gap-2
                px-4 py-2 rounded-lg
                text-xs font-mono uppercase tracking-wider
                border border-blue-500/30
                text-blue-400
                bg-blue-500/10
                hover:bg-blue-500/20
                transition-colors duration-150
                disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              <FaFileExcel />
              Excel
            </button>

            <button
              onClick={handlePdfExport}
              disabled={monthRecords.length === 0}
              className="
                flex items-center gap-2
                px-4 py-2 rounded-lg
                text-xs font-mono uppercase tracking-wider
                border border-red-500/30
                text-red-400
                bg-red-500/10
                hover:bg-red-500/20
                transition-colors duration-150
                disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              <FaFilePdf />
              PDF
            </button>
          </div>
        </div>
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

        {/* No results */}
        {!fetching && searchQuery && filteredRecords.length === 0 && (
          <div className="bg-slate-900 rounded-2xl px-6 py-10 text-center mb-4">
            <p className="text-slate-400 text-sm font-sans">
              No results for{' '}
              <span className="text-slate-200 font-mono">
                "{searchQuery}"
              </span>
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

export default SuperAdminDashboard