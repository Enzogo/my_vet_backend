import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Rutas
app.use('/auth', authRouter); // => POST /auth/register y POST /auth/login

// Conexión a Mongo
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/my_vet';

mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB conectado');
    app.listen(PORT, () => {
      console.log(`API escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });