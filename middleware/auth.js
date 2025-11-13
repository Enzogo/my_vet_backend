import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export default async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (!token) return res.status(401).json({ error: 'No token' })

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.sub
    req.userRole = payload.role

    const user = await User.findById(req.userId).lean()
    if (!user) return res.status(401).json({ error: 'Usuario no existe' })

    req.user = user

    next()
  } catch (_e) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}