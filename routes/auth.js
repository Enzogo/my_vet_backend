import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esto'
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10)

function normalizeRole(input) {
  if (!input) return ''
  const r = String(input).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
  if (r === 'cliente') return 'dueno'
  if (['dueno', 'duenio', 'duenho'].includes(r)) return 'dueno'
  return r
}

function signToken(user) {
  const payload = { sub: user._id.toString(), role: user.role, email: user.email }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, role, nombre } = req.body || {}
    if (!email || !password || !role) return res.status(400).json({ message: 'Faltan campos' })
    const roleNorm = normalizeRole(role)
    if (!['dueno', 'veterinario'].includes(roleNorm)) return res.status(400).json({ message: "role debe ser 'dueno' o 'veterinario'" })

    const exists = await User.findOne({ email }).lean()
    if (exists) return res.status(409).json({ message: 'Usuario ya existe' })

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(SALT_ROUNDS))
    const user = await User.create({ email, passwordHash, role: roleNorm, nombre: nombre || '' })
    const token = signToken(user)
    return res.status(201).json({ token, user: { id: user._id.toString(), email: user.email, role: user.role, nombre: user.nombre || null } })
  } catch (e) {
    console.error('register error', e)
    return res.status(500).json({ message: 'Error interno' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ message: 'Faltan campos' })
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' })

    const token = signToken(user)
    return res.json({ token, user: { id: user._id.toString(), email: user.email, role: user.role, nombre: user.nombre || null } })
  } catch (e) {
    console.error('login error', e)
    return res.status(500).json({ message: 'Error interno' })
  }
})

export default router