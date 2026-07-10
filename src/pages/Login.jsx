import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { login as saveAuth } from '../utils/auth'
import MeridianArt from '../assets/meridian.svg'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')


    if (!email || !password) {
      setError('Please enter both your email and password.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })


      const { token, user } = response.data
    
      saveAuth(token, user)
     

// New / reset accounts must set their own password 
if (user.mustChangePassword) {
  navigate('/set-password')
  return
}

if (user.role === 'hr') {
  navigate('/hr-dashboard')
} else if (user.role === 'superadmin') {
  navigate('/superadmin-dashboard')
} else {
  navigate('/dashboard')
}
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Login failed. Please try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">

      {/* ─────────────────────────────────────────
          LEFT PANEL — Brand / visual side
          Hidden on mobile, 45% width on desktop
      ───────────────────────────────────────── */}
      <div
        className="
          hidden md:flex w-[45%] min-h-screen
          bg-slate-900
          flex-col
          items-center
          justify-center
          px-12
          relative
          overflow-hidden
        "
      >
        {/* Subtle radial glow behind SVG — pure Tailwind, no custom CSS */}
        <div className="absolute w-72 h-72 rounded-full bg-yellow-500 opacity-5 blur-3xl top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        {/* SVG Art */}
        <div className="w-48 h-48 mb-10 opacity-90">
          <img
            src={MeridianArt}
            alt="AttendPro visual"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl font-bold tracking-tight text-yellow-500 mb-3 font-serif">
          AttendPro
        </h1>

        {/* Tagline */}
        <p className="text-sm text-stone-50 opacity-50 tracking-widest uppercase font-sans">
          Employee Attendance System
        </p>

        {/* Bottom decorative gold rule */}
        <div className="absolute bottom-10 left-12 right-12 h-px bg-yellow-500 opacity-20" />

        {/* Corner accent top-right */}
        <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-yellow-500 opacity-30 rounded-tr-sm" />

        {/* Corner accent bottom-left */}
        <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-yellow-500 opacity-30 rounded-bl-sm" />
      </div>

      {/* ─────────────────────────────────────────
          RIGHT PANEL
          Full width on mobile, 55% on desktop
          Warm off-white background
          Form lives here
      ───────────────────────────────────────── */}
      <div
        className="
          flex-1
          min-h-screen
          bg-stone-50
          flex
          flex-col
          justify-center
          px-8 sm:px-16 lg:px-24
          relative
        "
      >
        {/* Mobile-only brand header (left panel is hidden on mobile) */}
        <div className="flex md:hidden items-center gap-2 mb-10">
          <span className="text-2xl font-bold text-slate-900 font-serif">
            AttendPro
          </span>
          <span className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-sans">
            / Attendance
          </span>
        </div>

        {/* Form container — max width keeps it readable on large screens */}
        <div className="w-full max-w-sm">

          {/* Heading */}
          <h2 className="text-3xl font-bold text-slate-900 mb-2 leading-tight font-serif">
            Welcome back.
          </h2>

          {/* Subheading */}
          <p className="text-sm text-slate-400 mb-8 font-sans">
            Sign in to continue to your workspace.
          </p>

          {/* Gold accent rule under heading */}
          <div className="w-10 h-0.5 bg-yellow-500 mb-8" />

          {/* ── ERROR BAR ── */}
          {error && (
            <div
              className="
                flex items-start gap-3
                bg-red-50 border border-red-200
                text-red-700 text-sm
                px-4 py-3 rounded-lg mb-6
                font-sans
              "
            >
              {/* Warning icon */}
              <svg
                className="w-4 h-4 mt-0.5 shrink-0 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                />
              </svg>
              {error}
            </div>
          )}

          {/* ── FORM ── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-900 uppercase tracking-widest mb-2 font-sans"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
                className="
                  w-full px-4 py-3
                  bg-stone-100
                  border border-stone-300
                  rounded-lg text-sm text-slate-900
                  placeholder-slate-400
                  font-sans
                  focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition duration-150
                "
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-900 uppercase tracking-widest mb-2 font-sans"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="
                    w-full px-4 py-3 pr-11
                    bg-stone-100
                    border border-stone-300
                    rounded-lg text-sm text-slate-900
                    placeholder-slate-400
                    font-sans
                    focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition duration-150
                  "
                />

                {/* Show / hide password toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    text-slate-400 hover:text-slate-900
                    transition duration-150
                    focus:outline-none
                  "
                  tabIndex={-1}
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                bg-slate-900 hover:bg-yellow-500
                text-stone-50 hover:text-slate-900
                font-semibold text-sm
                py-3 rounded-lg
                transition duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                mt-2
                font-sans
              "
            >
              {loading ? (
                <>
                  {/* Spinner */}
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-8 sm:left-16 lg:left-24 text-xs text-slate-400 font-sans">
          © 2026 AttendPro. All rights reserved.
        </div>
      </div>
    </div>
  )
}

export default Login