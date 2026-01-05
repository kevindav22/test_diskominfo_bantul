/**
 * File: server.js
 * Deskripsi: Express Server untuk menampilkan data Pokemon sesuai kriteria sorting dan filtering.
 * Jalankan: node server.js
 */

import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Koneksi Database
const db = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pokemon_db',
});

// Middleware agar Express bisa membaca file gambar dari local path
app.use('/pokemon_images', express.static(path.join(__dirname, 'pokemon_images')));

app.get('/', async (req, res) => {
  const filter = req.query.filter || 'ALL';
  
  // Query dasar dengan Sorting Berat Terbesar ke Terkecil
  let query = `
    SELECT p.*, GROUP_CONCAT(a.name SEPARATOR ', ') as abilities_list
    FROM pokemons p
    LEFT JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
    LEFT JOIN abilities a ON pa.ability_id = a.id
  `;

  // Logika Filtering
  if (filter === 'Light') query += ' WHERE p.weight BETWEEN 100 AND 150';
  else if (filter === 'Medium') query += ' WHERE p.weight BETWEEN 151 AND 199';
  else if (filter === 'Heavy') query += ' WHERE p.weight >= 200';

  query += ' GROUP BY p.id ORDER BY p.weight DESC';

  const [pokemons] = await db.execute(query);

  // Template HTML Sederhana
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pokemon Data</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f4f4f4; }
        .container { display: flex; flex-wrap: wrap; gap: 20px; }
        .card { background: white; padding: 15px; border-radius: 8px; width: 200px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
        img { width: 100px; height: 100px; object-fit: contain; }
        .filter-box { margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>Daftar Pokemon</h1>
      
      <div class="filter-box">
        <form method="GET">
          <label>Filter Berat: </label>
          <select name="filter" onchange="this.form.submit()">
            <option value="ALL" ${filter === 'ALL' ? 'selected' : ''}>ALL (Semua)</option>
            <option value="Light" ${filter === 'Light' ? 'selected' : ''}>Light (100-150)</option>
            <option value="Medium" ${filter === 'Medium' ? 'selected' : ''}>Medium (151-199)</option>
            <option value="Heavy" ${filter === 'Heavy' ? 'selected' : ''}>Heavy (>= 200)</option>
          </select>
        </form>
      </div>

      <div class="container">
  `;

  pokemons.forEach(p => {
    // Ambil hanya nama file dari path lengkap untuk URL gambar
    const imgName = path.basename(p.image_path);
    html += `
      <div class="card">
        <img src="/pokemon_images/${imgName}" alt="${p.name}">
        <h3>${p.name.toUpperCase()}</h3>
        <p>Exp: ${p.base_experience}</p>
        <p><b>Berat: ${p.weight}</b></p>
        <p><small>Abilities: ${p.abilities_list || '-'}</small></p>
      </div>
    `;
  });

  html += `</div></body></html>`;
  res.send(html);
});

app.listen(port, () => {
  console.log(`Server jalan di http://localhost:${port}`);
});