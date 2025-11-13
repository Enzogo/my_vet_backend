import express from 'express'
import auth from '../middleware/auth.js'
import AiConsult from '../models/AiConsult.js'
import * as embeddingUtil from '../ai/embeddings.js'
import { OpenAIApi, Configuration } from 'openai'
import path from 'path'
import requireRole from '../middleware/requireRole.js'

const router = express.Router()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
const DATA_DIR = path.resolve(process.cwd(), 'data', 'vet')

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }))

let indexed = false
async function ensureIndex() {
  if (indexed) return
  await embeddingUtil.indexDirectory(DATA_DIR)
  indexed = true
}

// POST /api/ai/agent - dueño crea consulta prediagnóstica
router.post('/agent', auth, async (req, res) => {
  try {
    const { sintomas, especie, edad, contexto } = req.body || {}
    if (!sintomas) return res.status(400).json({ error: 'sintomas requerido' })

    await ensureIndex()
    const qEmb = await embeddingUtil.embedText(sintomas)
    const top = embeddingUtil.findTopK(qEmb, 4)

    const evidence = top.map(t => `SOURCE:${t.id}\n${t.text}`).join('\n\n---\n\n')
    const sources = top.map(t => t.id)

    const system = `Eres un asistente veterinario orientativo. Usa SOLO la EVIDENCIA proveída para generar recomendaciones orientativas y banderas rojas. Responde en JSON EXACTO con propiedades:
recomendaciones (string), red_flags (string|null), confidence ("alta"|"media"|"baja"), fuentes (array de strings), disclaimer (string).
Nunca inventes fuentes; si la información es insuficiente indica incertidumbre.`

    const user = `
Sintomas: ${sintomas}
Especie: ${especie ?? 'N/D'}
Edad: ${edad ?? 'N/D'}
Contexto adicional: ${contexto ?? 'N/A'}

EVIDENCIA:
${evidence}
`

    const chatResp = await openai.createChatCompletion({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 700,
      temperature: 0.1
    })

    const text = chatResp.data.choices?.[0]?.message?.content || ''
    let parsed = null
    try {
      const match = text.match(/\{[\s\S]*\}$/)
      if (match) parsed = JSON.parse(match[0])
    } catch (e) {
      parsed = null
    }

    const doc = await AiConsult.create({
      userId: req.userId,
      sintomas,
      especie,
      edad,
      contexto,
      sources,
      rawResponse: text,
      parsedResponse: parsed,
      status: 'pending'
    })

    return res.json({ ok: true, consultId: doc._id.toString(), parsed, raw: text })
  } catch (e) {
    console.error('AI agent error', e)
    return res.status(500).json({ error: 'server_error', details: e.message })
  }
})

// Veterinario endpoints
router.get('/consultations', auth, requireRole('veterinario'), async (req, res) => {
  try {
    const list = await AiConsult.find({}).sort({ createdAt: -1 }).populate('userId', 'email nombre').lean()
    return res.json(list)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

router.get('/consultations/:id', auth, requireRole('veterinario'), async (req, res) => {
  try {
    const { id } = req.params
    const c = await AiConsult.findById(id).populate('userId', 'email nombre').lean()
    if (!c) return res.status(404).json({ error: 'not_found' })
    return res.json(c)
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

router.post('/consultations/:id/review', auth, requireRole('veterinario'), async (req, res) => {
  try {
    const { id } = req.params
    const { vetComment, status = 'reviewed' } = req.body || {}
    const updated = await AiConsult.findByIdAndUpdate(id, { vetId: req.userId, vetComment, status }, { new: true })
    if (!updated) return res.status(404).json({ error: 'not_found' })
    return res.json({ ok: true })
  } catch (e) { console.error(e); return res.status(500).json({ error: 'server_error' }) }
})

export default router