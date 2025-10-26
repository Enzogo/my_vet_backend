import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['dueno', 'veterinario'], required: true },
    nombre: { type: String },
    telefono: { type: String },
    direccion: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);