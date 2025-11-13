import mongoose from 'mongoose'
const { Schema } = mongoose

const veterinarioSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nombre: { type: String },
    especialidad: { type: String },
    licencia: { type: String },
    clinica: { type: String },
  },
  { timestamps: true }
)

export default mongoose.model('Veterinario', veterinarioSchema, 'veterinarios')