const fs = require('fs');
let c = fs.readFileSync('src/app/components/layout/TopBar.tsx', 'utf8');

if (!c.includes('import { Link } from "react-router-dom"')) {
  c = c.replace(
    'import { useNotificationStore } from',
    'import { Link } from "react-router-dom";\nimport { useNotificationStore } from'
  );
}

// Ensure we don't duplicate it
if (!c.includes('View all notifications')) {
  const targetRegex = /(<div className="flex flex-col max-h-\[350px\] overflow-y-auto custom-scrollbar">[\s\S]*?<\/div>)/;
  const replacement = `$1\n                    <div className="p-2 border-t border-border bg-popover rounded-b-[6px]">
                      <Link to="/notifications" onClick={() => setNotificationsOpen(false)} className="block w-full text-center text-[12px] font-bold text-primary hover:text-white transition-colors p-2 bg-primary/10 hover:bg-primary/20 rounded-md">
                        View all notifications
                      </Link>
                    </div>`;
  c = c.replace(targetRegex, replacement);
}

fs.writeFileSync('src/app/components/layout/TopBar.tsx', c);
console.log('Fixed TopBar.tsx link');
