import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role
  };
  // exp: 7 días
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, role, nombre } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password y role son obligatorios' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, nombre: nombre || '' });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email, role: user.role, nombre: user.nombre || null }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error en registro' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id.toString(), email: user.email, role: user.role, nombre: user.nombre || null }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error en login' });
  }
});

export default router;