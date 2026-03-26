
const mariadb = require('mariadb');
require('dotenv').config();

async function main() {
    const url = process.env.DATABASE_URL.replace('localhost', '127.0.0.1');
    console.log('Connecting to:', url.replace(/:[^:@]*@/, ':****@'));

    const pool = mariadb.createPool({
        url: url, // mariadb supports url property in config? Or just string?
        // documentation says createPool(url) OR createPool(config) OR createPool(url, config)
    });

    // Trying createPool(string) logic
    // Actually, let's use what I used in db.ts originally

    try {
        const conn = await pool.getConnection();
        console.log('SUCCESS: Connected to DB!');
        const rows = await conn.query('SELECT 1 as val');
        console.log('Query result:', rows);
        conn.release();
    } catch (e) {
        console.error('FAILED:', e);
    } finally {
        await pool.end();
    }
}

main();
