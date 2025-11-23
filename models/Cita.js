import mongoose from 'mongoose'
const { Schema } = mongoose

const CitaSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mascotaId: { type: Schema.Types.ObjectId, ref: 'Mascota', required: true },
  veterinarioId: { type: Schema.Types.ObjectId, ref: 'User' },
  fechaIso: { type: String, required: true },
  motivo: { type: String, required: true },
  estado: { type: String, enum: ['pendiente', 'en_curso', 'completada', 'cancelada'], default: 'pendiente' },
  
  // Datos del veterinario
  veterinarioNombre: { type: String },
  
  // Ficha médica
  diagnostico: { type: String },
  procedimientos: { type: String },
  recomendaciones: { type: String },
  
  // Horarios
  horaInicio: { type: String },
  horaFin: { type: String },
  
  // Notas generales
  notas: { type: String, default: '' },
  createdNotificationSent: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Cita', CitaSchema, 'citas')