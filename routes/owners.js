import { Router } from 'express'
import auth from '../middleware/auth.js'
import User from '../models/User.js'
import Mascota from '../models/Mascota.js'
import Cita from '../models/Cita.js'
import mongoose from 'mongoose'

const router = Router()

// Debug: endpoint sin autenticación
router.get('/debug/health', async (req, res) => {
  try {
    return res.json({ ok: true, msg: 'Owners router funcionando' })
  } catch (e) { return res.status(500).json({ error: 'server_error' }) }
})

// Debug: endpoint que muestra headers (requiere auth)
router.get('/debug/headers', auth, async (req, res) => {
  try {
    return res.json({
      ok: true,
      userId: req.userId,
      headers: {
        authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 20)}...` : 'MISSING',
        contentType: req.headers['content-type'],
        accept: req.headers.accept
      },
      msg: 'Auth funciona correctamente'
    })
  } catch (e) { return res.status(500).json({ error: 'server_error' }) }
})

// Debug: ver TODAS las citas en la DB (sin filtro de usuario)
router.get('/debug/allcitas', async (req, res) => {
  try {
    const citas = await Cita.find({}).limit(10).lean()
    return res.json({
      ok: true,
      total: citas.length,
      citas: citas.map(c => ({
        id: c._id.toString(),
        ownerId: c.ownerId?.toString(),
        estado: c.estado,
        motivo: c.motivo,
        fechaIso: c.fechaIso
      }))
    })
  } catch (e) { return res.status(500).json({ error: 'server_error', msg: e.message }) }
})

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
  } catch (e) { console.error('[owners] /me/profile error:', e); return res.status(500).json({ error: 'server_error' }) }
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
  } catch (e) { console.error('[owners] /me/mascotas error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Mascotas: crear
router.post('/me/mascotas', auth, async (req, res) => {
  try {
    const { nombre, especie, raza, fechaNacimiento, sexo } = req.body || {}
    if (!nombre || !especie) return res.status(400).json({ error: 'nombre y especie requeridos' })
    const doc = await Mascota.create({ ownerId: req.userId, nombre, especie, raza: raza || undefined, fechaNacimiento, sexo })
    return res.json({ id: doc._id.toString(), nombre: doc.nombre, especie: doc.especie, raza: doc.raza ?? null })
  } catch (e) { console.error('[owners] /me/mascotas POST error:', e); return res.status(500).json({ error: 'server_error' }) }
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
  } catch (e) { console.error('[owners] /me/mascotas PUT error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Mascotas: eliminar
router.delete('/me/mascotas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'mascotaId inválido' })
    const r = await Mascota.deleteOne({ _id: id, ownerId: req.userId })
    if (!r.deletedCount) return res.status(404).json({ error: 'mascota no encontrada' })
    return res.json(true)
  } catch (e) { console.error('[owners] /me/mascotas DELETE error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: listar todas
router.get('/me/citas', auth, async (req, res) => {
  try {
    const owner = await User.findById(req.userId).lean()
    const citas = await Cita.find({ ownerId: req.userId })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
      .lean()
    return res.json(citas.map(c => ({
      id: c._id.toString(),
      fechaIso: c.fechaIso,
      motivo: c.motivo,
      mascotaId: c.mascotaId?._id?.toString() ?? null,
      nombreMascota: c.mascotaId?.nombre ?? null,
      estado: c.estado ?? null,
      diagnostico: c.diagnostico || null,
      procedimientos: c.procedimientos || null,
      recomendaciones: c.recomendaciones || null,
      horaInicio: c.horaInicio || null,
      horaFin: c.horaFin || null,
      veterinarioId: c.veterinarioId?.toString() ?? null,
      veterinarioNombre: c.veterinarioNombre || null,
      duenioNombre: owner?.nombre || null,
      duenioTelefono: owner?.telefono || null,
      duenioCorreo: owner?.email || null,
      notas: c.notas || null
    })))
  } catch (e) { console.error('[owners] /me/citas error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: listar pendientes
router.get('/me/citas/pendientes', auth, async (req, res) => {
  try {
    const owner = await User.findById(req.userId).lean()
    if (!owner) {
      return res.status(404).json({ error: 'owner_not_found' })
    }
    
    const citas = await Cita.find({ ownerId: req.userId, estado: 'pendiente' })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
      .sort({ createdAt: -1 })
      .lean()
    
    const result = citas.map(c => ({
      id: c._id.toString(),
      fechaIso: c.fechaIso || '',
      motivo: c.motivo || '',
      mascotaId: c.mascotaId?._id?.toString() || null,
      nombreMascota: c.mascotaId?.nombre || 'Sin mascota',
      estado: c.estado || 'pendiente',
      diagnostico: c.diagnostico || null,
      procedimientos: c.procedimientos || null,
      recomendaciones: c.recomendaciones || null,
      horaInicio: c.horaInicio || null,
      horaFin: c.horaFin || null,
      veterinarioId: c.veterinarioId?.toString() || null,
      veterinarioNombre: c.veterinarioNombre || null,
      duenioNombre: owner?.nombre || 'Sin nombre',
      duenioTelefono: owner?.telefono || null,
      duenioCorreo: owner?.email || null,
      notas: c.notas || null
    }))
    
    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json(result)
  } catch (e) { 
    console.error('[pendientes] error:', e.message)
    return res.status(500).json({ error: 'server_error' }) 
  }
})

// Citas: listar completadas
router.get('/me/citas/completadas', auth, async (req, res) => {
  try {
    const owner = await User.findById(req.userId).lean()
    if (!owner) {
      return res.status(404).json({ error: 'owner_not_found' })
    }
    
    const citas = await Cita.find({ ownerId: req.userId, estado: 'completada' })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
      .sort({ createdAt: -1 })
      .lean()
    
    const result = citas.map(c => ({
      id: c._id.toString(),
      fechaIso: c.fechaIso || '',
      motivo: c.motivo || '',
      mascotaId: c.mascotaId?._id?.toString() || null,
      nombreMascota: c.mascotaId?.nombre || 'Sin mascota',
      estado: 'completada',
      diagnostico: c.diagnostico || null,
      procedimientos: c.procedimientos || null,
      recomendaciones: c.recomendaciones || null,
      horaInicio: c.horaInicio || null,
      horaFin: c.horaFin || null,
      veterinarioId: c.veterinarioId?.toString() || null,
      veterinarioNombre: c.veterinarioNombre || null,
      duenioNombre: owner.nombre || 'Sin nombre',
      duenioTelefono: owner.telefono || null,
      duenioCorreo: owner.email || null,
      notas: c.notas || null
    }))
    
    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json(result)
  } catch (e) { 
    console.error('[completadas] error:', e.message)
    return res.status(500).json({ error: 'server_error' }) 
  }
})

// Citas: obtener una por ID
router.get('/me/citas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'citaId inválido' })
    
    const owner = await User.findById(req.userId).lean()
    const cita = await Cita.findOne({ _id: id, ownerId: req.userId })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
      .lean()
    
    if (!cita) return res.status(404).json({ error: 'cita no encontrada' })
    
    return res.json({
      id: cita._id.toString(),
      fechaIso: cita.fechaIso,
      motivo: cita.motivo,
      mascotaId: cita.mascotaId?._id?.toString() ?? null,
      nombreMascota: cita.mascotaId?.nombre ?? null,
      estado: cita.estado,
      diagnostico: cita.diagnostico || null,
      procedimientos: cita.procedimientos || null,
      recomendaciones: cita.recomendaciones || null,
      horaInicio: cita.horaInicio || null,
      horaFin: cita.horaFin || null,
      veterinarioId: cita.veterinarioId?.toString() ?? null,
      veterinarioNombre: cita.veterinarioNombre || null,
      duenioNombre: owner?.nombre || null,
      duenioTelefono: owner?.telefono || null,
      duenioCorreo: owner?.email || null,
      notas: cita.notas || null
    })
  } catch (e) { console.error('[owners] /me/citas/:id error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: crear (versión con logging y verificación explícita)
router.post('/me/citas', auth, async (req, res) => {
  try {
    const { fechaIso, motivo, mascotaId } = req.body || {}
    if (!fechaIso || !motivo || !mascotaId) return res.status(400).json({ error: 'fechaIso, motivo, mascotaId requeridos' })
    if (!mongoose.isValidObjectId(mascotaId)) return res.status(400).json({ error: 'mascotaId inválido' })

    const mascota = await Mascota.findOne({ _id: mascotaId, ownerId: req.userId }).lean()
    if (!mascota) return res.status(404).json({ error: 'mascota no encontrada' })

    // Crear la cita (forzamos estado por seguridad)
    const doc = await Cita.create({
      ownerId: req.userId,
      mascotaId,
      fechaIso,
      motivo,
      estado: 'pendiente'
    })

    // Log básico de confirmación + estado conexión
    console.log('[owners] Cita creada (doc._id):', doc._id?.toString?.() ?? doc._id)
    console.log('[owners] Mongoose readyState:', mongoose.connection.readyState, 'DB:', mongoose.connection.name)

    // Verificación explícita: leer desde BD por id
    const found = await Cita.findById(doc._id).lean()
    if (!found) {
      console.error('[owners] ERROR: Cita creada pero NO aparece al leer por ID inmediatamente después. _id=', doc._id)
      return res.status(500).json({ error: 'server_error', details: 'Cita creada pero no encontrada en DB al verificar' })
    }

    // Respondemos con la cita encontrada (garantía de persistencia)
    return res.status(201).json({
      id: found._id.toString(),
      fechaIso: found.fechaIso,
      motivo: found.motivo,
      mascotaId: found.mascotaId.toString(),
      estado: found.estado,
      notas: found.notas || null
    })
  } catch (e) {
    console.error('[owners] error creando cita:', e)
    return res.status(500).json({ error: 'server_error', details: e.message })
  }
})

// Citas: reprogramar/editar
router.put('/me/citas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'citaId inválido' })

    const update = {}
    if (req.body?.fechaIso !== undefined) update.fechaIso = req.body.fechaIso
    if (req.body?.motivo !== undefined) update.motivo = req.body.motivo
    if (req.body?.horaInicio !== undefined) update.horaInicio = req.body.horaInicio
    if (req.body?.horaFin !== undefined) update.horaFin = req.body.horaFin
    if (req.body?.diagnostico !== undefined) update.diagnostico = req.body.diagnostico
    if (req.body?.procedimientos !== undefined) update.procedimientos = req.body.procedimientos
    if (req.body?.recomendaciones !== undefined) update.recomendaciones = req.body.recomendaciones

    if (req.body?.mascotaId !== undefined) {
      const mid = req.body.mascotaId
      if (!mongoose.isValidObjectId(mid)) return res.status(400).json({ error: 'mascotaId inválido' })
      const mascota = await Mascota.findOne({ _id: mid, ownerId: req.userId }).lean()
      if (!mascota) return res.status(404).json({ error: 'mascota no encontrada' })
      update.mascotaId = mid
    }

    const updated = await Cita.findOneAndUpdate({ _id: id, ownerId: req.userId }, { $set: update }, { new: true })
      .populate({ path: 'mascotaId', select: 'nombre' })
      .populate({ path: 'veterinarioId', select: 'nombre' })
      .lean()

    if (!updated) return res.status(404).json({ error: 'cita no encontrada' })

    const owner = await User.findById(req.userId).lean()

    return res.json({
      id: updated._id.toString(),
      fechaIso: updated.fechaIso,
      motivo: updated.motivo,
      mascotaId: updated.mascotaId?._id?.toString() ?? null,
      nombreMascota: updated.mascotaId?.nombre ?? null,
      estado: updated.estado,
      horaInicio: updated.horaInicio || null,
      horaFin: updated.horaFin || null,
      diagnostico: updated.diagnostico || null,
      procedimientos: updated.procedimientos || null,
      recomendaciones: updated.recomendaciones || null,
      veterinarioId: updated.veterinarioId?.toString() ?? null,
      veterinarioNombre: updated.veterinarioNombre || null,
      duenioNombre: owner?.nombre || null,
      duenioTelefono: owner?.telefono || null,
      duenioCorreo: owner?.email || null
    })
  } catch (e) { console.error('[owners] PUT /me/citas/:id error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Citas: eliminar
router.delete('/me/citas/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'mascotaId inválido' })
    const r = await Cita.deleteOne({ _id: id, ownerId: req.userId })
    if (!r.deletedCount) return res.status(404).json({ error: 'cita no encontrada' })
    return res.json(true)
  } catch (e) { console.error('[owners] DELETE /me/citas/:id error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Debug: verificar cita por id (temporal)
router.get('/debug/cita/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'id inválido' })
    const c = await Cita.findById(id).lean()
    return res.json({ ok: !!c, cita: c || null })
  } catch (e) { console.error('[owners] GET /debug/cita/:id error:', e); return res.status(500).json({ error: 'server_error' }) }
})

// Debug: verificar headers y token
router.get('/debug/headers', auth, async (req, res) => {
  try {
    return res.json({
      authHeader: req.headers.authorization ? 'presente' : 'ausente',
      userId: req.userId || 'sin userId',
      userRole: req.userRole || 'sin role',
      headers: {
        authorization: req.headers.authorization ? 'bearer...' : null,
        host: req.headers.host,
        contentType: req.headers['content-type']
      }
    })
  } catch (e) { console.error('[owners] GET /debug/headers error:', e); return res.status(500).json({ error: 'server_error' }) }
})

export default router