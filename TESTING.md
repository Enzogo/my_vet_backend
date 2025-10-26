### Manual Testing Guide for MyVet Backend

This file contains manual test cases for all API endpoints.

## Prerequisites
- MongoDB instance running (local or Atlas)
- .env file configured with valid credentials
- Server running on configured PORT (default 4000)

## Test Flow

### 1. Health Check
```bash
curl http://localhost:4000/api/health
```
Expected: `{"ok":true}`

### 2. Register a Dueño (Owner)
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dueno@test.com",
    "password": "password123",
    "role": "dueno",
    "nombre": "Juan Pérez"
  }'
```
Expected: `{ "token": "...", "user": { "id": "...", "email": "dueno@test.com", "role": "dueno", "nombre": "Juan Pérez" } }`
Save the token as `DUENO_TOKEN`

### 3. Register a Veterinario
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vet@test.com",
    "password": "password123",
    "role": "veterinario",
    "nombre": "Dr. García"
  }'
```
Expected: Token and user data
Save the token as `VET_TOKEN`

### 4. Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dueno@test.com",
    "password": "password123"
  }'
```
Expected: Same token format as register

### 5. Update Profile
```bash
curl -X POST http://localhost:4000/api/owners/me/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "nombre": "Juan Pérez Actualizado",
    "telefono": "123456789",
    "direccion": "Calle Principal 123"
  }'
```
Expected: `true`

### 6. Create Mascota
```bash
curl -X POST http://localhost:4000/api/owners/me/mascotas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "nombre": "Firulais",
    "especie": "perro",
    "raza": "Golden Retriever",
    "fechaNacimiento": "2020-01-15",
    "sexo": "macho"
  }'
```
Expected: `{ "id": "...", "nombre": "Firulais", "especie": "perro", "raza": "Golden Retriever" }`
Save the id as `MASCOTA_ID`

### 7. Get Mascotas
```bash
curl -X GET http://localhost:4000/api/owners/me/mascotas \
  -H "Authorization: Bearer $DUENO_TOKEN"
```
Expected: Array with the created mascota

### 8. Update Mascota
```bash
curl -X PUT http://localhost:4000/api/owners/me/mascotas/$MASCOTA_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "nombre": "Firulais Actualizado",
    "raza": "Labrador"
  }'
```
Expected: Updated mascota data

### 9. Create Cita
```bash
curl -X POST http://localhost:4000/api/owners/me/citas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "fechaIso": "2025-11-01T10:00:00Z",
    "motivo": "Vacunación",
    "mascotaId": "'$MASCOTA_ID'"
  }'
```
Expected: `{ "id": "...", "fechaIso": "2025-11-01T10:00:00Z", "motivo": "Vacunación", "mascotaId": "...", "estado": "pendiente" }`
Save the id as `CITA_ID`

### 10. Get Citas
```bash
curl -X GET http://localhost:4000/api/owners/me/citas \
  -H "Authorization: Bearer $DUENO_TOKEN"
```
Expected: Array with the created cita

### 11. Reprogramar (Update) Cita
```bash
curl -X PUT http://localhost:4000/api/owners/me/citas/$CITA_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "fechaIso": "2025-11-02T14:00:00Z",
    "motivo": "Vacunación y revisión"
  }'
```
Expected: Updated cita data

### 12. Create Feedback
```bash
curl -X POST http://localhost:4000/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "rating": 5,
    "sugerencia": "Excelente servicio"
  }'
```
Expected: `{ "id": "...", "rating": 5, "sugerencia": "Excelente servicio", "createdAt": "..." }`

### 13. Get Own Feedback
```bash
curl -X GET http://localhost:4000/api/feedback/mine \
  -H "Authorization: Bearer $DUENO_TOKEN"
```
Expected: Array with own feedback

### 14. AI Pre-diagnóstico (without Gemini API Key)
```bash
curl -X POST http://localhost:4000/api/ai/prediagnostico \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "sintomas": "Mi perro no quiere comer y está muy decaído",
    "especie": "perro",
    "edad": "5 años",
    "sexo": "macho"
  }'
```
Expected: Fallback response with `es_fallback: true`

### 15. Veterinario - Get All Owners
```bash
curl -X GET http://localhost:4000/api/vet/owners \
  -H "Authorization: Bearer $VET_TOKEN"
```
Expected: Array of all owners

### 16. Veterinario - Get All Mascotas
```bash
curl -X GET http://localhost:4000/api/vet/mascotas \
  -H "Authorization: Bearer $VET_TOKEN"
```
Expected: Array of all mascotas with owner info

### 17. Veterinario - Get All Citas
```bash
curl -X GET http://localhost:4000/api/vet/citas \
  -H "Authorization: Bearer $VET_TOKEN"
```
Expected: Array of all citas with owner and mascota info

### 18. Delete Cita
```bash
curl -X DELETE http://localhost:4000/api/owners/me/citas/$CITA_ID \
  -H "Authorization: Bearer $DUENO_TOKEN"
```
Expected: `true`

### 19. Delete Mascota
```bash
curl -X DELETE http://localhost:4000/api/owners/me/mascotas/$MASCOTA_ID \
  -H "Authorization: Bearer $DUENO_TOKEN"
```
Expected: `true`

### 20. Test 401 - No Token
```bash
curl -X GET http://localhost:4000/api/owners/me/mascotas
```
Expected: `{ "error": "No token" }` with status 401

### 21. Test 403 - Dueño trying to access Vet endpoint
```bash
curl -X GET http://localhost:4000/api/vet/owners \
  -H "Authorization: Bearer $DUENO_TOKEN"
```
Expected: `{ "error": "Solo veterinarios" }` with status 403

## Testing with Gemini API Key

If you have a valid GEMINI_API_KEY configured in .env:

```bash
curl -X POST http://localhost:4000/api/ai/prediagnostico \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "sintomas": "Mi gato tiene diarrea y vómitos desde hace 2 días",
    "especie": "gato",
    "edad": "3 años",
    "sexo": "hembra"
  }'
```
Expected: AI-generated response with `es_fallback: false`

## Validation Tests

### Test invalid role
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@test.com",
    "password": "password123",
    "role": "admin"
  }'
```
Expected: Error message about invalid role

### Test duplicate email
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dueno@test.com",
    "password": "password123",
    "role": "dueno"
  }'
```
Expected: `{ "message": "Usuario ya existe" }` with status 409

### Test invalid credentials
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dueno@test.com",
    "password": "wrongpassword"
  }'
```
Expected: `{ "message": "Credenciales inválidas" }` with status 401

### Test missing required fields
```bash
curl -X POST http://localhost:4000/api/owners/me/mascotas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "nombre": "Firulais"
  }'
```
Expected: `{ "error": "nombre y especie requeridos" }` with status 400

### Test invalid rating
```bash
curl -X POST http://localhost:4000/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DUENO_TOKEN" \
  -d '{
    "rating": 10,
    "sugerencia": "Test"
  }'
```
Expected: `{ "error": "rating debe estar entre 1 y 5" }` with status 400

## MongoDB Collections Verification

After running the tests, verify the collections exist in MongoDB:

```bash
# Connect to MongoDB and run:
use my_vet
show collections
```

Expected collections:
- users
- mascotas
- citas
- feedback

Query examples:
```javascript
db.users.find().pretty()
db.mascotas.find().pretty()
db.citas.find().pretty()
db.feedback.find().pretty()
```
