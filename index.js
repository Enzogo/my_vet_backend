import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({
  origin: ['http://localhost:3000', 'http://10.0.2.2:3000', 'http://10.0.2.2:4000', '*'],
  credentials: false
}))
app.use(express.json())

// helper: importar dinámicamente y devolver default si existe (soporta módulos CommonJS/ESM)
async function loadRouter(path) {
  try {
    const mod = await import(path)
    return mod?.default ?? mod
  } catch (e) {
    console.error(`[index] Error cargando router '${path}':`, e)
    throw e
  }
}

try {
  // importa routers dinámicamente (soporta tanto export default como module.exports)
  const authRouter = await loadRouter('./routes/auth.js')
  const ownersRouter = await loadRouter('./routes/owners.js')
  const vetRouter = await loadRouter('./routes/vet.js')
  const feedbackRouter = await loadRouter('./routes/feedback.js')
  const profileRouter = await loadRouter('./routes/profile.js')
  const agentRouter = await loadRouter('./routes/agent.js')

  // Conexión a MongoDB
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) {
    console.error('[MyVet] ERROR: Falta MONGODB_URI en .env')
    process.exit(1)
  }

  console.log('[index] Usando MONGODB_URI:', uri.replace(/(\/\/.*:).*(@.*)/, '$1****$2')) // no imprimir credenciales completas
  await mongoose.connect(uri)
  console.log('[MyVet] MongoDB conectado a', mongoose.connection.name)

  // Healthcheck
  app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState }))

  // Montaje de rutas
  app.use('/api/auth', authRouter)
  app.use('/api/owners', ownersRouter)
  app.use('/api/vet', vetRouter)
  app.use('/api/feedback', feedbackRouter)
  app.use('/api/profile', profileRouter)

  // AI: montamos el agent en /api/ai
  app.use('/api/ai', agentRouter)

  const port = process.env.PORT || 4000
  app.listen(port, () => console.log(`[MyVet] API escuchando en http://localhost:${port}`))
} catch (e) {
  console.error('[index] Error inicializando la aplicación:', e)
  process.exit(1)
}