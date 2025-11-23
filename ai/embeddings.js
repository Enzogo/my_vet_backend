import fs from 'fs'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

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

// Búsqueda simple por palabras clave (sin embeddings)
function searchByKeywords(query, k = 3) {
  const keywords = query.toLowerCase().split(/\s+/)
  const scored = INDEX.map(doc => {
    const docText = doc.text.toLowerCase()
    let score = 0
    for (const kw of keywords) {
      const matches = (docText.match(new RegExp(kw, 'g')) || []).length
      score += matches
    }
    return { ...doc, score }
  })
  return scored.sort((a, b) => b.score - a.score).slice(0, k)
}

export async function indexDirectory(dirPath) {
  if (loadIndexFromDisk()) return INDEX.length
  INDEX.length = 0
  if (!fs.existsSync(dirPath)) return 0
  
  try {
    const files = fs.readdirSync(dirPath).filter(f => /\.(md|txt)$/i.test(f))
    for (const fname of files) {
      const full = path.join(dirPath, fname)
      const text = fs.readFileSync(full, 'utf8')
      // Sin embeddings - solo almacenar el texto
      INDEX.push({ id: fname, text, embedding: null })
    }
    saveIndexToDisk()
    console.log(`[embeddings] indexado ${INDEX.length} archivos`)
  } catch (e) {
    console.error('[embeddings] error indexando directorio:', e)
  }
  return INDEX.length
}

// Usar búsqueda por keywords en lugar de embeddings
export function findTopK(query, k = 3) {
  if (!query) return []
  // Si es un array (embedding), usar búsqueda simple
  if (Array.isArray(query)) {
    return searchByKeywords(JSON.stringify(query), k)
  }
  return searchByKeywords(query, k)
}

export async function embedText(text) {
  // No usar embeddings - solo devolver null
  // Gemini embedding no es gratuito, así que saltamos esto
  return null
}

export default {
  indexDirectory,
  findTopK,
  embedText
}