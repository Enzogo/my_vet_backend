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
      .populate({ path: 'ownerId', select: 'nombre email telefono' })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
      .lean()
    
    const out = citas.map(c => ({
      id: c._id.toString(),
      fechaIso: c.fechaIso,
      motivo: c.motivo,
      estado: c.estado || 'pendiente',
      mascotaId: c.mascotaId?._id?.toString() ?? null,
      mascotaNombre: c.mascotaId?.nombre || null,
      ownerId: c.ownerId?._id?.toString() ?? null,
      duenioNombre: c.ownerId?.nombre || c.ownerId?.email || null,
      duenioTelefono: c.ownerId?.telefono || null,
      duenioCorreo: c.ownerId?.email || null,
      veterinarioId: c.veterinarioId?.toString() ?? null,
      veterinarioNombre: c.veterinarioNombre || null,
      diagnostico: c.diagnostico || null,
      procedimientos: c.procedimientos || null,
      recomendaciones: c.recomendaciones || null,
      horaInicio: c.horaInicio || null,
      horaFin: c.horaFin || null,
      notas: c.notas || null
    }))
    
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
    const { estado, notas, diagnostico, procedimientos, recomendaciones, horaInicio, horaFin } = req.body || {}
    const set = {}
    
    // Estado
    if (typeof estado === 'string' && ['pendiente', 'en_curso', 'completada', 'cancelada'].includes(estado)) {
      set.estado = estado
    }
    
    // Notas generales
    if (typeof notas === 'string') set.notas = notas
    
    // Ficha médica
    if (typeof diagnostico === 'string') set.diagnostico = diagnostico
    if (typeof procedimientos === 'string') set.procedimientos = procedimientos
    if (typeof recomendaciones === 'string') set.recomendaciones = recomendaciones
    
    // Horarios
    if (typeof horaInicio === 'string') set.horaInicio = horaInicio
    if (typeof horaFin === 'string') set.horaFin = horaFin

    const updated = await Cita.findByIdAndUpdate(id, { $set: set }, { new: true })
      .populate({ path: 'ownerId', select: 'nombre email telefono' })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
    
    if (!updated) return res.status(404).json({ error: 'no_encontrada' })

    return res.json({
      id: updated._id.toString(),
      fechaIso: updated.fechaIso,
      motivo: updated.motivo,
      estado: updated.estado,
      mascotaId: updated.mascotaId?._id?.toString() ?? null,
      mascotaNombre: updated.mascotaId?.nombre ?? null,
      ownerId: updated.ownerId?._id?.toString() ?? null,
      duenioNombre: updated.ownerId?.nombre || updated.ownerId?.email || null,
      duenioTelefono: updated.ownerId?.telefono || null,
      duenioCorreo: updated.ownerId?.email || null,
      veterinarioId: updated.veterinarioId?.toString() ?? null,
      veterinarioNombre: updated.veterinarioNombre || null,
      diagnostico: updated.diagnostico || null,
      procedimientos: updated.procedimientos || null,
      recomendaciones: updated.recomendaciones || null,
      horaInicio: updated.horaInicio || null,
      horaFin: updated.horaFin || null,
      notas: updated.notas || null
    })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

export default router