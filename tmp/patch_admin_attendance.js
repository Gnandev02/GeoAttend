const fs = require('fs');
const filePath = 'c:\\Users\\kamal\\GeoAttend\\frontend\\admin-dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

function patchFunction(startMarker, endMarker, replacement) {
    const start = content.indexOf(startMarker);
    if (start === -1) {
        console.log("Could not find start marker: " + startMarker);
        return;
    }
    const end = content.indexOf(endMarker, start);
    if (end === -1) {
        console.log("Could not find end marker: " + endMarker);
        return;
    }
    const actualEnd = content.indexOf('});', end);
    let finalEnd;
    if (actualEnd !== -1 && actualEnd < end + 100) {
        finalEnd = actualEnd + 3;
    } else {
        finalEnd = content.indexOf('}', end) + 1;
    }
    content = content.substring(0, start) + replacement.trim() + content.substring(finalEnd);
}

// 1. Add hidden fields
if (content.includes('<input type="hidden" id="edit-att-id" />')) {
    content = content.replace(
        '<input type="hidden" id="edit-att-id" />',
        '<input type="hidden" id="edit-att-id" />\n                <input type="hidden" id="edit-att-student-id" />\n                <input type="hidden" id="edit-att-date-raw" />'
    );
}

// 2. Patch openEditModal
const newOpenEdit = `        function openEditModal(attendanceId) {
            const log = allLogs.find(l => l.id === attendanceId);
            if (!log) return;

            document.getElementById('edit-att-id').value = log.id;
            document.getElementById('edit-att-student-id').value = log.student_id || log.studentId;
            document.getElementById('edit-att-date-raw').value = log.date;
            
            document.getElementById('edit-att-student-name').textContent = log.name;
            document.getElementById('edit-att-date').value = fmtDate(log.date);
            document.getElementById('edit-att-checkin').value = log.in_time || '';
            document.getElementById('edit-att-checkout').value = log.out_time || '';
            document.getElementById('edit-att-status').value = log.status || 'Present';

            document.getElementById('editAttendanceModal').classList.remove('hidden');
        }`;

const startEditModal = "function openEditModal(attendanceId) {";
const endEditModal = "document.getElementById('editAttendanceModal').classList.remove('hidden');";
const sIdx = content.indexOf(startEditModal);
const eIdx = content.indexOf(endEditModal, sIdx);
if (sIdx !== -1 && eIdx !== -1) {
    const fEnd = content.indexOf('}', eIdx) + 1;
    content = content.substring(0, sIdx) + newOpenEdit.trim() + content.substring(fEnd);
}

// 3. Patch edit-attendance-form submit
const newEditSubmit = `        document.getElementById('edit-attendance-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isDemo) {
                alert('Edit saved (Demo Mode)');
                document.getElementById('editAttendanceModal').classList.add('hidden');
                return;
            }

            const payload = {
                attendance_id: document.getElementById('edit-att-id').value,
                student_id: document.getElementById('edit-att-student-id').value,
                date: document.getElementById('edit-att-date-raw').value,
                status: document.getElementById('edit-att-status').value,
                check_in: document.getElementById('edit-att-checkin').value,
                check_out: document.getElementById('edit-att-checkout').value
            };

            console.log("Attendance Update Payload:", payload);

            const btn = e.submitter;
            btn.disabled = true;
            btn.textContent = 'Updating...';

            try {
                const res = await fetch('/api/main?action=editAttendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                console.log("Attendance Update Response:", data);

                if (res.ok && data.success) {
                    document.getElementById('editAttendanceModal').classList.add('hidden');
                    fetchAdminData();
                } else {
                    alert(data.message || "Update failed");
                }
            } catch (err) { 
                console.error("Update Error:", err);
                alert('Connection error.'); 
            } finally {
                btn.disabled = false;
                btn.textContent = 'Update Record';
            }
        });`;
patchFunction("document.getElementById('edit-attendance-form').addEventListener('submit'", "btn.textContent = 'Update Record';", newEditSubmit);

// 4. Patch manual-attendance-form submit
const newManualSubmit = `        document.getElementById('manual-attendance-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isDemo) {
                alert('Attendance Marked (Demo Mode)');
                document.getElementById('manualAttendanceModal').classList.add('hidden');
                return;
            }
            
            const btn = e.submitter;
            const checkinTime24 = document.getElementById('manual-checkin').value;
            const checkoutTime24 = document.getElementById('manual-checkout').value;
            
            const toAMPM = (time24) => {
                if (!time24) return '';
                let [h, m] = time24.split(':');
                h = parseInt(h);
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return \`\${h}:\${m} \${ampm}\`;
            };

            const payload = {
                student_id: document.getElementById('manual-student-id').value,
                date: document.getElementById('manual-date').value,
                status: 'Present',
                check_in: toAMPM(checkinTime24),
                check_out: toAMPM(checkoutTime24),
            };

            console.log("Manual Attendance Payload:", payload);

            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                const res = await fetch('/api/main?action=manualMark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                console.log("Manual Attendance Response:", data);

                if (res.ok && data.success) {
                    document.getElementById('manualAttendanceModal').classList.add('hidden');
                    document.getElementById('manual-attendance-form').reset();
                    fetchAdminData();
                } else {
                    alert(data.message || "Manual marking failed");
                }
            } catch (err) { 
                console.error("Manual Mark Error:", err);
                alert('Connection error.'); 
            } finally {
                btn.disabled = false;
                btn.textContent = 'Submit Entry';
            }
        });`;
patchFunction("document.getElementById('manual-attendance-form').addEventListener('submit'", "btn.textContent = 'Submit Entry';", newManualSubmit);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched admin-dashboard frontend handlers!");
