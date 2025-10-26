import mongoose from 'mongoose'
const { Schema, Types } = mongoose

const FeedbackSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  sugerencia: { type: String, default: '' }
}, { timestamps: true, collection: 'feedback' })

export default mongoose.model('Feedback', FeedbackSchema) // colección: feedback