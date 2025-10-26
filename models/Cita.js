import mongoose from 'mongoose'

const CitaSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  mascotaId: { type: mongoose.Types.ObjectId, ref: 'Mascota', required: true },
  fechaIso: { type: String, required: true }, // "dd/MM/yyyy HH:mm" o ISO string según tu app
  motivo: { type: String },
  estado: { type: String, enum: ['pendiente', 'en_curso', 'hecha'], default: 'pendiente' },
  notas: { type: String }
}, { timestamps: true })

export default mongoose.model('Cita', CitaSchema)