import { Router } from 'express'
import auth from '../middleware/auth.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const router = Router()

// Fallback response when Gemini is not available
function getFallbackResponse(sintomas, especie) {
  const consejos = [
    'Mantén a tu mascota hidratada',
    'Observa cualquier cambio en el comportamiento',
    'Mantén un registro de los síntomas y su duración'
  ]
  
  const redFlags = [
    'Dificultad para respirar',
    'Sangrado excesivo',
    'Pérdida de consciencia',
    'Convulsiones',
    'Vómito o diarrea persistente por más de 24 horas'
  ]

  return {
    recomendaciones: consejos,
    red_flags: redFlags,
    disclaimer: 'Esta es una respuesta automatizada básica. Por favor, consulta con un veterinario profesional para un diagnóstico adecuado. Esta información es solo orientativa y no reemplaza la consulta veterinaria.',
    es_fallback: true
  }
}

router.post('/prediagnostico', auth, async (req, res) => {
  try {
    const { sintomas, especie, edad, sexo } = req.body || {}
    
    if (!sintomas) {
      return res.status(400).json({ error: 'sintomas requerido' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    
    // If no API key, return fallback
    if (!apiKey) {
      console.log('[AI] GEMINI_API_KEY no configurado, usando respuesta de fallback')
      return res.json(getFallbackResponse(sintomas, especie))
    }

    try {
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Build prompt
      let prompt = `Eres un asistente veterinario AI. Un dueño de mascota describe los siguientes síntomas: "${sintomas}".`
      if (especie) prompt += ` La especie es: ${especie}.`
      if (edad) prompt += ` Edad aproximada: ${edad}.`
      if (sexo) prompt += ` Sexo: ${sexo}.`
      
      prompt += `\n\nProporciona una respuesta en formato JSON con la siguiente estructura:
{
  "recomendaciones": ["lista de recomendaciones generales de cuidado"],
  "red_flags": ["lista de señales de alerta que requieren atención veterinaria inmediata"],
  "disclaimer": "Un breve disclaimer indicando que esto es solo orientativo y no reemplaza la consulta veterinaria profesional"
}

Responde SOLO con el JSON, sin texto adicional antes o después.`

      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      // Parse the JSON response
      let jsonResponse
      try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        jsonResponse = JSON.parse(cleanText)
      } catch (parseError) {
        console.error('[AI] Error parsing Gemini response:', parseError)
        return res.json(getFallbackResponse(sintomas, especie))
      }

      // Ensure the response has required fields
      if (!jsonResponse.recomendaciones || !jsonResponse.red_flags || !jsonResponse.disclaimer) {
        console.error('[AI] Invalid Gemini response structure')
        return res.json(getFallbackResponse(sintomas, especie))
      }

      return res.json({
        ...jsonResponse,
        es_fallback: false
      })

    } catch (geminiError) {
      console.error('[AI] Error calling Gemini API:', geminiError)
      return res.json(getFallbackResponse(sintomas, especie))
    }

  } catch (e) {
    console.error('[AI] Error general:', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

export default router
