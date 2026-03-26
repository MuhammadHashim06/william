
import 'dotenv/config';

console.log('--- Worker Env Debug ---');
console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
    // check for suspicious chars
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 10));
} else {
    console.log('DATABASE_URL IS MISSING!');
}

async function main() {
    // Just exit
}
main();
