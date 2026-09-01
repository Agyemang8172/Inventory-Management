import { useState, useEffect } from 'react'
import { getCurrentUser } from '../../utils/auth'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// ─── EditEmployeeModal ────────────────────────────────────────────────────────
//
//  Edit an existing employee's details. Sibling of AddEmployeeModal — same
//  overlay, same panel, same input classes, different job.
//
//  Props:
//    user      → the employee object being edited (from the table row)
//    onClose   → () => void · close without saving
//    onUpdated → () => void · called after a successful update so the parent
//                refetches the list
//
//  What CAN be edited:    firstName, lastName, email, department, role
//  What CANNOT be edited: employeeID (stripped by backend), password (own endpoint)
//
//  Guards:
//    - Self-role-change blocked: if the logged-in superadmin edits their own
//      row, the Role dropdown is disabled. They can still edit their own name,
//      email, department — just not demote themselves.
//    - "Nothing changed" detection: if all fields match the original, Save
//      closes the modal without calling the API.
//
// ─────────────────────────────────────────────────────────────────────────────

// Module-scope so React doesn't remount on every keystroke.
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

const EditEmployeeModal = ({ user, onClose, onUpdated }) => {
  const currentUser = getCurrentUser()
  const isEditingSelf = currentUser?.email === user.email

  // Pre-fill with the employee's current values.
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    department: user.department || '',
    role: user.role || 'staff',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  

  // Check whether anything actually changed.
  const hasChanges = () => {
    return (
      form.firstName.trim() !== (user.firstName || '') ||
      form.lastName.trim() !== (user.lastName || '') ||
      form.email.trim() !== (user.email || '') ||
      form.department.trim() !== (user.department || '') ||
      form.role !== (user.role || 'staff')


    )
  }

  const handleSubmit = async () => {
    setError('')

    // Validate — same checks as Add, minus password.
    const required = ['firstName', 'lastName', 'email', 'department']
    const missing = required.find((k) => !form[k].trim())
    if (missing) {
      setError('Please fill in every field.')
      return
    }

    // If nothing changed, just close — no API call, no fake success toast.
    if (!hasChanges()) {
      onClose()
      return
    }

    setSubmitting(true)
    try {
      await api.put(`/users/${user._id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        role: form.role,
      })
      toast.success(`${form.firstName} updated.`)
      onUpdated()
      onClose()
    } catch (err) {
      const raw = err.response?.data?.error || err.response?.data?.message || ''
      const friendly = /duplicate|E11000/i.test(raw)
        ? 'That email is already taken.'
        : raw || 'Failed to update employee.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  const goldButton =
    'px-6 py-2.5 rounded-xl text-sm font-semibold font-sans bg-yellow-500 text-slate-900 hover:bg-yellow-400 transition-colors duration-150 shadow-sm shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-800"
      >
        {/* MERIDIAN corner bracket */}
        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-yellow-500 opacity-30 pointer-events-none" />

        {/* Header */}
        <p className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 mb-3">
          Edit Account
        </p>
        <h2 className="text-2xl font-bold text-stone-50 font-serif mb-2">
          Edit Employee
        </h2>
        <p className="text-slate-400 text-sm font-sans mb-1">
          Update details for{' '}
          <span className="text-stone-50 font-medium">
            {user.firstName} {user.lastName}
          </span>
        </p>
        {user.employeeID && (
          <p className="text-slate-500 text-xs font-mono mb-6">
            {user.employeeID}
          </p>
        )}

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

          {/* Role — disabled when editing yourself (self-demotion guard) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 font-sans">
              Role
            </label>
            <select
              value={form.role}
              onChange={update('role')}
              disabled={submitting || isEditingSelf}
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
            {isEditingSelf && (
              <p className="text-slate-500 text-xs font-sans mt-1">
                You cannot change your own role.
              </p>
            )}
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
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default EditEmployeeModal