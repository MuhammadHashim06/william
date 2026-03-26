
import 'dotenv/config';
import { createPool } from 'mariadb';

async function main() {
    console.log('--- Testing Undefined URL Behavior ---');
    try {
        const pool = createPool({
            // url: undefined, // removed to fix TS error, defaults apply
            connectionLimit: 20,
            acquireTimeout: 5000, // Shorten for test
        });

        console.log('Pool created with undefined URL.');
        // Check inferred config if possible
        // Does it report limit=10?

        console.log('Attempting connection...');
        const conn = await pool.getConnection();
        console.log('Connected! (Unexpected)');
        conn.release();
    } catch (e: any) {
        console.log('Connection failed as expected.');
        console.log('Error:', e.message);
        // Check if error mentions "limit=10"
    }

    console.log('--- Testing Configured Limit ---');
    try {
        const pool2 = createPool({
            url: process.env.DATABASE_URL!,
            connectionLimit: 25, // Unique number
            acquireTimeout: 5000,
        } as any);
        // We can't easily check internal limit without private access or provoking error
        // But if we can connect, it works.
        const conn = await pool2.getConnection();
        console.log('Connected with valid URL.');
        conn.release();
        await pool2.end();
    } catch (e: any) {
        console.log('Valid URL connection failed:', e.message);
    }
}

main();
