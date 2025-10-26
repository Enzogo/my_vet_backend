import { Router } from 'express'
import auth from '../middleware/auth.js'
import Feedback from '../models/Feedback.js'

const router = Router()

// Create feedback (authenticated users)
router.post('/', auth, async (req, res) => {
  try {
    const { rating, sugerencia } = req.body || {}
    
    if (!rating || !sugerencia) {
      return res.status(400).json({ error: 'rating y sugerencia requeridos' })
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating debe estar entre 1 y 5' })
    }

    const doc = await Feedback.create({
      userId: req.userId,
      rating: parseInt(rating, 10),
      sugerencia
    })
    
    return res.json({
      id: doc._id.toString(),
      rating: doc.rating,
      sugerencia: doc.sugerencia,
      createdAt: doc.createdAt
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Get own feedback
router.get('/mine', auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.userId }).lean()
    const out = feedbacks.map(f => ({
      id: f._id.toString(),
      rating: f.rating,
      sugerencia: f.sugerencia,
      createdAt: f.createdAt
    }))
    return res.json(out)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Get all feedback (optional - for admin/vet)
router.get('/', auth, async (req, res) => {
  try {
    // Optional: could add role check here
    const feedbacks = await Feedback.find()
      .populate('userId', 'nombre email')
      .lean()
    const out = feedbacks.map(f => ({
      id: f._id.toString(),
      rating: f.rating,
      sugerencia: f.sugerencia,
      userName: f.userId?.nombre || f.userId?.email || null,
      createdAt: f.createdAt
    }))
    return res.json(out)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router
