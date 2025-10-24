import { Router } from 'express'
import auth from '../middleware/auth.js'
import User from '../models/User.js'
import Mascota from '../models/Mascota.js'
import Cita from '../models/Cita.js'

const router = Router()

router.use(auth, (req, res, next) => {
  if (req.userRole !== 'veterinario') return res.status(403).json({ error: 'Solo veterinarios' })
  next()
})

router.get('/owners', async (_req, res) => {
  try {
    const owners = await User.find({ role: 'dueno' }, { nombre: 1, email: 1 }).lean()
    return res.json(owners.map(o => ({
      id: o._id.toString(),
      nombre: o.nombre ?? null,
      email: o.email ?? null
    })))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.get('/mascotas', async (_req, res) => {
  try {
    const mascotas = await Mascota.find().populate('ownerId', 'nombre email').lean()
    return res.json(mascotas.map(m => ({
      id: m._id.toString(),
      nombre: m.nombre ?? null,
      especie: m.especie ?? null,
      duenioNombre: m.ownerId?.nombre ?? m.ownerId?.email ?? null
    })))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.get('/citas', async (_req, res) => {
  try {
    const citas = await Cita.find()
      .populate('mascotaId', 'nombre')
      .populate('ownerId', 'nombre email')
      .lean()
    return res.json(citas.map(c => ({
      id: c._id.toString(),
      fecha: c.fechaIso ?? null,
      estado: c.estado ?? null,
      duenioNombre: c.ownerId?.nombre ?? c.ownerId?.email ?? null,
      mascotaNombre: c.mascotaId?.nombre ?? null
    })))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router