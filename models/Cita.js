import mongoose from 'mongoose'
const { Schema, Types } = mongoose

const CitaSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    mascotaId: { type: Types.ObjectId, ref: 'Mascota', required: true, index: true },
    fechaIso: { type: String, required: true },
    motivo: { type: String, required: true },
    estado: { type: String, default: 'pendiente' }
  },
  { timestamps: true, collection: 'citas' }
)

export default mongoose.model('Cita', CitaSchema)