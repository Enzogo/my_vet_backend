import mongoose from 'mongoose'
const { Schema } = mongoose

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['dueno', 'veterinario'], required: true },
  nombre: { type: String, default: '' },
  telefono: { type: String },
  direccion: { type: String }
}, { timestamps: true })

export default mongoose.model('User', UserSchema) // colección: users