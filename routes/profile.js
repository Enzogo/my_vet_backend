const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const User = require('../models/User');
const Dueno = require('../models/Dueno');
const Veterinario = require('../models/Veterinario');

// GET /api/profile/me -> devuelve el perfil según el role
router.get('/me', auth, async (req, res) => {
  try {
    const { id, role } = req.auth;

    // Aseguramos que el usuario existe
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (role === 'dueno') {
      const perfil = await Dueno.findOne({ user: id })
        .populate({ path: 'user', select: 'email role nombre' })
        .lean();
      if (!perfil) return res.status(404).json({ message: 'Perfil de dueño no encontrado' });
      return res.json({ role, perfil });
    }

    if (role === 'veterinario') {
      const perfil = await Veterinario.findOne({ user: id })
        .populate({ path: 'user', select: 'email role nombre' })
        .lean();
      if (!perfil) return res.status(404).json({ message: 'Perfil de veterinario no encontrado' });
      return res.json({ role, perfil });
    }

    return res.status(400).json({ message: 'Role no soportado' });
  } catch (e) {
    console.error('[MyVet] Error en GET /api/profile/me:', e);
    res.status(500).json({ message: 'Error interno' });
  }
});

module.exports = router;