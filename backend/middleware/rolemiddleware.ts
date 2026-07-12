import { Request, Response, NextFunction } from 'express'

const authorizeRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ message: 'The user does not exist, Pls log in' })
      return
    }

    if (allowedRoles.includes(req.user.role)) {
      next()
    } else {
      res.status(403).json({ message: 'Access Denied' })
    }
  }
}

export default authorizeRole