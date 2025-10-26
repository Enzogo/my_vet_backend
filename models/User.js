import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['dueno', 'veterinario'], required: true },
  nombre: String,
  telefono: String,
  direccion: String,

  // Campos para veterinario
  clinicName: String,
  clinicPhone: String,
  clinicAddress: String,
  speciality: String,
  registrationNumber: String
}, { timestamps: true })

export default mongoose.model('User', UserSchema)