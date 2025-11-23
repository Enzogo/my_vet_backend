import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Dueno from '../models/Dueno.js';
import Veterinario from '../models/Veterinario.js';

const router = Router();

router.get('/db-info', async (_req, res) => {
  try {
    const conn = mongoose.connection;
    const uri = process.env.MONGO_URI || '';
    const host = (uri.split('@')[1] || '').split('/')[0];
    const dbName = conn.name;

    const colls = await conn.db.listCollections().toArray();
    const collections = colls.map(c => c.name).sort();

    const counts = {};
    counts.users = await User.countDocuments().catch(() => 0);
    counts.duenos = await Dueno.countDocuments().catch(() => 0);
    counts.veterinarios = await Veterinario.countDocuments().catch(() => 0);

    res.json({ host, dbName, collections, counts });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;