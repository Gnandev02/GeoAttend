const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('gnandevbonthu12@gmail.com')) {
        const newContent = content.replace(/gnandevbonthu12@gmail.com/g, 'geoattend20@gmail.com');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated ' + filePath);
    }
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', '.git', '.vercel', 'tmp'].includes(file)) {
                processDir(fullPath);
            }
        } else {
            if (fullPath.endsWith('.html') || fullPath.endsWith('.py') || fullPath.endsWith('.js')) {
                replaceInFile(fullPath);
            }
        }
    }
}

processDir('c:\\Users\\kamal\\GeoAttend');
console.log('Done replacement');
