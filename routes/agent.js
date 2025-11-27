// backend_myvet/routes/agent.js
import express from 'express'
import auth from '../middleware/auth.js'
import AiConsult from '../models/AiConsult.js'
import * as embeddingUtil from '../ai/embeddings.js'
import { generateFallback } from '../ai/fallback.js'
import path from 'path'
import fs from 'fs'
import requireRole from '../middleware/requireRole.js'
import Ajv from 'ajv'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Cargar schema desde archivo JSON
const vetSchemaPath = new URL('../schemas/vet_triage.schema.json', import.meta.url)
const vetSchema = JSON.parse(fs.readFileSync(vetSchemaPath, 'utf-8'))

const router = express.Router()
const DATA_DIR = path.resolve(process.cwd(), 'data', 'vet')

// GEMINI CONFIG
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
const gemini = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

// AJV para validar salida JSON del LLM
const ajv = new Ajv({ allErrors: true, removeAdditional: true })
const validate = ajv.compile(vetSchema)

// Especies permitidas (mascotas comunes)
const ALLOWED_PETS = ['perro','gato','conejo','hurón','ave','loro','canario','pájaro','pez','cobaya','hamster','huron']

let indexed = false
async function ensureIndex() {
  if (indexed) return
  await embeddingUtil.indexDirectory(DATA_DIR)
  indexed = true
}

// Heurística simple para detectar si texto habla de mascotas
function isLikelyPetQuery(text) {
  if (!text) return false
  const kws = ['perro','gato','mascota','cachorro','gata','perrita','canino','felino','colita','oreja','patita','ronronea','ladra','maulla']
  const lower = text.toLowerCase()
  return kws.some(k => lower.includes(k))
}

// Intentar inferir especie del texto (heurístico). Devuelve null si ambiguo.
function inferSpeciesFromText(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const pet of ALLOWED_PETS) {
    if (lower.includes(pet)) return pet
  }
  // patrones comunes
  if (lower.includes('muerde') || lower.includes('ladr')) return 'perro'
  if (lower.includes('maull') || lower.includes('arañ')) return 'gato'
  return null
}

// POST /api/ai/agent - dueño crea consulta prediagnóstica (solo mascotas)
router.post('/agent', auth, async (req, res) => {
  try {
    let { sintomas, especie, edad, contexto } = req.body || {}
    if (!sintomas) return res.status(400).json({ error: 'sintomas requerido' })

    // 1) asegurar que es sobre mascotas
    if (!isLikelyPetQuery(sintomas) && !especie) {
      return res.status(400).json({ error: 'Solo se aceptan consultas sobre mascotas. Por favor indique especie (ej: perro, gato) o describa que se trata de una mascota.' })
    }

    // 2) si especie no provista, intentar inferir
    if (!especie) {
      const inferred = inferSpeciesFromText(sintomas)
      if (!inferred) {
        return res.status(400).json({ error: 'Especie no identificada. Por favor indique la especie de la mascota (ej: perro, gato).' })
      }
      especie = inferred
    } else {
      especie = String(especie).toLowerCase()
    }

    // 3) validar que sea una especie permitida (solo mascotas)
    if (!ALLOWED_PETS.includes(especie)) {
      return res.status(400).json({ error: 'Solo se permiten consultas para mascotas domésticas comunes (perro, gato, conejo, ave, etc.).' })
    }

    await ensureIndex()

    // 4) embedding (mismo manejo de errores que ya tienes)
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
          error: 'embeddings_quota_exceeded',
          message: 'Límite de cuota de embeddings alcanzado. Se devolvió prediagnóstico orientativo local.',
          fallback: fallback.parsed,
          sources: fallback.sources,
          consultId: doc._id.toString()
        })
      }
      throw e
    }

    // 5) Recuperar solo documentos relevantes y preferiblemente etiquetados para la misma especie
    // Se asume que embeddingUtil.findTopK puede devolver metadata/species; si no, filtrar manualmente.
    const top = embeddingUtil.findTopK(qEmb, 6)
    // Filtrar por metadata.species si existe
    const topForSpecies = top.filter(t => !t.metadata?.species || String(t.metadata?.species).toLowerCase() === especie).slice(0, 4)
    const evidence = topForSpecies.map(t => `SOURCE:${t.id}\n${t.text}`).join('\n\n---\n\n')
    const sources = topForSpecies.map(t => t.id)

    // 6) construir prompt estricto (solo mascotas y formato JSON de triage preliminar)
    const system = `Eres un asistente orientado EXCLUSIVAMENTE a medicina veterinaria de MASCOTAS domésticas (${especie}). Solo das evaluaciones PRELIMINARES y pautas de triage. NUNCA das diagnóstico definitivo ni prescribes medicamentos que requieran receta.

INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE con JSON válido, SIN código markdown, SIN \`\`\` ni explicaciones.

Formato exacto del JSON (completar todos los campos):
{
  "animal": "<especie>",
  "urgencia": "baja|media|alta|emergencia|desconocida",
  "causas_frecuentes": ["causa1", "causa2", ...],
  "pasos_recomendados": ["paso1", "paso2", ...],
  "alerta": "<alerta o texto vacío>",
  "responsabilidad": "<disclaimer breve>"
}`

    const user = `
Sintomas: ${sintomas}
Especie: ${especie}
Edad: ${edad ?? 'N/D'}
Contexto: ${contexto ?? 'N/A'}

EVIDENCIA:
${evidence}

Proporciona SOLO el JSON, sin explicaciones previas ni posteriores.`

    let text = ''
    let parsed = null

    if (!gemini) {
      console.warn('[agent] API Gemini no configurada -> usando fallback local')
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
      return res.status(503).json({ error: 'gemini_not_configured', message: 'API Gemini no configurada. Se devolvió prediagnóstico orientativo local.', fallback: fallback.parsed, sources: fallback.sources, consultId: doc._id.toString() })
    }

    try {
      const model = gemini.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
      })
      const prompt = `${system}\n\n${user}`
      console.log('[agent] Enviando prompt a Gemini...')
      const genResp = await model.generateContent(prompt)
      text = genResp?.response?.text ? genResp.response.text() : JSON.stringify(genResp.response)
      console.log('[agent] Respuesta de Gemini (primeros 300 chars):', text.substring(0, 300))
    } catch (e) {
      console.error('[agent] LLM error', e)
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
          error: 'llm_quota_exceeded',
          message: 'Límite de cuota del LLM alcanzado. Se devolvió prediagnóstico orientativo local.',
          fallback: fallback.parsed,
          sources: fallback.sources,
          consultId: doc._id.toString()
        })
      }
      throw e
    }

    // Extraer JSON resultado (limpiar markdown code blocks)
    try {
      // Remover ```json y ``` si están presentes
      let cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      // También intenta match desde la primera llave
      const match = cleanedText.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        parsed = null
      }
    } catch (e) {
      console.error('[agent] Error parsing JSON:', e.message, 'Raw text:', text.substring(0, 200))
      parsed = null
    }

    // Validar JSON con schema
    let valid = false
    if (parsed) {
      try {
        valid = validate(parsed)
        if (!valid) {
          console.error('[agent] Schema validation failed:', validate.errors, 'Parsed:', JSON.stringify(parsed).substring(0, 300))
        }
      } catch (e) {
        console.error('[agent] Validation error:', e.message)
        valid = false
      }
    }

    // Si no válido, guardar raw y avisar para revisión (no enviar info potencialmente incorrecta al usuario)
    if (!valid) {
      const doc = await AiConsult.create({
        userId: req.userId,
        sintomas,
        especie,
        edad,
        contexto,
        sources,
        rawResponse: text,
        parsedResponse: parsed,
        status: 'pending',
        note: 'invalid_json_from_llm'
      })
      return res.status(200).json({
        ok: false,
        message: 'El asistente no devolvió una respuesta estructurada válida. Se guardó para revisión por un profesional.',
        consultId: doc._id.toString(),
        raw: text
      })
    }

    // Si válido, persistir y devolver
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

    return res.json({ ok: true, consultId: doc._id.toString(), diagnostico: parsed })
  } catch (e) {
    console.error('AI agent error', e)
    return res.status(500).json({ error: 'server_error', details: e?.message || String(e) })
  }
})

// reindex endpoint (mantiene comportamiento)
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