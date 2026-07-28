import { useState, useEffect, useMemo } from 'react'
import { getCurrentUser } from '../utils/auth'
import api from '../api/axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { FaLock, FaCheck } from 'react-icons/fa'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isLate = (clockInStr) => {
  const d = new Date(clockInStr)
  return d.getHours() > 6 || (d.getHours() === 6 && d.getMinutes() >= 30)
}

const isEarlyBird = (clockInStr) => {
  const d = new Date(clockInStr)
  return d.getHours() < 6
}

const roleLabel = {
  staff: 'Staff',
  hr: 'HR Manager',
  superadmin: 'Super Admin',
}

// ─── Badge Definitions ────────────────────────────────────────────────────────
//
//  Each badge:
//    emoji       → display icon
//    name        → badge title
//    description → what it means (shown when earned)
//    hint        → how to earn it (shown when locked)
//    check()     → function that receives records[], returns bool
//    earned styles
//    locked styles
//
// ─────────────────────────────────────────────────────────────────────────────

const BADGES = [
  {
    id: 'on_fire',
    emoji: '🔥',
    name: 'On Fire',
    description: 'Current streak of 5+ on-time days.',
    hint: 'Clock in before 06:30 for 5 days in a row.',
    check: (records) => {
      let count = 0
      for (const r of records) {
        if (r.sessionStatus !== 'closed') break
        if (isLate(r.clockIn)) break
        count++
      }
      return count >= 5
    },
    earnedCard: 'bg-orange-500/10 border-orange-500/20',
    earnedEmoji: '',
    earnedText: 'text-orange-400',
    earnedSub: 'text-orange-400/70',
  },
  {
    id: 'early_bird',
    emoji: '⚡',
    name: 'Early Bird',
    description: 'You have clocked in before 06:00.',
    hint: 'Clock in before 06:00 at least once.',
    check: (records) =>
      records.some(
        (r) => r.clockIn && r.sessionStatus === 'closed' && isEarlyBird(r.clockIn)
      ),
    earnedCard: 'bg-yellow-500/10 border-yellow-500/20',
    earnedEmoji: '',
    earnedText: 'text-yellow-500',
    earnedSub: 'text-yellow-500/70',
  },
  {
    id: 'perfect_month',
    emoji: '💎',
    name: 'Perfect Month',
    description: 'Zero late arrivals this calendar month.',
    hint: 'Have no late clock-ins this month.',
    check: (records) => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonth = records.filter(
        (r) =>
          r.sessionStatus === 'closed' && new Date(r.date) >= startOfMonth
      )
      if (thisMonth.length === 0) return false
      return thisMonth.every((r) => !isLate(r.clockIn))
    },
    earnedCard: 'bg-blue-500/10 border-blue-500/20',
    earnedEmoji: '',
    earnedText: 'text-blue-400',
    earnedSub: 'text-blue-400/70',
  },
  {
    id: 'veteran',
    emoji: '🏆',
    name: 'Veteran',
    description: '30+ sessions completed.',
    hint: 'Complete 30 or more closed sessions.',
    check: (records) =>
      records.filter((r) => r.sessionStatus === 'closed').length >= 30,
    earnedCard: 'bg-amber-500/10 border-amber-500/20',
    earnedEmoji: '',
    earnedText: 'text-amber-400',
    earnedSub: 'text-amber-400/70',
  },
]

// ─── Badge Card ───────────────────────────────────────────────────────────────

const BadgeCard = ({ badge, earned }) => {
  if (earned) {
    return (
      <div
        className={`
          relative rounded-2xl border p-5
          flex flex-col gap-3
          ${badge.earnedCard}
        `}
      >
        {/* Corner bracket */}
        <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-yellow-500 opacity-30 pointer-events-none" />

        {/* Emoji */}
        <span className="text-3xl">{badge.emoji}</span>

        {/* Name + check */}
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-sans font-medium ${badge.earnedText}`}>
            {badge.name}
          </p>
          <FaCheck className="text-green-500 text-xs shrink-0" />
        </div>

        {/* Description */}
        <p className={`text-xs font-sans leading-relaxed ${badge.earnedSub}`}>
          {badge.description}
        </p>
      </div>
    )
  }

  // Locked
  return (
    <div className="relative rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 flex flex-col gap-3">
      {/* Emoji — muted via opacity */}
      <span className="text-3xl opacity-25">{badge.emoji}</span>

      {/* Name + lock */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-sans font-medium text-slate-600">
          {badge.name}
        </p>
        <FaLock className="text-slate-600 text-xs shrink-0" />
      </div>

      {/* Hint */}
      <p className="text-xs font-sans leading-relaxed text-slate-600">
        {badge.hint}
      </p>
    </div>
  )
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value, mono = false, last = false }) => (
  <div className={last ? '' : 'border-b border-slate-800 pb-4 mb-4'}>
    <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
      {label}
    </p>
    <p className={`text-slate-100 text-sm ${mono ? 'font-mono' : 'font-sans'}`}>
      {value}
    </p>
  </div>
)

// ─── Profile ──────────────────────────────────────────────────────────────────

function Profile() {
  const user = getCurrentUser()

  const [records, setRecords] = useState([])
  const [fetching, setFetching] = useState(true)

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('')

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/attendance/my-attendance')
        setRecords(res.data.data || [])
      } catch (err) {
        toast.error('Failed to load profile data.')
      } finally {
        setFetching(false)
      }
    }
    fetchAttendance()
  }, [])

  // Compute which badges are earned
  const earnedMap = useMemo(() => {
    const map = {}
    BADGES.forEach((b) => {
      map[b.id] = b.check(records)
    })
    return map
  }, [records])

  const earnedCount = Object.values(earnedMap).filter(Boolean).length

  return (
    <Layout>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 mb-1">
          Profile
        </p>
        <h1 className="text-2xl font-bold text-slate-900 font-serif leading-tight">
          My Profile
        </h1>
        <p className="text-slate-400 text-sm font-sans mt-1">
          Your account details and achievements.
        </p>
        <div className="mt-3 h-px w-12 bg-yellow-500/40" />
      </header>

      {/* ── Profile Card ─────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 max-w-lg mb-8 overflow-hidden">

        {/* Corner brackets */}
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-yellow-500 opacity-30 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-yellow-500 opacity-30 pointer-events-none" />

        {/* Avatar + identity */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <span className="text-yellow-500 text-xl font-bold font-sans">
              {initials || '??'}
            </span>
          </div>
          <div>
            <h2 className="text-slate-100 text-lg font-semibold font-sans">
              {user?.firstName} {user?.lastName}
            </h2>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 text-xs font-mono uppercase tracking-wider">
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-px bg-yellow-500/10 mb-6" />

        {/* Info rows */}
        <InfoRow label="Employee ID" value={user?.employeeID || '--'} mono />
        <InfoRow label="Email" value={user?.email} last />
      </div>

      {/* ── Achievements ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Achievements
            </p>
            <div className="mt-2 h-px w-10 bg-yellow-500/40" />
          </div>
          {/* Badge count */}
          {!fetching && (
            <span className="text-xs font-mono text-slate-500">
              <span className="text-yellow-500">{earnedCount}</span>
              /{BADGES.length} earned
            </span>
          )}
        </div>

        {fetching ? (
          <div className="bg-slate-900 rounded-2xl p-8 flex items-center justify-center border border-slate-800">
            <p className="text-slate-500 text-sm font-sans animate-pulse">
              Loading achievements…
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BADGES.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={earnedMap[badge.id]}
              />
            ))}
          </div>
        )}
      </section>

    </Layout>
  )
}

export default Profile