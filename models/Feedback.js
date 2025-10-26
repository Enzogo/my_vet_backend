import mongoose from 'mongoose'

const FeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  sugerencia: { type: String, default: '' }
}, { timestamps: true })

export default mongoose.model('Feedback', FeedbackSchema) //collection 'feedbacks'