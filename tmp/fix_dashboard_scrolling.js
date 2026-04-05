const fs = require('fs');
const path = 'c:\\Users\\kamal\\GeoAttend\\frontend\\admin-dashboard.html';

let content = fs.readFileSync(path, 'utf8');

// 1. Fix Tab Containers (Students and Logs)
// Remove overflow-hidden and ensure overflow-visible so the inner scroll works correctly
content = content.replace(
    /id="content-students" class="premium-card overflow-hidden/g,
    'id="content-students" class="premium-card overflow-visible'
);

content = content.replace(
    /id="content-logs" class="premium-card overflow-hidden/g,
    'id="content-logs" class="premium-card overflow-visible'
);

// 2. Fix Table Wrappers
// Change overflow-x-auto + scrollbar-hide to overflow-auto + h-full
// We do this by searching for the class pattern
content = content.replace(
    /class="overflow-x-auto flex-1 scrollbar-hide"/g,
    'class="overflow-auto flex-1 h-full"'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Dashboard scrolling issues fixed successfully.');
