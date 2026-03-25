const fs = require('fs');

function checkHTML(filename) {
    const html = fs.readFileSync(filename, 'utf8');
    const headCount = (html.match(/<head>/g) || []).length;
    const headCloseCount = (html.match(/<\/head>/g) || []).length;
    const bodyCount = (html.match(/<body>/g) || []).length;
    const bodyCloseCount = (html.match(/<\/body>/g) || []).length;
    const scriptCount = (html.match(/<script/g) || []).length;
    const scriptCloseCount = (html.match(/<\/script>/g) || []).length;
    const styleCount = (html.match(/<style/g) || []).length;
    const styleCloseCount = (html.match(/<\/style>/g) || []).length;

    console.log(`--- Report for ${filename} ---`);
    console.log(`Head: ${headCount} open, ${headCloseCount} close`);
    console.log(`Body: ${bodyCount} open, ${bodyCloseCount} close`);
    console.log(`Script: ${scriptCount} open, ${scriptCloseCount} close`);
    console.log(`Style: ${styleCount} open, ${styleCloseCount} close`);
    
    // Check for "0 </div>" typos
    if (html.includes("0 </div>")) console.log("FOUND TYPO: 0 </div>");
}

checkHTML('frontend/admin dashboard.html');
checkHTML('frontend/admin-dashboard.html');
