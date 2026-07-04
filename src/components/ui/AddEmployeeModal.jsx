import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// ─── AddEmployeeModal ─────────────────────────────────────────────────────────
//
//  Two-step popup for creating an employee.
//
//    STEP 1 (form):   admin types name, email, department, role.
//                     No employee ID, no password — the backend generates both.
//    STEP 2 (reveal): the popup shows the generated Employee ID and the
//                     temporary password ONCE, with copy buttons, so the admin
//                     can hand them to the new employee.
//
//  The employee is forced to change the password on first login (backend flag),
//  so this temp password is single-use by design.
//
//  Props:
//    onClose   → () => void · close the popup
//    onCreated → () => void · called when the admin finishes, so the parent
//                refetches the list
//
//  ── BACKEND CONTRACT this component expects ──────────────────────────────────
//    POST /users  with body { firstName, lastName, email, department, role }
//    On success (201), the response must be:
//      {
//        success: true,
//        data: { _id, employeeID, firstName, lastName, email, department, role },
//        tempPassword: "amber-tiger-42"
//      }
//    i.e. createUser generates employeeID + tempPassword, sets
//    mustChangePassword: true on the user, and returns the plaintext
//    tempPassword in this one response (it's hashed in the DB and unrecoverable
//    after this).
// ─────────────────────────────────────────────────────────────────────────────

// Defined at module scope so typing doesn't lose focus (see earlier note).
const Field = ({ label, ...inputProps }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 font-sans">
      {label}
    </label>
    <input
      {...inputProps}
      className="
        w-full px-4 py-3
        bg-slate-800 border border-slate-700
        rounded-lg text-sm text-slate-200
        placeholder-slate-500 font-sans
        focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        transition duration-150
      "
    />
  </div>
)

// A labelled value with a Copy button — used on the reveal step.
const CopyRow = ({ label, value }) => {
  const [copied, setCopied] = useState(false)
  

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can fail on non-HTTPS origins — fail quietly; the value
      // is still visible on screen to copy by hand.
    }
  }

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </p>
      <div className="flex items-center justify-between gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
        <span className="text-sm text-stone-50 font-mono break-all">{value}</span>
        <button
          onClick={copy}
          className="shrink-0 text-xs font-mono uppercase tracking-wide text-yellow-500 hover:text-yellow-400 transition-colors duration-150"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}




const AddEmployeeModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    role: 'staff',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
   const [copiedAll, setCopiedAll] = useState(false)

  // When set, we switch from the form to the reveal screen.
  // Shape: { name, employeeID, tempPassword }
  const [created, setCreated] = useState(null)

  // Escape closes the popup — but ONLY on the form step. Once the credentials
  // are showing, Escape is disabled so the admin can't lose them by accident.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !created) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, created])

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async () => {
    setError('')

    const required = ['firstName', 'lastName', 'email', 'department']
    const missing = required.find((k) => !form[k].trim())
    if (missing) {
      setError('Please fill in every field.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        role: form.role,
      })

      const data = res.data?.data || {}
      setCreated({
        name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email.trim(),
           employeeID: data.employeeID || '—',
        tempPassword: res.data?.tempPassword || null,
      })
    } catch (err) {
      const raw = err.response?.data?.error || err.response?.data?.message || ''
      const friendly = /duplicate|E11000/i.test(raw)
        ? 'That email is already taken.'
        : raw || 'Failed to create employee. Please try again.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDone = () => {
    onCreated()
    onClose()
  }

  const goldButton =
    'px-6 py-2.5 rounded-xl text-sm font-semibold font-sans bg-yellow-500 text-slate-900 hover:bg-yellow-400 transition-colors duration-150 shadow-sm shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={created ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-800"
      >
        {/* MERIDIAN corner bracket */}
        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-yellow-500 opacity-30 pointer-events-none" />

        {created ? (
          /* ── STEP 2: REVEAL CREDENTIALS ───────────────────────────────── */
          <>
            <p className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 mb-3">
              Account Created
            </p>
            <h2 className="text-2xl font-bold text-stone-50 font-serif mb-2">
              {created.name} is set up
            </h2>
            <p className="text-slate-400 text-sm font-sans mb-6">
              Give {created.name.split(' ')[0]} their email and temporary password — that's
what they log in with. They'll set their own password on first login.
            </p>

            <div className="space-y-4">
                <CopyRow label="Email" value={created.email} />
              {created.tempPassword ? (
                <CopyRow label="Temporary Password" value={created.tempPassword} />
              ) : (
                <p className="text-red-400 text-xs font-sans">
                  The server didn't send a temporary password. Make sure
                  createUser returns a <span className="font-mono">tempPassword</span> field.
                </p>
              )}
              <CopyRow label="Employee ID (for reference)" value={created.employeeID} />
              </div>

            <p className="text-slate-500 text-xs font-sans mt-6">
              This is the only time the temporary password is shown — copy it now.
            </p>

            <div className="flex justify-end mt-6">
              <button onClick={handleDone} className={goldButton}>
                Done
              </button>
            </div>
          </>
        ) : (
          /* ── STEP 1: FORM ─────────────────────────────────────────────── */
          <>
            <p className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 mb-3">
              New Account
            </p>
            <h2 className="text-2xl font-bold text-stone-50 font-serif mb-6">
              Add Employee
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="First Name"
                  value={form.firstName}
                  onChange={update('firstName')}
                  placeholder="Ama"
                  disabled={submitting}
                  autoFocus
                />
                <Field
                  label="Last Name"
                  value={form.lastName}
                  onChange={update('lastName')}
                  placeholder="Boateng"
                  disabled={submitting}
                />
              </div>

              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="ama@company.com"
                disabled={submitting}
              />

              <Field
                label="Department"
                value={form.department}
                onChange={update('department')}
                placeholder="Operations"
                disabled={submitting}
              />

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 font-sans">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={update('role')}
                  disabled={submitting}
                  className="
                    w-full px-4 py-3
                    bg-slate-800 border border-slate-700
                    rounded-lg text-sm text-slate-200 font-sans
                    focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition duration-150
                  "
                >
                  <option value="staff">Staff</option>
                  <option value="hr">HR</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {error && <p className="text-red-400 text-xs font-sans">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-sans disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={goldButton}
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AddEmployeeModal