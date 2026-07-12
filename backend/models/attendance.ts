import mongoose, { Schema, Document } from 'mongoose'

export interface IAttendance extends Document {
  user: mongoose.Types.ObjectId
  clockIn: Date
  clockOut?: Date
  date: Date
  status: 'present' | 'late' | 'absent'
  notes?: string
  sessionStatus: 'open' | 'closed'
  hoursWorked: number
}

const attendanceSchema = new Schema<IAttendance>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clockIn: { type: Date, required: true },
  clockOut: { type: Date },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  notes: { type: String },
  sessionStatus: { type: String, enum: ['open', 'closed'], default: 'open' },
  hoursWorked: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.model<IAttendance>('Attendance', attendanceSchema)