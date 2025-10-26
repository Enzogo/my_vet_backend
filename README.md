# MyVet Backend

Backend API para la aplicación MyVet - Sistema de gestión veterinaria.

## Características

- **Autenticación JWT**: Registro y login con roles (dueño/veterinario)
- **Gestión de Perfil**: Actualización de datos personales
- **Mascotas CRUD**: Crear, leer, actualizar y eliminar mascotas
- **Citas CRUD**: Gestión completa de citas veterinarias
- **Feedback**: Sistema de calificaciones y sugerencias
- **Pre-diagnóstico AI**: Análisis de síntomas con Gemini AI
- **Control de acceso por roles**: Endpoints específicos para veterinarios
- **Health Check**: Endpoint para monitorear el estado del servicio

## Tecnologías

- Node.js con ES Modules
- Express.js
- MongoDB (con Mongoose)
- JWT para autenticación
- bcrypt para encriptación de contraseñas
- Google Generative AI (Gemini)
- Helmet para seguridad
- CORS habilitado

## Instalación

1. Clone el repositorio:
```bash
git clone <repository-url>
cd my_vet_backend
```

2. Instale las dependencias:
```bash
npm install
```

3. Configure las variables de entorno:
```bash
cp .env.example .env
```

Edite el archivo `.env` con sus valores:

```env
PORT=4000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/my_vet
JWT_SECRET=un_secreto_muy_largo_y_seguro_cambiar_en_produccion
SALT_ROUNDS=10
GEMINI_API_KEY=AIza...tu_api_key_de_google_gemini
```

### Variables de Entorno

| Variable | Descripción | Requerido | Ejemplo |
|----------|-------------|-----------|---------|
| `PORT` | Puerto del servidor | No | `4000` |
| `MONGODB_URI` | URI de conexión a MongoDB Atlas | Sí | `mongodb+srv://user:pass@cluster.mongodb.net/my_vet` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | Sí | String largo y aleatorio |
| `SALT_ROUNDS` | Rounds para bcrypt | No | `10` |
| `GEMINI_API_KEY` | API Key de Google Gemini | No* | `AIza...` |

*Si no se proporciona `GEMINI_API_KEY`, el endpoint de pre-diagnóstico usará una respuesta de fallback segura.

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:4000`

## Estructura del Proyecto

```
my_vet_backend/
├── models/           # Modelos de Mongoose
│   ├── User.js      # Usuario (dueño/veterinario)
│   ├── Mascota.js   # Mascotas
│   ├── Cita.js      # Citas veterinarias
│   └── Feedback.js  # Feedback de usuarios
├── routes/          # Rutas de la API
│   ├── auth.js      # Autenticación (register/login)
│   ├── owners.js    # API para dueños
│   ├── vet.js       # API para veterinarios
│   ├── feedback.js  # Sistema de feedback
│   └── ai.js        # Pre-diagnóstico con AI
├── middleware/      # Middleware de Express
│   └── auth.js      # Verificación de JWT
├── index.js         # Punto de entrada principal
└── package.json     # Dependencias y scripts

```

## API Endpoints

### Autenticación

#### POST /api/auth/register
Registrar nuevo usuario.

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "password123",
  "role": "dueno",
  "nombre": "Juan Pérez"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "usuario@email.com",
    "role": "dueno",
    "nombre": "Juan Pérez"
  }
}
```

#### POST /api/auth/login
Iniciar sesión.

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "password123"
}
```

**Response:** Igual que register

### Perfil de Usuario (Dueño)

#### POST /api/owners/me/profile
Actualizar perfil del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "telefono": "123456789",
  "direccion": "Calle Principal 123"
}
```

**Response:** `true`

### Mascotas

#### GET /api/owners/me/mascotas
Obtener mascotas del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "nombre": "Firulais",
    "especie": "perro",
    "raza": "Golden Retriever"
  }
]
```

#### POST /api/owners/me/mascotas
Crear nueva mascota.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "nombre": "Firulais",
  "especie": "perro",
  "raza": "Golden Retriever",
  "fechaNacimiento": "2020-01-15",
  "sexo": "macho"
}
```

#### PUT /api/owners/me/mascotas/:id
Actualizar mascota existente.

**Headers:** `Authorization: Bearer <token>`

**Body:** Campos a actualizar

#### DELETE /api/owners/me/mascotas/:id
Eliminar mascota.

**Headers:** `Authorization: Bearer <token>`

**Response:** `true`

### Citas

#### GET /api/owners/me/citas
Obtener citas del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "fechaIso": "2025-11-01T10:00:00Z",
    "motivo": "Vacunación",
    "mascotaId": "507f1f77bcf86cd799439012",
    "estado": "pendiente"
  }
]
```

#### POST /api/owners/me/citas
Crear nueva cita.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "fechaIso": "2025-11-01T10:00:00Z",
  "motivo": "Vacunación",
  "mascotaId": "507f1f77bcf86cd799439012"
}
```

#### PUT /api/owners/me/citas/:id
Reprogramar/actualizar cita.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "fechaIso": "2025-11-02T14:00:00Z",
  "motivo": "Vacunación y revisión"
}
```

#### DELETE /api/owners/me/citas/:id
Eliminar cita.

**Headers:** `Authorization: Bearer <token>`

**Response:** `true`

### Feedback

#### POST /api/feedback
Crear feedback.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rating": 5,
  "sugerencia": "Excelente servicio"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "rating": 5,
  "sugerencia": "Excelente servicio",
  "createdAt": "2025-10-26T15:00:00.000Z"
}
```

#### GET /api/feedback/mine
Obtener feedback propio.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/feedback
Obtener todo el feedback (admin/vet).

**Headers:** `Authorization: Bearer <token>`

### Pre-diagnóstico AI

#### POST /api/ai/prediagnostico
Obtener pre-diagnóstico basado en síntomas.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "sintomas": "Mi perro no quiere comer y está muy decaído",
  "especie": "perro",
  "edad": "5 años",
  "sexo": "macho"
}
```

**Response:**
```json
{
  "recomendaciones": [
    "Mantén a tu mascota hidratada",
    "Observa si hay otros síntomas"
  ],
  "red_flags": [
    "Vómito persistente",
    "Dificultad para respirar"
  ],
  "disclaimer": "Esta información es solo orientativa...",
  "es_fallback": false
}
```

### Veterinario

#### GET /api/vet/owners
Listar todos los dueños (solo veterinarios).

**Headers:** `Authorization: Bearer <token>` (role: veterinario)

#### GET /api/vet/mascotas
Listar todas las mascotas (solo veterinarios).

**Headers:** `Authorization: Bearer <token>` (role: veterinario)

#### GET /api/vet/citas
Listar todas las citas (solo veterinarios).

**Headers:** `Authorization: Bearer <token>` (role: veterinario)

### Health Check

#### GET /api/health
Verificar estado del servidor.

**Response:**
```json
{
  "ok": true
}
```

## Colecciones de MongoDB

El backend utiliza las siguientes colecciones:

- **users**: Usuarios del sistema (dueños y veterinarios)
- **mascotas**: Mascotas registradas
- **citas**: Citas veterinarias
- **feedback**: Calificaciones y sugerencias de usuarios

## Seguridad

- Contraseñas encriptadas con bcrypt
- Autenticación JWT con expiración de 7 días
- Helmet para headers de seguridad
- CORS configurado
- Validación de roles en endpoints protegidos
- Validación de propiedad de recursos (mascotas/citas)

## Códigos de Error

- **400**: Bad Request - Datos inválidos o faltantes
- **401**: Unauthorized - Token faltante o inválido
- **403**: Forbidden - Acceso denegado (rol insuficiente)
- **404**: Not Found - Recurso no encontrado
- **409**: Conflict - Recurso ya existe (ej. email duplicado)
- **500**: Internal Server Error - Error del servidor

## Desarrollo

Para contribuir al proyecto:

1. Cree una nueva rama para su feature
2. Realice sus cambios
3. Asegúrese de probar todos los endpoints
4. Envíe un pull request

## Licencia

[Especificar licencia]
