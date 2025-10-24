const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

let User, Dueno, Veterinario;
try { User = require('../models/User'); } catch {}
try { Dueno = require('../models/Dueno'); } catch {}
try { Veterinario = require('../models/Veterinario'); } catch {}

router.get('/db-info', async (_req, res) => {
  try {
    const conn = mongoose.connection;
    const uri = process.env.MONGO_URI || '';
    const host = (uri.split('@')[1] || '').split('/')[0];
    const dbName = conn.name;

    const colls = await conn.db.listCollections().toArray();
    const collections = colls.map(c => c.name).sort();

    const counts = {};
    if (User) counts.users = await User.countDocuments().catch(() => 0);
    if (Dueno) counts.duenos = await Dueno.countDocuments().catch(() => 0);
    if (Veterinario) counts.veterinarios = await Veterinario.countDocuments().catch(() => 0);

    res.json({ host, dbName, collections, counts });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;