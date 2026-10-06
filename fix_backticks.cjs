const fs = require('fs');
let c = fs.readFileSync('src/store/useNotificationStore.ts', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('src/store/useNotificationStore.ts', c);
