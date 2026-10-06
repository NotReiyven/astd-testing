const fs = require('fs');
let c = fs.readFileSync('src/app/App.tsx', 'utf8');

if (!c.includes('NotificationsChannel')) {
  c = c.replace(
    'const ProfileChannel = lazy(() =>',
    'const NotificationsChannel = lazy(() => import("./components/NotificationsChannel").then((module) => ({ default: module.NotificationsChannel })));\nconst ProfileChannel = lazy(() =>'
  );

  c = c.replace(
    '<Route path="/profile" element={<ProfileChannel />} />',
    '<Route path="/notifications" element={<NotificationsChannel />} />\n                <Route path="/profile" element={<ProfileChannel />} />'
  );
}

fs.writeFileSync('src/app/App.tsx', c);
console.log('Fixed App.tsx');
