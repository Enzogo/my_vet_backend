import fs from 'fs'
import path from 'path'
import { OpenAIApi, Configuration } from 'openai'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
const client = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }))

// índice en memoria: [{ id, text, embedding }]
const INDEX = []

async function createEmbedding(text) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no definido')
  const resp = await client.createEmbedding({ model: EMBED_MODEL, input: text })
  return resp.data.data[0].embedding
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
  INDEX.length = 0
  if (!fs.existsSync(dirPath)) return 0
  const files = fs.readdirSync(dirPath).filter(f => /\.(md|txt)$/i.test(f))
  for (const fname of files) {
    const full = path.join(dirPath, fname)
    const text = fs.readFileSync(full, 'utf8')
    // Para docs largos conviene fragmentar; aquí usamos documento completo
    const embedding = await createEmbedding(text)
    INDEX.push({ id: fname, text, embedding })
  }
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