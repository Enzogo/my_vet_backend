import { Router } from 'express'
import auth from '../middleware/auth.js'
import Feedback from '../models/Feedback.js'

const router = Router()

// Crear feedback (requiere login)
router.post('/', auth, async (req, res) => {
  try {
    const { rating, sugerencia } = req.body || {}
    const r = Number(rating)
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'rating_invalido' })
    }
    await Feedback.create({
      userId: req.userId,
      rating: r,
      sugerencia: typeof sugerencia === 'string' ? sugerencia : ''
    })
    // cuerpo libre; la app acepta 200/201 sin body
    return res.status(201).end()
  } catch (e) {
    console.error('POST /api/feedback error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Mis feedbacks
router.get('/mine', auth, async (req, res) => {
  try {
    const docs = await Feedback.find({ userId: req.userId }).sort({ createdAt: -1 })
    return res.json(docs.map(d => ({
      id: d._id.toString(),
      rating: d.rating,
      sugerencia: d.sugerencia || '',
      createdAt: d.createdAt
    })))
  } catch (e) {
    console.error('GET /api/feedback/mine error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Resumen global (promedio y cantidad)
router.get('/summary', async (_req, res) => {
  try {
    const agg = await Feedback.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ])
    const { avg = 0, count = 0 } = agg[0] || {}
    return res.json({ avg, count })
  } catch (e) {
    console.error('GET /api/feedback/summary error:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router