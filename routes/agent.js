// backend_myvet/routes/agent.js
import express from 'express'
import auth from '../middleware/auth.js'
import AiConsult from '../models/AiConsult.js'
import * as embeddingUtil from '../ai/embeddings.js'
import { generateFallback } from '../ai/fallback.js'
import OpenAI from 'openai'
import path from 'path'
import requireRole from '../middleware/requireRole.js'

const router = express.Router()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
const DATA_DIR = path.resolve(process.cwd(), 'data', 'vet')

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

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

    // 1) embedding de la consulta (puede fallar por cuota)
    let qEmb
    try {
      qEmb = await embeddingUtil.embedText(sintomas)
    } catch (e) {
      console.error('[agent] error creando embedding:', e)
      const isQuota = e?.code === 'insufficient_quota' || e?.status === 429 || e?.error?.code === 'insufficient_quota'
      if (isQuota) {
        const fallback = generateFallback(sintomas)
        const doc = await AiConsult.create({
          userId: req.userId,
          sintomas,
          especie,
          edad,
          contexto,
          sources: fallback.sources,
          rawResponse: 'fallback',
          parsedResponse: fallback.parsed,
          status: 'pending'
        })
        return res.status(503).json({
          error: 'openai_quota_exceeded',
          message: 'Límite de cuota OpenAI alcanzado. Se devolvió prediagnóstico orientativo local.',
          fallback: fallback.parsed,
          sources: fallback.sources,
          consultId: doc._id.toString()
        })
      }
      throw e
    }

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

    let text = ''
    let parsed = null
    if (!openai) {
      console.warn('[agent] OPENAI_API_KEY no configurada -> usando fallback local')
      const fallback = generateFallback(sintomas)
      const doc = await AiConsult.create({
        userId: req.userId,
        sintomas,
        especie,
        edad,
        contexto,
        sources: fallback.sources,
        rawResponse: 'fallback',
        parsedResponse: fallback.parsed,
        status: 'pending'
      })
      return res.status(503).json({ error: 'openai_not_configured', message: 'OPENAI_API_KEY no configurada. Se devolvió prediagnóstico orientativo local.', fallback: fallback.parsed, sources: fallback.sources, consultId: doc._id.toString() })
    }

    try {
      const chatResp = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: 700,
        temperature: 0.1
      })
      text = chatResp.choices?.[0]?.message?.content || ''
    } catch (e) {
      console.error('[agent] OpenAI chat error', e)
      const isQuota = e?.code === 'insufficient_quota' || e?.status === 429 || e?.error?.code === 'insufficient_quota'
      if (isQuota) {
        const fallback = generateFallback(sintomas)
        const doc = await AiConsult.create({
          userId: req.userId,
          sintomas,
          especie,
          edad,
          contexto,
          sources: fallback.sources,
          rawResponse: 'fallback',
          parsedResponse: fallback.parsed,
          status: 'pending'
        })
        return res.status(503).json({
          error: 'openai_quota_exceeded',
          message: 'Límite de cuota OpenAI alcanzado. Se devolvió prediagnóstico orientativo local.',
          fallback: fallback.parsed,
          sources: fallback.sources,
          consultId: doc._id.toString()
        })
      }
      throw e
    }

    try {
      const match = text.match(/\{[\s\S]*\}$/)
      if (match) parsed = JSON.parse(match[0])
    } catch (e) { parsed = null }

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
    return res.status(500).json({ error: 'server_error', details: e?.message || String(e) })
  }
})

// reindex endpoint
router.post('/reindex', auth, requireRole('veterinario'), async (req, res) => {
  try {
    const count = await embeddingUtil.indexDirectory(DATA_DIR)
    indexed = true
    return res.json({ ok: true, indexedDocuments: count })
  } catch (e) {
    console.error('AI reindex error', e)
    return res.status(500).json({ error: 'server_error', details: e?.message || String(e) })
  }
})

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