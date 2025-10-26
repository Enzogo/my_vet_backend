import mongoose from 'mongoose'
const { Schema, Types } = mongoose

const MascotaSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    nombre: { type: String, required: true },
    especie: { type: String, required: true },
    raza: { type: String },
    fechaNacimiento: { type: String },
    sexo: { type: String }
  },
  { timestamps: true, collection: 'mascotas' }
)

export default mongoose.model('Mascota', MascotaSchema)