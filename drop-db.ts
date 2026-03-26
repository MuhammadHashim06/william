import { createPool } from "mariadb";

async function dropDb() {
    console.log("Connecting as root to drop 'william'...");

    try {
        // Connect to 'mysql' system DB first
        const pool = createPool({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "Abdur#0311",
            database: "mysql",
            connectionLimit: 1
        });

        const conn = await pool.getConnection();
        console.log("Connected successfully! Dropping DB...");

        await conn.query("DROP DATABASE IF EXISTS william");
        console.log("Database 'william' dropped.");

        await conn.query("CREATE DATABASE william CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        console.log("Database 'william' recreated.");

        conn.release();
        await pool.end();
        console.log("Pool closed.");

    } catch (e) {
        console.error("Drop failed:", e);
    }
}

dropDb();
