
const urlStr = "mysql://user:pass%23word@localhost:3306/db";
const url = new URL(urlStr);

console.log('href:', url.href);
console.log('password:', url.password);
console.log('decodeURIComponent(password):', decodeURIComponent(url.password));

// Test if URL.password is automatically decoded
// Node.js URL implementation usually does NOT decode automatically for password property?
// Actually it usually does NOT.
// Let's verify.

const realUrlStr = process.env.DATABASE_URL || urlStr;
const realUrl = new URL(realUrlStr);
console.log('Real password encoded:', realUrl.password);
console.log('Real password decoded:', decodeURIComponent(realUrl.password));
