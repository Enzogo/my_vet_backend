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

router.post('/prediagnostico', auth, async (req, res) => {
  try {
    const { sintomas, especie, edad, sexo } = req.body || {}
    if (!sintomas) return res.status(400).json({ error: 'sintomas requerido' })

    const key = process.env.GEMINI_API_KEY
    if (!key) {
      return res.json(ruleBasedFallback({ sintomas, especie }))
    }

    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
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
    const resp = await model.generateContent(prompt)
    const text = resp.response.text()
    // Particion simple:
    const recomendaciones = (text.match(/Recomendaciones:\s*([\s\S]*?)(?:Red flags:|Disclaimer:|$)/i)?.[1] || '').trim()
    const red_flags = (text.match(/Red flags:\s*([\s\S]*?)(?:Disclaimer:|$)/i)?.[1] || '').trim() || null
    const disclaimer = (text.match(/Disclaimer:\s*([\s\S]*)/i)?.[1] || 'Esto es solo orientativo.').trim()

    return res.json({ recomendaciones, red_flags, disclaimer })
  } catch (e) {
    console.error('prediagnostico error', e)
    return res.json(ruleBasedFallback(req.body || {}))
  }
})

export default router