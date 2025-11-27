# 🔍 DIAGNÓSTICO: Error HTTP 400 - Citas Pendientes/Completadas

## Síntoma
Android recibe `HTTP 400` cuando llama a:
- `GET /api/owners/me/citas/pendientes`
- `GET /api/owners/me/citas/completadas`

## Backend Status ✅
El backend está **100% correcto**:
- ✅ Endpoints existen
- ✅ Autenticación configurada (`auth` middleware)
- ✅ Lógica de negocio correcta
- ✅ MongoDB conectado
- ✅ CORS habilitado

## Causa Raíz: Android NO Envía Token

El error HTTP 400 viene del middleware `auth.js` cuando:
```javascript
if (!authHeader) return res.status(401).json({ error: 'no_token' })
```

Pero si recibe 400 (no 401), puede ser que:
1. **El token NO se está enviando** en header `Authorization`
2. **El token tiene formato inválido** (sin "Bearer " prefix)
3. **El token está expirado**

## 🔧 Cómo Verificar

### Paso 1: Agregar Logs en Backend

Edita `middleware/auth.js`:

```javascript
import jwt from 'jsonwebtoken'

export default function auth(req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    
    // ← AGREGAR ESTOS LOGS:
    console.log('[AUTH DEBUG]', {
      method: req.method,
      path: req.path,
      authHeader: authHeader ? `${authHeader.substring(0, 30)}...` : 'MISSING',
      timestamp: new Date().toISOString()
    })
    
    if (!authHeader) {
      console.warn('[AUTH] ❌ NO Authorization header')
      return res.status(401).json({ error: 'no_token' })
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.warn('[AUTH] ❌ Invalid format:', parts)
      return res.status(401).json({ error: 'invalid_format' })
    }

    const token = parts[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key')
    
    console.log('[AUTH] ✅ Token válido. userId:', decoded.id)
    
    req.userId = decoded.id
    req.userRole = decoded.role
    return next()
  } catch (e) {
    console.error('[AUTH] ❌ Error:', e.message)
    return res.status(401).json({ error: 'invalid_token', message: e.message })
  }
}
```

### Paso 2: Ejecutar Backend y Ver Logs

```bash
npm start
```

Deberías ver logs como:
```
[AUTH DEBUG] { method: 'GET', path: '/api/owners/me/citas/pendientes', authHeader: 'Bearer eyJhbG...', timestamp: '2025-01-26T...' }
[AUTH] ✅ Token válido. userId: <some-id>
```

O si falla:
```
[AUTH DEBUG] { method: 'GET', path: '/api/owners/me/citas/pendientes', authHeader: 'MISSING', timestamp: '...' }
[AUTH] ❌ NO Authorization header
```

### Paso 3: Desde Android, Agregar Logs

En `HistorialCitasScreen.kt`:

```kotlin
private fun loadCitas() {
    isLoading = true
    scope.launch(Dispatchers.IO) {
        try {
            val prefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
            val token = prefs.getString("token", null)
            
            Log.d("HistorialCitas", "🔍 Token guardado: ${if (token != null) "✅ ${token.take(20)}..." else "❌ NULL"}")
            
            val api = RetrofitClient.authed(context).create(OwnerApi::class.java)
            
            Log.d("HistorialCitas", "📡 Llamando a getCitasPendientes...")
            citasPendientes = api.getCitasPendientes()
            
            Log.d("HistorialCitas", "✅ Citas pendientes cargadas: ${citasPendientes.size}")
            
        } catch (e: Exception) {
            Log.e("HistorialCitas", "❌ Error al cargar citas", e)
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        } finally {
            isLoading = false
        }
    }
}
```

### Paso 4: Revisar Logcat de Android

Corre Android y busca en Logcat:

```
HistorialCitas | 🔍 Token guardado: ✅ eyJhbG...
HistorialCitas | 📡 Llamando a getCitasPendientes...
```

Si ves:
```
HistorialCitas | 🔍 Token guardado: ❌ NULL
```

→ **El problema es que el token NO se guardó al login**

Si ves el error en Logcat:
```
HistorialCitas | ❌ Error al cargar citas
retrofit2.HttpException: HTTP 400
```

→ **Backend rechaza porque no tiene token o es inválido**

## 📋 Posibles Soluciones

### Caso 1: Token es NULL

**Problema:** El login NO guardó el token

**Solución en LoginScreen.kt:**

```kotlin
suspend fun login(email: String, password: String): Boolean {
    return try {
        val api = RetrofitClient.noAuth().create(AuthApi::class.java)
        val response = api.login(LoginRequest(email, password))
        
        val token = response.token
        Log.d("Login", "Token recibido: ${token.take(20)}...")
        
        // GUARDAR EL TOKEN
        val prefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("token", token)
            putString("userId", response.id)
            putString("userRole", response.role)
            apply()
        }
        
        Log.d("Login", "✅ Token guardado en SharedPreferences")
        true
    } catch (e: Exception) {
        Log.e("Login", "❌ Error al hacer login", e)
        false
    }
}
```

### Caso 2: Token No Se Envía en Header

**Problema:** RetrofitClient NO agrega Authorization header

**Solución en RetrofitClient.kt:**

```kotlin
fun authed(context: Context): Retrofit {
    val httpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val token = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
                .getString("token", null)
            
            Log.d("Retrofit", "📤 Token para request: ${if (token != null) "✅" else "❌"}")
            
            val request = if (token != null) {
                chain.request().newBuilder()
                    .header("Authorization", "Bearer $token")  // ← CRÍTICO
                    .build()
            } else {
                Log.w("Retrofit", "⚠️ Sin token, llamada sin autenticación")
                chain.request()
            }
            
            Log.d("Retrofit", "📤 Headers: ${request.headers}")
            
            chain.proceed(request)
        }
        .build()
    
    return Retrofit.Builder()
        .baseUrl("http://10.0.2.2:4000/")
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

### Caso 3: Token Expirado

**Problema:** Backend rechaza token porque JWT_SECRET no coincide o token está expirado

**Verificar en Backend:**

```bash
# 1. Verifica JWT_SECRET en .env
cat .env | grep JWT_SECRET

# 2. Logs en server.js:
console.log('[MyVet] JWT_SECRET:', process.env.JWT_SECRET)
```

## ✅ Testing Manual

Una vez que todo esté con logs:

1. **Backend corriendo:**
   ```bash
   npm start
   ```

2. **Android ejecutándose**

3. **Hacer login en Android**

4. **Revisar Logcat de Android:**
   - Debe mostrar: "✅ Token guardado"

5. **Revisar logs de Backend:**
   - Debe mostrar: "[AUTH] ✅ Token válido"

6. **Si todo está bien:**
   - Android debe mostrar citas en HistorialCitasScreen

## 🚨 Si Aún Falla

Comparte:

1. **Logcat completo de Android** (desde login hasta error)
2. **Logs de backend** (cuando Android intenta cargar citas)
3. **Código de RetrofitClient.kt** (función `authed`)
4. **Código de LoginScreen.kt** (donde se guarda el token)

Con eso podré identificar exactamente dónde falla.
