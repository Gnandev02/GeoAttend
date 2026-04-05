const fs = require('fs');
const path = 'c:\\Users\\kamal\\GeoAttend\\frontend\\admin-dashboard.html';

let content = fs.readFileSync(path, 'utf8');

// Target the student list scrollable div
// We look for the one right after the student directory header
const target = 'id="content-students"';
const scrollDivPattern = /<div class="overflow-auto flex-1 h-full">/;

// Inject pb-10 (40px padding bottom)
const replacement = '<div class="overflow-auto flex-1 h-full pb-10">';

if (content.includes(target)) {
    const sectionStart = content.indexOf(target);
    const scrollDivStart = content.indexOf('<div class="overflow-auto flex-1 h-full">', sectionStart);
    
    if (scrollDivStart !== -1) {
        content = content.substring(0, scrollDivStart) + replacement + content.substring(scrollDivStart + '<div class="overflow-auto flex-1 h-full">'.length);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully added bottom padding to students list.');
    } else {
        console.log('Could not find scrollable div in student section.');
    }
} else {
    console.log('Could not find content-students section.');
}
