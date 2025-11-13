import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import authRouter from './routes/auth.js'
import ownersRouter from './routes/owners.js'
import vetRouter from './routes/vet.js'
import feedbackRouter from './routes/feedback.js'
import profileRouter from './routes/profile.js'
import agentRouter from './routes/agent.js'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({
  origin: ['http://localhost:3000', 'http://10.0.2.2:3000', 'http://10.0.2.2:4000', '*'],
  credentials: false
}))
app.use(express.json())

const uri = process.env.MONGODB_URI || process.env.MONGO_URI
if (!uri) {
  console.error('Falta MONGODB_URI en .env')
  process.exit(1)
}

await mongoose.connect(uri)
console.log('MongoDB conectado a', mongoose.connection.name)

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState }))

// montar routers
app.use('/api/auth', authRouter)
app.use('/api/owners', ownersRouter)
app.use('/api/vet', vetRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/profile', profileRouter)

// montar el nuevo agent en /api/ai
app.use('/api/ai', agentRouter)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`))