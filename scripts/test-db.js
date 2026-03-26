
const mariadb = require('mariadb');
const pool = mariadb.createPool({
     host: '127.0.0.1', 
     user:'root', 
     password: 'Hashim#06',
     database: 'william',
     connectionLimit: 5,
     allowPublicKeyRetrieval: true
});

async function asyncFunction() {
    let conn;
    try {
	conn = await pool.getConnection();
	const rows = await conn.query("SELECT 1 as val");
	console.log(rows); dump
    } catch (err) {
	throw err;
    } finally {
	if (conn) return conn.end();
    }
}
asyncFunction().catch(console.error).finally(() => pool.end());
