const fs = require('fs');
let c = fs.readFileSync('src/app/components/Sidebar.tsx', 'utf8');
c = c.replace('import { BellRing, useState, useMemo } from "react";', 'import { useState, useMemo } from "react";');
c = c.replace('User,', 'User,\n  BellRing,');
fs.writeFileSync('src/app/components/Sidebar.tsx', c);
