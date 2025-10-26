import { Router } from 'express'
import auth from '../middleware/auth.js'
import User from '../models/User.js'
import Cita from '../models/Cita.js'
import Mascota from '../models/Mascota.js'

const router = Router()

function ensureVet(req, _res, next) {
  const role = req.userRole || req.user?.role
  if (role === 'veterinario') return next()
  return _res.status(403).json({ error: 'solo_veterinarios' })
}

router.use(auth, ensureVet)

// NUEVO: devolver perfil del veterinario autenticado
router.get('/me', async (req, res) => {
  try {
    const u = await User.findById(req.userId).select('email nombre telefono direccion clinicName clinicPhone clinicAddress speciality registrationNumber')
    if (!u) return res.status(404).json({ error: 'no_encontrado' })
    return res.json({
      email: u.email,
      nombre: u.nombre || null,
      telefono: u.telefono || null,
      direccion: u.direccion || null,
      clinicName: u.clinicName || null,
      clinicPhone: u.clinicPhone || null,
      clinicAddress: u.clinicAddress || null,
      speciality: u.speciality || null,
      registrationNumber: u.registrationNumber || null
    })
  } catch (e) {
    console.error('GET /api/vet/me error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Ya existentes (si no los tienes, agrégalos):
router.get('/owners', async (_req, res) => {
  try {
    const owners = await User.find({ role: 'dueno' }).select('_id nombre email')
    return res.json(owners.map(u => ({ id: u._id.toString(), nombre: u.nombre || null, email: u.email })))
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

router.get('/mascotas', async (_req, res) => {
  try {
    const mascotas = await Mascota.find({}).select('_id nombre especie ownerId').populate({ path: 'ownerId', select: 'nombre email' })
    return res.json(mascotas.map(m => ({
      id: m._id.toString(),
      nombre: m.nombre || null,
      especie: m.especie || null,
      duenioNombre: m.ownerId?.nombre || m.ownerId?.email || null,
      ownerId: m.ownerId?._id?.toString() || null
    })))
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

router.get('/citas', async (_req, res) => {
  try {
    const citas = await Cita.find({})
      .sort({ createdAt: -1 })
      .populate({ path: 'ownerId', select: 'nombre email' })
      .populate({ path: 'mascotaId', select: 'nombre ownerId' })
    const out = citas.map(c => {
      const duenio = c.ownerId || c.mascotaId?.ownerId
      return {
        id: c._id.toString(),
        fecha: c.fechaIso || c.fecha || null,
        estado: c.estado || 'pendiente',
        motivo: c.motivo || null,
        duenioNombre: duenio?.nombre || duenio?.email || null,
        mascotaNombre: c.mascotaId?.nombre || null,
        notas: c.notas || null
      }
    })
    return res.json(out)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

router.post('/me/profile', async (req, res) => {
  try {
    const { nombre, telefono, direccion, clinicName, clinicPhone, clinicAddress, speciality, registrationNumber } = req.body || {}
    const set = {}
    if (typeof nombre === 'string') set.nombre = nombre
    if (typeof telefono === 'string') set.telefono = telefono
    if (typeof direccion === 'string') set.direccion = direccion
    if (typeof clinicName === 'string') set.clinicName = clinicName
    if (typeof clinicPhone === 'string') set.clinicPhone = clinicPhone
    if (typeof clinicAddress === 'string') set.clinicAddress = clinicAddress
    if (typeof speciality === 'string') set.speciality = speciality
    if (typeof registrationNumber === 'string') set.registrationNumber = registrationNumber

    await User.updateOne({ _id: req.userId }, { $set: set })
    return res.json(true)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

router.patch('/citas/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { estado, notas } = req.body || {}
    const set = {}
    if (typeof estado === 'string' && ['pendiente', 'en_curso', 'hecha'].includes(estado)) set.estado = estado
    if (typeof notas === 'string') set.notas = notas

    const updated = await Cita.findByIdAndUpdate(id, { $set: set }, { new: true })
      .populate({ path: 'ownerId', select: 'nombre email' })
      .populate({ path: 'mascotaId', select: 'nombre ownerId' })
    if (!updated) return res.status(404).json({ error: 'no_encontrada' })

    const duenio = updated.ownerId || updated.mascotaId?.ownerId
    return res.json({
      id: updated._id.toString(),
      fecha: updated.fechaIso || updated.fecha || null,
      estado: updated.estado || 'pendiente',
      motivo: updated.motivo || null,
      duenioNombre: duenio?.nombre || duenio?.email || null,
      mascotaNombre: updated.mascotaId?.nombre || null,
      notas: updated.notas || null
    })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

export default router