// backend_myvet/ai/fallback.js
import fs from 'fs'
import path from 'path'

function loadDocs(dir = path.resolve(process.cwd(), 'data', 'vet')) {
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter(f => /\.(md|txt)$/i.test(f))
  return files.map(fname => ({ id: fname, text: fs.readFileSync(path.join(dir, fname), 'utf8') }))
}

function scoreDocs(query, docs) {
  const qtokens = query.toLowerCase().split(/\W+/).filter(Boolean)
  return docs.map(d => {
    const text = d.text.toLowerCase()
    const score = qtokens.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0)
    return { ...d, score }
  }).sort((a,b) => b.score - a.score)
}

function ruleBasedAnalysis(query) {
  const q = query.toLowerCase()
  const red = []
  if (q.match(/convuls|convulsi|convulsiones/)) red.push('Convulsiones')
  if (q.match(/dificultad respir|respiraci/)) red.push('Dificultad respiratoria')
  if (q.match(/colaps|desmay|inconscien/)) red.push('Pérdida de conciencia/colapso')
  if (q.match(/sangr|hemorrag/)) red.push('Sangrado profuso')
  if (q.match(/sibil|tos persistente|tos seca/)) red.push('Tos persistente / dificultad respiratoria')

  let recomendaciones = 'Mantén a la mascota en reposo, ofrece agua en pequeñas cantidades, evita medicar por tu cuenta y observa durante 24 horas. Si empeora, acude a urgencias.'
  let confidence = 'baja'
  if (red.length > 0) {
    recomendaciones = 'Se detectaron signos de alerta. Lleva al animal a urgencias veterinarias inmediatamente.'
    confidence = 'media'
  }
  return {
    recomendaciones,
    red_flags: red.length ? red.join(', ') : null,
    confidence,
    disclaimer: 'Respuesta orientativa generada por reglas local — no sustituye consulta veterinaria.'
  }
}

export function generateFallback(query) {
  const docs = loadDocs()
  const scored = scoreDocs(query, docs).slice(0,3)
  const sources = scored.filter(s => s.score > 0).map(s => s.id)
  const evidence = scored.map(s => ({ id: s.id, snippet: s.text.substring(0, 400) }))
  const analysis = ruleBasedAnalysis(query)
  return { parsed: analysis, sources, evidence }
}