const mongoose = require('mongoose');
const { Schema } = mongoose;

const duenoSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nombre: { type: String },
    telefono: { type: String },
    direccion: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dueno', duenoSchema, 'duenos');