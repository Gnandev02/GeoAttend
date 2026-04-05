const fs = require('fs');
const filePath = 'c:\\Users\\kamal\\GeoAttend\\frontend\\admin-dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Warning Banner HTML to STUDENTS TAB
const studentTabStart = '<!-- STUDENTS TAB -->';
const studentTabHeader = '<div class="p-6 border-b border-slate-100 flex justify-between items-center bg-white">';
const bannerHTML = `
                <!-- UNINITIALIZED WARNING BANNER -->
                <div id="setup-warning-banner" class="hidden p-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-amber-100 text-amber-600">
                        <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-xs font-extrabold text-amber-800 uppercase tracking-widest">Campus Setup Required</h4>
                        <p class="text-[11px] text-amber-600 font-medium">Please configure your campus geofence and institutional details in the <b>Campus Setup</b> tab before managing students.</p>
                    </div>
                    <button onclick="switchTab('geofence')" class="px-4 py-2 bg-amber-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-lg shadow-sm hover:bg-amber-700 transition-all">Go to Setup</button>
                </div>
`;

if (content.includes(studentTabStart) && content.includes(studentTabHeader)) {
    const insertPos = content.indexOf(studentTabHeader, content.indexOf(studentTabStart));
    content = content.substring(0, insertPos) + bannerHTML + content.substring(insertPos);
}

// 2. Add id to Add Student button for easy disabling
content = content.replace(
    'onclick="document.getElementById(\'addStudentModal\').classList.remove(\'hidden\')"',
    'id="add-student-btn" onclick="document.getElementById(\'addStudentModal\').classList.remove(\'hidden\')"'
);

// 3. Add isCampusConfigured variable
if (!content.includes('let isCampusConfigured')) {
    content = content.replace('let isEditingGeofence = false;', 'let isEditingGeofence = false;\n        let isCampusConfigured = false;');
}

// 4. Update fetchAdminData to check configuration
const fetchAdminDataMarker = 'renderOverview(studentsData, { overall: statsData }, campusData);';
const fetchAdminDataReplacement = `
                // Update global configuration state
                isCampusConfigured = campusData && campusData.latitude && campusData.name;
                console.log("Is Campus Configured:", isCampusConfigured);
                
                renderOverview(studentsData, { overall: statsData }, campusData); `;
if (content.includes(fetchAdminDataMarker)) {
    content = content.replace(fetchAdminDataMarker, fetchAdminDataReplacement);
}

// 5. Update switchTab for redirection
const switchTabMarker = 'function switchTab(tabId) {';
const switchTabReplacement = `function switchTab(tabId) {
            // Requirement 7: Auto-redirect if campus not set
            if (!isCampusConfigured && (tabId === 'students' || tabId === 'logs' || tabId === 'overview')) {
                alert("Please complete your Campus Setup (Geofence & Name) before accessing this section.");
                tabId = 'geofence';
            }
`;
if (content.includes(switchTabMarker) && !content.includes('isCampusConfigured && (tabId === \'students\'')) {
    content = content.replace(switchTabMarker, switchTabReplacement);
}

// 6. Update renderStudents to handle disabled state/banner
const renderStudentsMarker = 'function renderStudents(students) {';
const renderStudentsReplacement = `function renderStudents(students) {
            // Requirement 4 & 5: Handle missing campus configuration
            const banner = document.getElementById('setup-warning-banner');
            const addBtn = document.getElementById('add-student-btn');
            
            if (banner && addBtn) {
                if (!isCampusConfigured) {
                    banner.classList.remove('hidden');
                    addBtn.disabled = true;
                    addBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    addBtn.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i> Setup Required';
                } else {
                    banner.classList.add('hidden');
                    addBtn.disabled = false;
                    addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    addBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Add Student';
                }
                lucide.createIcons();
            }
`;
if (content.includes(renderStudentsMarker) && !content.includes('// Requirement 4 & 5')) {
    content = content.replace(renderStudentsMarker, renderStudentsReplacement);
}

// 7. Ensure renderGeofence clears fields for new admins
const renderGeofenceElseMarker = 'isEditingGeofence = true;';
const renderGeofenceElseReplacement = `// Explicitly clear fields for new admins (Requirement 1)
                document.getElementById('geo-college-name').value = '';
                document.getElementById('geo-college-code').value = '';
                document.getElementById('geo-start-time').value = '';
                document.getElementById('geo-end-time').value = '';
                
                isEditingGeofence = true;`;
if (content.includes(renderGeofenceElseMarker) && !content.includes('// Explicitly clear fields')) {
    content = content.replace(renderGeofenceElseMarker, renderGeofenceElseReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("admin-dashboard.html patched successfully!");
