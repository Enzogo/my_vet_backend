const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Dueno = require('../models/Dueno');
const Veterinario = require('../models/Veterinario');

const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esto_por_una_clave_segura';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

function normalizeRole(input) {
  if (!input) return '';
  const r = String(input).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  if (r === 'cliente') return 'dueno';
  if (r === 'dueno' || r === 'duenio' || r === 'duenho') return 'dueno';
  return r;
}

router.post('/register', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { email, password, role, nombre, telefono, direccion, especialidad, licencia, clinica } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: 'Faltan campos' });

    const roleNorm = normalizeRole(role);
    if (!['dueno', 'veterinario'].includes(roleNorm)) {
      return res.status(400).json({ message: "role debe ser 'dueno' o 'veterinario'" });
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(409).json({ message: 'Usuario ya existe' });

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    let userDoc;
    await session.withTransaction(async () => {
      const created = await User.create([{ email, passwordHash, role: roleNorm, nombre }], { session });
      userDoc = created[0];

      if (roleNorm === 'dueno') {
        await Dueno.create([{ user: userDoc._id, nombre, telefono: telefono || null, direccion: direccion || null }], { session });
      } else {
        await Veterinario.create([{
          user: userDoc._id,
          nombre,
          especialidad: especialidad || null,
          licencia: licencia || null,
          clinica: clinica || null,
        }], { session });
      }
    });

    const token = jwt.sign({ id: userDoc._id, role: userDoc.role, email: userDoc.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userDoc._id, email: userDoc.email, role: userDoc.role, nombre: userDoc.nombre } });
  } catch (err) {
    console.error('[MyVet] Error en /register:', err);
    if (err?.code === 11000) return res.status(409).json({ message: 'Perfil ya existe para este usuario' });
    res.status(500).json({ message: 'Error interno' });
  } finally {
    session.endSession();
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan campos' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, nombre: user.nombre } });
  } catch (err) {
    console.error('[MyVet] Error en /login:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

module.exports = router;