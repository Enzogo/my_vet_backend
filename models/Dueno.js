import mongoose from 'mongoose'
const { Schema } = mongoose

const duenoSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nombre: { type: String },
    telefono: { type: String },
    direccion: { type: String },
  },
  { timestamps: true }
)

export default mongoose.model('Dueno', duenoSchema, 'duenos')