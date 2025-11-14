import mongoose from 'mongoose'
const { Schema } = mongoose

const CitaSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mascotaId: { type: Schema.Types.ObjectId, ref: 'Mascota', required: true },
  fechaIso: { type: String, required: true }, // ISO string preferible
  motivo: { type: String, required: true },
  estado: { type: String, enum: ['pendiente', 'en_curso', 'hecha', 'cancelada'], default: 'pendiente' },
  notas: { type: String, default: '' },
  createdNotificationSent: { type: Boolean, default: false } // para evitar notificaciones duplicadas
}, { timestamps: true })

export default mongoose.model('Cita', CitaSchema, 'citas')