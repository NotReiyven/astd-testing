const fs = require('fs');
let c = fs.readFileSync('src/app/components/layout/TopBar.tsx', 'utf8');

if (!c.includes('import { Link } from "react-router-dom";')) {
  c = c.replace(
    'import { useNotificationStore } from',
    'import { Link } from "react-router-dom";\nimport { useNotificationStore } from'
  );
}

// First, fix the warning -> system -> upvote -> reply/comment map
c = c.replace(
  '{n.type === "warning" ? ( <> <strong className="font-bold text-destructive">System Notice:</strong> {n.message} </> ) : ( <> <strong className="font-bold">{n.actor?.username || "Someone"}</strong> {" "} {n.type === "reply" ? "replied to your comment" : "commented on your trade ad"}. </> )}',
  `{n.type === "warning" ? ( <> <strong className="font-bold text-destructive">System Notice:</strong> {n.message} </> ) : n.type === "system" ? ( <> <strong className="font-bold text-success">System:</strong> {n.message} </> ) : n.type === "upvote" ? ( <> <strong className="font-bold">{n.actor?.username || "Someone"}</strong> upvoted your trade ad. </> ) : ( <> <strong className="font-bold">{n.actor?.username || "Someone"}</strong> {" "} {n.type === "reply" ? "replied to your comment" : "commented on your trade ad"}. </> )}`
);

// Add "View all notifications" link at the bottom of the dropdown
if (!c.includes('View all notifications')) {
  c = c.replace(
    /                        <\/button>\n                      \)\)\n                    \)\}\n                  <\/div>/g,
    `                        </button>\n                      ))\n                    )}\n                  </div>\n                  <div className="p-2 border-t border-border bg-popover rounded-b-[6px]">\n                    <Link to="/notifications" onClick={() => setNotificationsOpen(false)} className="block w-full text-center text-[12px] font-bold text-primary hover:text-white transition-colors p-2 bg-primary/10 hover:bg-primary/20 rounded-md">\n                      View all notifications\n                    </Link>\n                  </div>`
  );
}

fs.writeFileSync('src/app/components/layout/TopBar.tsx', c);
console.log('Fixed TopBar.tsx');
