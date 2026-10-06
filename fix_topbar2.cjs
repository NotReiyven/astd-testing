const fs = require('fs');
let c = fs.readFileSync('src/app/components/layout/TopBar.tsx', 'utf8');

c = c.replace(
  '{n.type === "warning" ? ( <> <strong className="font-bold text-destructive">System Notice:</strong> {n.message} </> ) : ( <> <strong className="font-bold">{n.actor?.username || "Someone"}</strong> {" "} {n.type === "reply" ? "replied to your comment" : "commented on your trade ad"}. </> )}',
  `{n.type === "warning" ? ( <> <strong className="font-bold text-destructive">System Notice:</strong> {n.message} </> ) : n.type === "system" ? ( <> <strong className="font-bold text-success">System:</strong> {n.message} </> ) : n.type === "upvote" ? ( <> <strong className="font-bold">{n.actor?.username || "Someone"}</strong> upvoted your trade ad. </> ) : ( <> <strong className="font-bold">{n.actor?.username || "Someone"}</strong> {" "} {n.type === "reply" ? "replied to your comment" : "commented on your trade ad"}. </> )}`
);

fs.writeFileSync('src/app/components/layout/TopBar.tsx', c);
console.log('Fixed TopBar.tsx');
