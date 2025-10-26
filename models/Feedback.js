import mongoose from 'mongoose'
const { Schema, Types } = mongoose

const FeedbackSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    sugerencia: { type: String, required: true }
  },
  { timestamps: true, collection: 'feedback' }
)

export default mongoose.model('Feedback', FeedbackSchema)
