// The three roles in AttendPro — must be exactly one of these three strings, nothing else
export type Role = 'staff' | 'hr' | 'superadmin'

// A session can only be open or closed
export type SessionStatus = 'open' | 'closed'

// Attendance status options
export type AttendanceStatus = 'present' | 'late' | 'absent'

// The user object stored in localStorage after login
// This is what getCurrentUser() returns
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  mustChangePassword: boolean
  employeeID?: string        // optional — not always present
  department?: string        // optional — not always present
}

// A full user object from the /users endpoint (superadmin sees these)
export interface StaffUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: Role
  employeeID: string
  isActive: boolean
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

// One attendance record from the API
export interface AttendanceRecord {
  _id: string
  user: StaffUser | null     // null means the employee was deleted — show "Former Employee"
  clockIn: string            // ISO date string
  clockOut?: string          // optional — open sessions have no clockOut yet
  date: string               // ISO date string
  status: AttendanceStatus
  sessionStatus: SessionStatus
  hoursWorked: number
  notes?: string
  autoClosedOut?: boolean    // backend flag for auto clock-out
  alertDismissed?: boolean   // backend flag for dismissed alert
}

// What the login API sends back on success
export interface LoginResponse {
  success: boolean
  token: string
  user: AuthUser
}

// What the API sends back when creating a new staff member
export interface CreateUserResponse {
  success: boolean
  data: StaffUser
  tempPassword: string
}

// Pagination info the /users endpoint returns
export interface Pagination {
  currentPage: number
  totalPages: number
  totalUsers: number
}

// The full /users response shape
export interface UsersResponse {
  success: boolean
  data: StaffUser[]
  pagination: Pagination
}

// Chart data point — used in HoursChart and SessionsChart
export interface ChartDataPoint {
  day: string
  hours: number
}

// Sessions chart data point
export interface SessionChartPoint {
  name: string
  value: number
}

// KpiCard color options
export type ColorScheme = 'blue' | 'gold' | 'green' | 'red'