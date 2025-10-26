import { Router } from 'express'
import auth from '../middleware/auth.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const router = Router()

function ruleBasedFallback({ sintomas, especie }) {
  const s = (sintomas || '').toLowerCase()
  const rec = []
  const red = []

  if (s.includes('vomit') || s.includes('vómit')) {
    rec.push('Ofrece agua en pequeñas cantidades, observa la frecuencia de vómito.')
    red.push('Vómitos persistentes con sangre o deshidratación: acude a urgencias.')
  }
  if (s.includes('diarr')) {
    rec.push('Dieta blanda temporal y vigilancia de hidratación.')
    red.push('Diarrea con sangre o fiebre: control veterinario.')
  }
  if (s.includes('dolor') || s.includes('coje')) {
    rec.push('Evita ejercicio intenso, reposo relativo.')
    red.push('Dolor intenso o cojeras persistentes: evaluación clínica.')
  }
  if (rec.length === 0) rec.push('Observa conducta general, apetito, hidratación y temperatura.')
  if (especie && /gato|felino/i.test(especie)) rec.push('Para gatos, monitoriza uso de arenero y apetito.')
  return {
    recomendaciones: rec.join('\n'),
    red_flags: red.join('\n') || null,
    disclaimer: 'Esto es solo orientativo y no reemplaza una evaluación veterinaria.'
  }
}

async function generateWithGemini(key, prompt) {
  const genAI = new GoogleGenerativeAI(key)

  // Intenta estos modelos en orden
  const candidates = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.0-pro'
  ]

  let lastErr
  for (const modelId of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId })
      const resp = await model.generateContent(prompt)
      const text = resp.response?.text?.() || resp.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
      if (text) return { ok: true, text, modelId }
      lastErr = new Error('Respuesta vacía')
    } catch (e) {
      lastErr = e
      // Continúa al siguiente modelo
    }
  }
  return { ok: false, error: lastErr }
}

router.post('/prediagnostico', auth, async (req, res) => {
  try {
    const { sintomas, especie, edad, sexo } = req.body || {}
    if (!sintomas) return res.status(400).json({ error: 'sintomas requerido' })

    const key = process.env.GEMINI_API_KEY
    if (!key) {
      // Sin API key → fallback
      return res.json(ruleBasedFallback({ sintomas, especie }))
    }

    const prompt =
`Eres un asistente veterinario. Con base en los siguientes datos, entrega recomendaciones orientativas y banderas rojas.
Sintomas: ${sintomas}
Especie: ${especie ?? 'N/D'}
Edad: ${edad ?? 'N/D'}
Sexo: ${sexo ?? 'N/D'}

Formato de salida:
- Recomendaciones:
- Red flags:
- Disclaimer:`

    const result = await generateWithGemini(key, prompt)
    if (!result.ok) {
      console.error('Gemini error:', result.error)
      return res.json(ruleBasedFallback({ sintomas, especie }))
    }

    const text = result.text

    const recomendaciones = (text.match(/Recomendaciones:\s*([\s\S]*?)(?:Red flags:|Disclaimer:|$)/i)?.[1] || '').trim()
    const red_flags = (text.match(/Red flags:\s*([\s\S]*?)(?:Disclaimer:|$)/i)?.[1] || '').trim() || null
    const disclaimer = (text.match(/Disclaimer:\s*([\s\S]*)/i)?.[1] || 'Esto es solo orientativo.').trim()

    return res.json({ recomendaciones, red_flags, disclaimer, _model: result.modelId })
  } catch (e) {
    console.error('prediagnostico error', e)
    return res.json(ruleBasedFallback(req.body || {}))
  }
})

export default router