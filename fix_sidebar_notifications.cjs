const fs = require('fs');
let c = fs.readFileSync('src/app/components/Sidebar.tsx', 'utf8');

if (!c.includes('BellRing')) {
  c = c.replace('import {', 'import { BellRing,');
}

if (!c.includes('id: "notifications"')) {
  c = c.replace(
    '{ id: "profile", label: "my-profile"',
    '{ id: "notifications", label: "notifications", isLocked: true, icon: BellRing },\n        { id: "profile", label: "my-profile"'
  );
}

fs.writeFileSync('src/app/components/Sidebar.tsx', c);
console.log('Fixed Sidebar.tsx');
