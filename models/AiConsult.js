import mongoose from 'mongoose'
const { Schema } = mongoose

const AiConsultSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sintomas: { type: String, required: true },
  especie: { type: String },
  edad: { type: String },
  contexto: { type: String },
  sources: [{ type: String }],
  rawResponse: { type: String },
  parsedResponse: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['pending','reviewed','closed'], default: 'pending' },
  vetId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  vetComment: { type: String, default: null }
}, { timestamps: true })

export default mongoose.model('AiConsult', AiConsultSchema, 'aiconsults')