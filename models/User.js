import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['dueno', 'veterinario'], required: true },
    nombre: { type: String },
    telefono: { type: String },
    direccion: { type: String }
  },
  { timestamps: true, collection: 'users' } // única colección para usuarios (como en tu imagen)
)

export default mongoose.model('User', UserSchema)