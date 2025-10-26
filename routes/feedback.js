import { Router } from 'express'
import auth from '../middleware/auth.js'
import Feedback from '../models/Feedback.js'

const router = Router()

router.post('/', auth, async (req, res) => {
  try {
    const { rating, sugerencia } = req.body || {}
    if (!rating) return res.status(400).json({ error: 'rating requerido' })
    const doc = await Feedback.create({ userId: req.userId, rating, sugerencia: sugerencia || '' })
    return res.status(201).json({ id: doc._id.toString(), rating: doc.rating, sugerencia: doc.sugerencia, createdAt: doc.createdAt })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

router.get('/mine', auth, async (req, res) => {
  try {
    const list = await Feedback.find({ userId: req.userId }).sort({ createdAt: -1 }).lean()
    return res.json(list.map(f => ({ id: f._id.toString(), rating: f.rating, sugerencia: f.sugerencia, createdAt: f.createdAt })))
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router