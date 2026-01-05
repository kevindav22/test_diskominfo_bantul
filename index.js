import axios from 'axios';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  let db;
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pokemon_db',
    });

    const imgFolder = path.join(__dirname, 'pokemon_images');
    if (!fs.existsSync(imgFolder)) fs.mkdirSync(imgFolder, { recursive: true });

    console.log('Memulai.....');

    for (let id = 1; id <= 400; id++) {
      try {
        const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const poke = res.data;
        if (poke.weight >= 100) {
          const imgUrl = poke.sprites.front_default;
          const fileName = `${poke.name}.png`;
          
          const imgPath = path.join(imgFolder, fileName);

          if (imgUrl) {
            const imgRes = await axios({ url: imgUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(imgPath);
            imgRes.data.pipe(writer);

            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
          }

          await db.execute('INSERT IGNORE INTO pokemons (id, name, base_experience, weight, image_path) VALUES (?, ?, ?, ?, ?)', [poke.id, poke.name, poke.base_experience, poke.weight, imgPath]);

          for (const item of poke.abilities) {
            if (!item.is_hidden) {
              const abilityName = item.ability.name;

              await db.execute('INSERT IGNORE INTO abilities (name) VALUES (?)', [abilityName]);

              const [rows] = await db.execute('SELECT id FROM abilities WHERE name = ?', [abilityName]);
              const abilityId = rows[0].id;

              await db.execute('INSERT IGNORE INTO pokemon_abilities (pokemon_id, ability_id) VALUES (?, ?)', [poke.id, abilityId]);
            }
          }
          console.log(`Berhasil Simpan: ${poke.name} (Berat: ${poke.weight})`);
        }
      } catch (err) {
        console.error(`ID ${id} gagal diproses atau tidak ditemukan.`);
      }
    }
    console.log('Semua proses selesai!');
  } catch (err) {
    console.error('Gagal koneksi database:', err.message);
  } finally {
    if (db) await db.end();
    process.exit();
  }
}

main();

