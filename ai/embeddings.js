import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
const client = new OpenAI({ apiKey: OPENAI_API_KEY })

const INDEX = []
const INDEX_FILE = path.resolve(process.cwd(), 'ai', 'index.json')

function saveIndexToDisk() {
  try {
    const dir = path.dirname(INDEX_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(INDEX_FILE, JSON.stringify(INDEX), 'utf8')
  } catch (e) {
    console.error('[embeddings] no se pudo guardar index en disco', e)
  }
}

function loadIndexFromDisk() {
  try {
    if (!fs.existsSync(INDEX_FILE)) return false
    const raw = fs.readFileSync(INDEX_FILE, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      INDEX.length = 0
      for (const item of arr) INDEX.push(item)
      console.log(`[embeddings] cargado index desde disco (${INDEX.length} entradas)`)
      return true
    }
  } catch (e) {
    console.error('[embeddings] error cargando index desde disco', e)
  }
  return false
}

async function withRetry(fn, retries = 3, initialMs = 500) {
  let wait = initialMs
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const status = err?.status || err?.response?.status || null
      if (i === retries || (status && status !== 429)) throw err
      const jitter = Math.floor(Math.random() * 200)
      await new Promise(r => setTimeout(r, wait + jitter))
      wait *= 2
    }
  }
  throw new Error('Retries agotados')
}

async function createEmbedding(text) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no definido')
  const resp = await withRetry(() => client.embeddings.create({ model: EMBED_MODEL, input: text }), 3, 500)
  return resp.data?.[0]?.embedding
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10)
}

export async function indexDirectory(dirPath) {
  if (loadIndexFromDisk()) return INDEX.length
  INDEX.length = 0
  if (!fs.existsSync(dirPath)) return 0
  const files = fs.readdirSync(dirPath).filter(f => /\.(md|txt)$/i.test(f))
  for (const fname of files) {
    const full = path.join(dirPath, fname)
    const text = fs.readFileSync(full, 'utf8')
    const embedding = await createEmbedding(text)
    INDEX.push({ id: fname, text, embedding })
  }
  saveIndexToDisk()
  return INDEX.length
}

export function findTopK(queryEmbedding, k = 3) {
  return INDEX
    .map(doc => ({ id: doc.id, text: doc.text, score: cosine(queryEmbedding, doc.embedding) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, k)
}

export async function embedText(text) {
  return await createEmbedding(text)
}

export default {
  indexDirectory,
  findTopK,
  embedText
}