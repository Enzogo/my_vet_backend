import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import ownersRouter from './routes/owners.js'
import vetRouter from './routes/vet.js'
import authRouter from './routes/auth.js' 

const app = express()
app.use(cors())
app.use(express.json())

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Falta MONGODB_URI en .env')
  process.exit(1)
}

await mongoose.connect(uri)
console.log('MongoDB conectado')

// Rutas montadas
app.use('/api/auth', authRouter)  
app.use('/api/owners', ownersRouter)
app.use('/api/vet', vetRouter)

app.get('/api/health', (_, res) => res.json({ ok: true }))

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`))