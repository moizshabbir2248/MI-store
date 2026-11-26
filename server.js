require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'M Idrees 46 14';
const DATABASE_URL = process.env.DATABASE_URL || '';

let pool = null;
let dbInitPromise = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const PUBLIC_DIR = path.join(process.cwd(), 'public');

app.use(express.static(PUBLIC_DIR));

const DEFAULT_PRODUCTS = [
  { id: 1, title: 'Royal Chronograph Black', category: 'mens-watches', price: 8500, originalPrice: 12000, badge: 'Sale', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80', section: ['best-sellers', 'new-arrivals'], description: 'Premium stainless steel chronograph with black dial.' },
  { id: 2, title: 'Elegance Rose Gold', category: 'ladies-watches', price: 7200, originalPrice: 10500, badge: 'Sale', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80', section: ['best-sellers'], description: 'Elegant rose gold watch for a refined look.' },
  { id: 3, title: 'Aviator Classic Sunglasses', category: 'glasses', price: 3500, originalPrice: 5000, badge: 'Sale', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80', section: ['best-sellers', 'new-arrivals'], description: 'Timeless aviator sunglasses with UV protection.' },
  { id: 4, title: 'Midnight Luxe Edition', category: 'mens-watches', price: 15500, originalPrice: 22000, badge: 'Sale', image: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800&q=80', section: ['best-sellers'], description: 'Luxury edition watch with midnight black finish.' },
  { id: 5, title: 'Pearl Dial Ladies Watch', category: 'ladies-watches', price: 6800, originalPrice: 9500, badge: 'Sale', image: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=800&q=80', section: ['new-arrivals'], description: 'Delicate pearl dial with premium strap.' },
  { id: 6, title: 'Urban Square Sunglasses', category: 'glasses', price: 2900, originalPrice: 4200, badge: 'Sale', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80', section: ['new-arrivals'], description: 'Modern square frame sunglasses for everyday style.' },
  { id: 7, title: 'Gold Prestige Automatic', category: 'mens-watches', price: 18500, originalPrice: 25000, badge: 'Sale', image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=800&q=80', section: ['new-arrivals', 'best-sellers'], description: 'Automatic gold prestige watch with premium craftsmanship.' },
  { id: 8, title: 'Crystal Bloom Ladies Watch', category: 'ladies-watches', price: 7900, originalPrice: 11000, badge: 'Sale', image: 'https://images.unsplash.com/photo-1509941943102-10c232535736?auto=format&fit=crop&w=800&q=80', section: ['best-sellers'], description: 'Crystal-accented ladies watch with elegant bloom design.' }
];

function mapProductRow(r) {
  return {
    id: Number(r.id),
    title: r.title,
    category: r.category,
    price: Number(r.price),
    originalPrice: r.original_price == null ? null : Number(r.original_price),
    badge: r.badge || '',
    image: r.image || '',
    description: r.description || '',
    section: Array.isArray(r.section) ? r.section : []
  };
}

function requireAdmin(req, res, next) {
  const pass = req.get('x-admin-password') || req.body?.adminPassword || req.query?.adminPassword;
  if (!ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  if (pass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized: invalid admin password' });
  next();
}

function normalizeProduct(body = {}, existing = {}) {
  const title = String(body?.title ?? body?.name ?? existing.title ?? '').trim();
  const category = String(body?.category ?? existing.category ?? 'mens-watches').trim() || 'mens-watches';
  const priceRaw = body?.price ?? existing.price;
  const price = Number(priceRaw);
  const originalPriceRaw = body?.originalPrice ?? existing.originalPrice ?? null;
  const originalPrice = (originalPriceRaw === '' || originalPriceRaw === null || originalPriceRaw === undefined)
    ? null
    : Number(originalPriceRaw);
  const badge = String(body?.badge ?? existing.badge ?? '').trim();
  const image = String(body?.image ?? body?.imageUrl ?? existing.image ?? '').trim();
  const description = String(body?.description ?? existing.description ?? '').trim();
  let section = body?.section ?? existing.section ?? ['new-arrivals'];
  if (!Array.isArray(section)) section = ['new-arrivals'];

  if (!title) return { error: 'Title is required' };
  if (priceRaw === '' || priceRaw === null || priceRaw === undefined || !Number.isFinite(price) || price < 0) {
    return { error: 'Valid price is required' };
  }
  if (!image) return { error: 'Image is required' };

  return {
    value: {
      title,
      category,
      price,
      originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
      badge,
      image,
      description,
      section
    }
  };
}

async function initDb() {
  const db = getPool();
  if (!db) throw new Error('DATABASE_URL is not configured');

  await db.query('SELECT 1');
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'mens-watches',
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      original_price NUMERIC(12,2),
      badge TEXT DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      section JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count === 0) {
    for (const p of DEFAULT_PRODUCTS) {
      await db.query(
        `INSERT INTO products (id, title, category, price, original_price, badge, image, description, section)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.title, p.category, p.price, p.originalPrice ?? null, p.badge || '', p.image || '', p.description || '', JSON.stringify(p.section || [])]
      );
    }
    await db.query(`SELECT setval(pg_get_serial_sequence('products','id'), GREATEST((SELECT MAX(id) FROM products), 1))`);
  }
}

async function ensureDb() {
  if (!DATABASE_URL) {
    const err = new Error('DATABASE_URL is not configured');
    err.status = 503;
    throw err;
  }
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((err) => {
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

app.get('/api/health', async (_req, res) => {
  try {
    if (!DATABASE_URL) {
      return res.status(200).json({ ok: true, db: false, store: 'MI STORE', message: 'DATABASE_URL not configured' });
    }
    await ensureDb();
    await getPool().query('SELECT 1');
    res.json({ ok: true, db: true, store: 'MI STORE' });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, error: err.message, store: 'MI STORE' });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    await ensureDb();
    const { rows } = await getPool().query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows.map(mapProductRow));
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    await ensureDb();
    const { value, error } = normalizeProduct(req.body);
    if (error) return res.status(400).json({ error });

    const { rows } = await getPool().query(
      `INSERT INTO products (title, category, price, original_price, badge, image, description, section, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW())
       RETURNING *`,
      [value.title, value.category, value.price, value.originalPrice, value.badge, value.image, value.description, JSON.stringify(value.section || [])]
    );
    res.status(201).json(mapProductRow(rows[0]));
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to create product', details: err.message });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    await ensureDb();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const existingRes = await getPool().query('SELECT * FROM products WHERE id=$1', [id]);
    if (!existingRes.rows[0]) return res.status(404).json({ error: 'Product not found' });

    const existing = mapProductRow(existingRes.rows[0]);
    const { value, error } = normalizeProduct(req.body, existing);
    if (error) return res.status(400).json({ error });

    const { rows } = await getPool().query(
      `UPDATE products
       SET title=$1, category=$2, price=$3, original_price=$4, badge=$5, image=$6, description=$7, section=$8::jsonb, updated_at=NOW()
       WHERE id=$9
       RETURNING *`,
      [value.title, value.category, value.price, value.originalPrice, value.badge, value.image, value.description, JSON.stringify(value.section || []), id]
    );
    res.json(mapProductRow(rows[0]));
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to update product', details: err.message });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    await ensureDb();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = await getPool().query('DELETE FROM products WHERE id=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to delete product', details: err.message });
  }
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (!process.env.VERCEL) {
  ensureDb()
    .then(() => {
      app.listen(PORT, () => console.log(`MI STORE running at http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('DB init failed on startup:', err.message);
      app.listen(PORT, () => console.log(`MI STORE running at http://localhost:${PORT} (DB init pending/retryable)`));
    });
}

module.exports = app;
