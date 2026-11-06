const os = require('os');
const ifs = os.networkInterfaces();
let ip = '192.168.0.105';

for (const [name, list] of Object.entries(ifs)) {
  for (const item of list) {
    if ((item.family === 'IPv4' || item.family === 4) && !item.internal) {
      if (item.address.startsWith('192.168.')) {
        console.log(item.address);
        process.exit(0);
      }
    }
  }
}

console.log(ip);

