/**
 * Test script para verificar actualización de estado de cita
 * Ejecutar: node test_cita_status.js
 */

import axios from 'axios'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const BASE_URL = 'http://localhost:4000/api'
const JWT_SECRET = 'mi_secreto_super_seguro' // Debe coincidir con .env

// Crear tokens de prueba
function createToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' })
}

// IDs para test (CAMBIAR estos valores)
const testUserId = '507f1f77bcf86cd799439011' // ID del dueño
const testVetId = '507f1f77bcf86cd799439012'   // ID del veterinario
const testCitaId = '607f1f77bcf86cd799439013'  // ID de la cita a actualizar

const tokenDueno = createToken(testUserId, 'dueno')
const tokenVet = createToken(testVetId, 'veterinario')

console.log('📋 TEST: Actualización de Estado de Cita\n')
console.log('Token dueño:', tokenDueno)
console.log('Token vet:', tokenVet)
console.log()

async function runTests() {
  try {
    // 1. Obtener cita ANTES de actualizar
    console.log('1️⃣ Obtener cita ANTES de actualizar')
    console.log('─'.repeat(50))
    
    try {
      const beforeResponse = await axios.get(`${BASE_URL}/owners/me/citas/${testCitaId}`, {
        headers: { Authorization: `Bearer ${tokenDueno}` }
      })
      
      const citaBefore = beforeResponse.data
      console.log(`✅ Estado ANTES: ${citaBefore.estado}`)
      console.log(`   ID: ${citaBefore.id}`)
      console.log(`   Mascota: ${citaBefore.nombreMascota}`)
      console.log()
    } catch (e) {
      console.log(`❌ Error obteniendo cita: ${e.response?.status} ${e.response?.statusText}`)
      console.log(`   Mensaje: ${e.response?.data?.error || e.message}`)
      console.log(`   → Verifica que citaId sea válido y que pertenezca al dueño\n`)
      return
    }

    // 2. Veterinario actualiza el estado
    console.log('2️⃣ Veterinario actualiza estado a COMPLETADA')
    console.log('─'.repeat(50))
    
    const updatePayload = {
      estado: 'completada',
      diagnostico: 'Gastroenteritis leve',
      procedimientos: 'Análisis de sangre, radiografía de abdomen',
      recomendaciones: 'Dieta blanda durante 3 días, reposo',
      horaInicio: '10:30',
      horaFin: '11:15',
      notas: 'Paciente estable, responde bien al tratamiento'
    }
    
    console.log('Enviando PATCH con datos:')
    console.log(JSON.stringify(updatePayload, null, 2))
    console.log()
    
    try {
      const updateResponse = await axios.patch(`${BASE_URL}/vet/citas/${testCitaId}`, updatePayload, {
        headers: { Authorization: `Bearer ${tokenVet}` }
      })
      
      const citaActualizada = updateResponse.data
      console.log(`✅ Estado DESPUÉS: ${citaActualizada.estado}`)
      console.log(`   Diagnóstico: ${citaActualizada.diagnostico}`)
      console.log(`   Procedimientos: ${citaActualizada.procedimientos}`)
      console.log()
    } catch (e) {
      console.log(`❌ Error actualizando cita: ${e.response?.status} ${e.response?.statusText}`)
      console.log(`   Mensaje: ${e.response?.data?.error || e.message}`)
      console.log(`   → Verifica que citaId sea válido y que el vet tenga permisos\n`)
      return
    }

    // 3. Dueño obtiene cita actualizada
    console.log('3️⃣ Dueño obtiene cita para verificar cambio')
    console.log('─'.repeat(50))
    
    try {
      const afterResponse = await axios.get(`${BASE_URL}/owners/me/citas/${testCitaId}`, {
        headers: { Authorization: `Bearer ${tokenDueno}` }
      })
      
      const citaAfter = afterResponse.data
      console.log(`✅ Estado AHORA: ${citaAfter.estado}`)
      console.log(`   Diagnóstico: ${citaAfter.diagnostico}`)
      console.log(`   Recomendaciones: ${citaAfter.recomendaciones}`)
      
      // Verificar que cambió
      if (citaAfter.estado === 'completada') {
        console.log(`\n✅ ÉXITO: La cita se actualizó correctamente a "completada"`)
      } else {
        console.log(`\n❌ PROBLEMA: La cita sigue en "${citaAfter.estado}", no cambió a completada`)
      }
    } catch (e) {
      console.log(`❌ Error obteniendo cita: ${e.response?.status}`)
      return
    }

    // 4. Verificar que está en lista de completadas
    console.log('\n4️⃣ Verificar que aparece en lista de completadas')
    console.log('─'.repeat(50))
    
    try {
      const completadasResponse = await axios.get(`${BASE_URL}/owners/me/citas/completadas`, {
        headers: { Authorization: `Bearer ${tokenDueno}` }
      })
      
      const completadas = completadasResponse.data
      const encontrada = completadas.find(c => c.id === testCitaId)
      
      if (encontrada) {
        console.log(`✅ Cita ENCONTRADA en lista de completadas`)
        console.log(`   Estado: ${encontrada.estado}`)
      } else {
        console.log(`❌ Cita NO encontrada en lista de completadas`)
        console.log(`   Total de completadas: ${completadas.length}`)
      }
    } catch (e) {
      console.log(`❌ Error: ${e.response?.data?.error}`)
    }

    // 5. Verificar que NO está en pendientes
    console.log('\n5️⃣ Verificar que NO aparece en lista de pendientes')
    console.log('─'.repeat(50))
    
    try {
      const pendientesResponse = await axios.get(`${BASE_URL}/owners/me/citas/pendientes`, {
        headers: { Authorization: `Bearer ${tokenDueno}` }
      })
      
      const pendientes = pendientesResponse.data
      const encontrada = pendientes.find(c => c.id === testCitaId)
      
      if (encontrada) {
        console.log(`❌ PROBLEMA: Cita SIGUE en lista de pendientes`)
      } else {
        console.log(`✅ Cita correctamente REMOVIDA de pendientes`)
        console.log(`   Total de pendientes: ${pendientes.length}`)
      }
    } catch (e) {
      console.log(`❌ Error: ${e.response?.data?.error}`)
    }

  } catch (e) {
    console.error('❌ Error general:', e.message)
  }
}

console.log('🚀 Iniciando tests...\n')
runTests().then(() => {
  console.log('\n' + '='.repeat(50))
  console.log('✅ Tests completados')
  process.exit(0)
}).catch(e => {
  console.error('Error fatal:', e)
  process.exit(1)
})
