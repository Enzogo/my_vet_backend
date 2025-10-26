import { Router } from 'express'
import auth from '../middleware/auth.js'
import User from '../models/User.js'
import Mascota from '../models/Mascota.js'
import Cita from '../models/Cita.js'
import mongoose from 'mongoose'

const router = Router()

// Perfil del dueño
router.post('/me/profile', auth, async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body || {}
    const update = {}
    if (typeof nombre === 'string') update.nombre = nombre
    if (typeof telefono === 'string') update.telefono = telefono
    if (typeof direccion === 'string') update.direccion = direccion
    await User.updateOne({ _id: req.userId }, { $set: update })
    return res.json(true)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Mascotas: listar propias
router.get('/me/mascotas', auth, async (req, res) => {
  try {
    const mascotas = await Mascota.find({ ownerId: req.userId }).lean()
    return res.json(mascotas.map(m => ({
      id: m._id.toString(),
      nombre: m.nombre,
      especie: m.especie,
      raza: m.raza ?? null
    })))
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Mascotas: crear
router.post('/me/mascotas', auth, async (req, res) => {
  try {
    const { nombre, especie, raza, fechaNacimiento, sexo } = req.body || {}
    if (!nombre || !especie) return res.status(400).json({ error: 'nombre y especie requeridos' })
    const doc = await Mascota.create({ ownerId: req.userId, nombre, especie, raza: raza || undefined, fechaNacimiento, sexo })
    return res.json({ id: doc._id.toString(), nombre: doc.nombre, especie: doc.especie, raza: doc.raza ?? null })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Mascotas: editar
router.put('/me/mascotas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'mascotaId inválido' })
    const update = {}
    ;['nombre','especie','raza','fechaNacimiento','sexo'].forEach(k => { if (req.body?.[k] !== undefined) update[k] = req.body[k] })
    const updated = await Mascota.findOneAndUpdate({ _id: id, ownerId: req.userId }, { $set: update }, { new: true })
    if (!updated) return res.status(404).json({ error: 'mascota no encontrada' })
    return res.json({ id: updated._id.toString(), nombre: updated.nombre, especie: updated.especie, raza: updated.raza ?? null })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Mascotas: eliminar
router.delete('/me/mascotas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'mascotaId inválido' })
    const r = await Mascota.deleteOne({ _id: id, ownerId: req.userId })
    if (!r.deletedCount) return res.status(404).json({ error: 'mascota no encontrada' })
    return res.json(true)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: listar propias
router.get('/me/citas', auth, async (req, res) => {
  try {
    const citas = await Cita.find({ ownerId: req.userId }).lean()
    return res.json(citas.map(c => ({
      id: c._id.toString(),
      fechaIso: c.fechaIso,
      motivo: c.motivo,
      mascotaId: c.mascotaId?.toString() ?? null,
      estado: c.estado ?? null
    })))
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: crear
router.post('/me/citas', auth, async (req, res) => {
  try {
    const { fechaIso, motivo, mascotaId } = req.body || {}
    if (!fechaIso || !motivo || !mascotaId) return res.status(400).json({ error: 'fechaIso, motivo, mascotaId requeridos' })
    if (!mongoose.isValidObjectId(mascotaId)) return res.status(400).json({ error: 'mascotaId inválido' })
    const mascota = await Mascota.findOne({ _id: mascotaId, ownerId: req.userId }).lean()
    if (!mascota) return res.status(404).json({ error: 'mascota no encontrada' })
    const doc = await Cita.create({ ownerId: req.userId, mascotaId, fechaIso, motivo })
    return res.json({ id: doc._id.toString(), fechaIso: doc.fechaIso, motivo: doc.motivo, mascotaId: doc.mascotaId.toString(), estado: doc.estado })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: reprogramar/editar
router.put('/me/citas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'citaId inválido' })
    const update = {}
    if (req.body?.fechaIso !== undefined) update.fechaIso = req.body.fechaIso
    if (req.body?.motivo !== undefined) update.motivo = req.body.motivo
    if (req.body?.mascotaId !== undefined) {
      const mid = req.body.mascotaId
      if (!mongoose.isValidObjectId(mid)) return res.status(400).json({ error: 'mascotaId inválido' })
      const mascota = await Mascota.findOne({ _id: mid, ownerId: req.userId }).lean()
      if (!mascota) return res.status(404).json({ error: 'mascota no encontrada' })
      update.mascotaId = mid
    }
    const updated = await Cita.findOneAndUpdate({ _id: id, ownerId: req.userId }, { $set: update }, { new: true })
    if (!updated) return res.status(404).json({ error: 'cita no encontrada' })
    return res.json({ id: updated._id.toString(), fechaIso: updated.fechaIso, motivo: updated.motivo, mascotaId: updated.mascotaId.toString(), estado: updated.estado })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: eliminar
router.delete('/me/citas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'citaId inválido' })
    const r = await Cita.deleteOne({ _id: id, ownerId: req.userId })
    if (!r.deletedCount) return res.status(404).json({ error: 'cita no encontrada' })
    return res.json(true)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

export default router