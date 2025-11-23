import 'dotenv/config.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRouter from './routes/auth.js';
import debugRouter from './routes/debug.js';
import profileRouter from './routes/profile.js';
import ownersRouter from './routes/owners.js';
import vetRouter from './routes/vet.js';

console.log('[MyVet] Iniciando servidor...');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/auth', authRouter);
app.use('/api/debug', debugRouter);
app.use('/api/profile', profileRouter);
app.use('/api/owners', ownersRouter);
app.use('/api/vet', vetRouter);

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