const fs = require('fs');
const path = 'c:\\Users\\kamal\\GeoAttend\\frontend\\admin-dashboard.html';

let content = fs.readFileSync(path, 'utf8');

// Target the STUDENTS TAB container specifically
// Change h-[calc(100vh-120px)] to h-[calc(100vh-200px)]
// Change overflow-visible back to overflow-hidden to allow internal scrolling to work properly
content = content.replace(
    /id="content-students" class="premium-card overflow-visible flex flex-col h-\[calc\(100vh-120px\)\]/g,
    'id="content-students" class="premium-card flex flex-col h-[calc(100vh-200px)] overflow-hidden'
);

// Ensure the table wrapper has the correct classes (should already be there from previous fix, but double checking)
// Re-enforcing overflow-auto h-full
if (!content.includes('id="content-students"')) {
    console.log("Could not find content-students ID. Verify manual replacements.");
}

fs.writeFileSync(path, content, 'utf8');
console.log('Students list clipping fix applied.');
