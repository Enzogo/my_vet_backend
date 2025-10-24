const mongoose = require('mongoose');
const { Schema } = mongoose;

const veterinarioSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nombre: { type: String },
    especialidad: { type: String },
    licencia: { type: String },
    clinica: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Veterinario', veterinarioSchema, 'veterinarios');