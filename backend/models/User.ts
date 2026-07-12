import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcrypt'
import { Role } from '../types' 

export interface IUser extends Document {
  employeeID: string
  firstName: string
  lastName: string
  email: string
  password: string
  department: string
  isActive: boolean
  role: Role
  mustChangePassword: boolean
  createdAt: Date
  updatedAt: Date
}


const userSchema = new Schema<IUser>({
  employeeID: { type: String, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  role: { type: String, enum: ['staff', 'hr', 'superadmin'], default: 'staff' },
  mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true })

userSchema.pre('save', async function (this: IUser) {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

export default mongoose.model<IUser>('User', userSchema)

