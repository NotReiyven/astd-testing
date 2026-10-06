const fs = require('fs');
let c = fs.readFileSync('src/app/components/layout/AdComposerModal.tsx', 'utf8');

c = c.replace(
  'window.dispatchEvent(new Event("academy-posted-ad"));',
  'window.dispatchEvent(new Event("academy-posted-ad"));\n      useNotificationStore.getState().addLocalNotification({ type: "system", message: "Your trade ad was published successfully." });'
);

fs.writeFileSync('src/app/components/layout/AdComposerModal.tsx', c);
console.log('Fixed AdComposerModal success');
