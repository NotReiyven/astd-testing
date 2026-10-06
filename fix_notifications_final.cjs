const fs = require('fs');
let c = fs.readFileSync('src/app/components/NotificationsChannel.tsx', 'utf8');

c = c.replace(/className=\\{\\\`group/g, 'className={`group');
c = c.replace(/border \\\$\\{/g, 'border ${');
c = c.replace(/} transition-colors\\`}/g, '} transition-colors`}');

const target = `<motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                layout
                className={\`group relative flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border \${
                  !n.is_read ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                } transition-colors\`}`;

const replacement = `<motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                layout
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100 || info.offset.x < -100) {
                    deleteNotification(n.id);
                  }
                }}
                whileHover={{ scale: 1.01 }}
                whileDrag={{ scale: 0.98, opacity: 0.8 }}
                className={\`group relative flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border cursor-grab active:cursor-grabbing \${
                  !n.is_read ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                } transition-all duration-300\`}`;

c = c.replace(target, replacement);

fs.writeFileSync('src/app/components/NotificationsChannel.tsx', c);
console.log('Fixed NotificationsChannel');
