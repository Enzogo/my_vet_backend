require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

console.log('[MyVet] Iniciando servidor...');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas principales
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Ruta de diagnóstico
const debugRouter = require('./routes/debug');
app.use('/api/debug', debugRouter);

// Ruta de perfil (nueva)
const profileRouter = require('./routes/profile');
app.use('/api/profile', profileRouter);

// Conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('[MyVet] ERROR: Debes definir MONGO_URI en .env');
  process.exit(1);
}

const mongoHost = (MONGO_URI.split('@')[1] || '').split('/')[0];
console.log('[MyVet] Usando host de Mongo:', mongoHost);

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('[MyVet] MongoDB conectado'))
  .catch((err) => {
    console.error('[MyVet] Error conectando a MongoDB:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[MyVet] Server corriendo en puerto ${PORT}`));