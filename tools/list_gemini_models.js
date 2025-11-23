import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function main() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.error('Define GEMINI_API_KEY en .env antes de ejecutar.')
    process.exit(1)
  }
  
  console.log(`API Key presente: ${key ? '✅' : '❌'}`)
  console.log(`API Key (primeros 20 chars): ${key.substring(0, 20)}...`)
  
  const client = new GoogleGenerativeAI(key)
  try {
    // Probar modelos con nombres completos
    const modelsToTest = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-2.0-flash-exp',
      'gemini-exp-1206',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro'
    ]
    
    console.log('\n=== Probando modelos disponibles ===\n')
    for (const modelName of modelsToTest) {
      try {
        const model = client.getGenerativeModel({ model: modelName })
        const response = await model.generateContent('hola')
        console.log(`✅ ${modelName}: DISPONIBLE`)
      } catch (e) {
        const msg = e.message.split('\n')[0].substring(0, 80)
        console.log(`❌ ${modelName}: ${msg}...`)
      }
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

main().catch(console.error)