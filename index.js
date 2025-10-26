import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import ownersRouter from './routes/owners.js'
import vetRouter from './routes/vet.js'
import authRouter from './routes/auth.js'
import aiRouter from './routes/ai.js'
import feedbackRouter from './routes/feedback.js'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({
  origin: ['http://localhost:3000', 'http://10.0.2.2:3000', 'http://10.0.2.2:4000', '*'],
  credentials: false
}))
app.use(express.json())

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Falta MONGODB_URI en .env')
  process.exit(1)
}

await mongoose.connect(uri)
console.log('MongoDB conectado a', mongoose.connection.name)

// Salud
app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState }))

// Rutas
app.use('/api/auth', authRouter)
app.use('/api/owners', ownersRouter)
app.use('/api/vet', vetRouter)
app.use('/api/ai', aiRouter)
app.use('/api/feedback', feedbackRouter)

// Manejador de errores
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err)
  res.status(500).json({ error: 'server_error' })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`))