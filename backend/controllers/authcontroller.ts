import { Request, Response } from 'express'
import User from '../models/User'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and Password required' })
      return
    }

    const user = await User.findOne({ email })

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account deactivated' })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid Password' })
      return
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    )

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ message: 'Login failed', error: err.message })
  }
}