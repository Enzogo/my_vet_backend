import { Router } from 'express'
import auth from '../middleware/auth.js'
import User from '../models/User.js'
import Mascota from '../models/Mascota.js'
import Cita from '../models/Cita.js'
import mongoose from 'mongoose'

const router = Router()

router.post('/me/profile', auth, async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body || {}
    const update = {}
    if (typeof nombre === 'string') update.nombre = nombre
    if (typeof telefono === 'string') update.telefono = telefono
    if (typeof direccion === 'string') update.direccion = direccion

    await User.updateOne({ _id: req.userId }, { $set: update })
    return res.json(true)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.get('/me/mascotas', auth, async (req, res) => {
  try {
    const mascotas = await Mascota.find({ ownerId: req.userId }).lean()
    const out = mascotas.map(m => ({
      id: m._id.toString(),
      nombre: m.nombre,
      especie: m.especie,
      raza: m.raza ?? null
    }))
    return res.json(out)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.post('/me/mascotas', auth, async (req, res) => {
  try {
    const { nombre, especie, raza, fechaNacimiento, sexo } = req.body || {}
    if (!nombre || !especie) return res.status(400).json({ error: 'nombre y especie requeridos' })

    const doc = await Mascota.create({
      ownerId: req.userId,
      nombre,
      especie,
      raza: raza || undefined,
      fechaNacimiento: fechaNacimiento || undefined,
      sexo: sexo || undefined
    })
    return res.json({
      id: doc._id.toString(),
      nombre: doc.nombre,
      especie: doc.especie,
      raza: doc.raza ?? null
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.get('/me/citas', auth, async (req, res) => {
  try {
    const citas = await Cita.find({ ownerId: req.userId }).lean()
    const out = citas.map(c => ({
      id: c._id.toString(),
      fechaIso: c.fechaIso,
      motivo: c.motivo,
      mascotaId: c.mascotaId?.toString() ?? null,
      estado: c.estado ?? null
    }))
    return res.json(out)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.post('/me/citas', auth, async (req, res) => {
  try {
    const { fechaIso, motivo, mascotaId } = req.body || {}
    if (!fechaIso || !motivo || !mascotaId) {
      return res.status(400).json({ error: 'fechaIso, motivo, mascotaId requeridos' })
    }
    if (!mongoose.isValidObjectId(mascotaId)) {
      return res.status(400).json({ error: 'mascotaId inválido' })
    }
    const mascota = await Mascota.findOne({ _id: mascotaId, ownerId: req.userId }).lean()
    if (!mascota) return res.status(404).json({ error: 'mascota no encontrada' })

    const doc = await Cita.create({
      ownerId: req.userId,
      mascotaId,
      fechaIso,
      motivo
    })
    return res.json({
      id: doc._id.toString(),
      fechaIso: doc.fechaIso,
      motivo: doc.motivo,
      mascotaId: doc.mascotaId.toString(),
      estado: doc.estado
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router