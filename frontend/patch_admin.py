import os

filepath = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\admin-dashboard.html"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# BLOCK 1: Auth check
old_auth = """        const token = localStorage.getItem('geoattend_token');
        const userStr = localStorage.getItem('geoattend_user');

        if (!token || !userStr) {
            window.location.href = 'admin-login.html';
        }

        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
            window.location.href = 'admin-login.html';
        }

        if (user.collegeName) {
            document.getElementById('brand-college-name').textContent = user.collegeName;
        }
        if (user.collegeCode) {
            document.getElementById('brand-college-code').textContent = user.collegeCode;
        }"""
new_auth = """        const urlParams = new URLSearchParams(window.location.search);
        const isDemo = urlParams.get('demo') === 'true';

        const token = localStorage.getItem('geoattend_token');
        const userStr = localStorage.getItem('geoattend_user');
        
        let user = {};

        if (!isDemo) {
            if (!token || !userStr) {
                window.location.href = 'admin-login.html';
            }

            if (userStr) {
                user = JSON.parse(userStr);
                if (user.role !== 'admin') {
                    window.location.href = 'admin-login.html';
                }

                if (user.collegeName) {
                    document.getElementById('brand-college-name').textContent = user.collegeName;
                }
                if (user.collegeCode) {
                    document.getElementById('brand-college-code').textContent = user.collegeCode;
                }
            }
        } else {
            user = { collegeName: "Demo University", collegeCode: "DEMO-101", role: "admin" };
            document.getElementById('brand-college-name').textContent = user.collegeName;
            document.getElementById('brand-college-code').textContent = user.collegeCode;
        }"""
content = content.replace(old_auth, new_auth)

# BLOCK 2: fetchAdminData
old_fetch = """        async function fetchAdminData() {
            try {"""
new_fetch = """        async function fetchAdminData() {
            if (isDemo) {
                const studentsData = [
                    { _id: '1', userId: { name: 'Alice Smith', email: 'alice@demo.edu' }, rollNumber: 'CS-001', department: 'Computer Science' },
                    { _id: '2', userId: { name: 'Bob Jones', email: 'bob@demo.edu' }, rollNumber: 'CS-002', department: 'Computer Science' },
                    { _id: '3', userId: { name: 'Charlie Brown', email: 'charlie@demo.edu' }, rollNumber: 'EE-001', department: 'Electrical' },
                    { _id: '4', userId: { name: 'Diana Prince', email: 'diana@demo.edu' }, rollNumber: 'ME-001', department: 'Mechanical' },
                    { _id: '5', userId: { name: 'Evan Wright', email: 'evan@demo.edu' }, rollNumber: 'CS-003', department: 'Computer Science' }
                ];
                
                const statsData = { overall: { totalStudents: 142, Present: 128 } };
                
                allLogs = [
                    { date: new Date().toISOString(), studentId: { name: 'Alice Smith', rollNumber: 'CS-001' }, checkinTime: '09:00 AM', checkoutTime: '04:00 PM', status: 'Present' },
                    { date: new Date().toISOString(), studentId: { name: 'Bob Jones', rollNumber: 'CS-002' }, checkinTime: '09:15 AM', checkoutTime: '', status: 'Present' },
                    { date: new Date().toISOString(), studentId: { name: 'Charlie Brown', rollNumber: 'EE-001' }, checkinTime: '10:00 AM', checkoutTime: '02:00 PM', status: 'Present' },
                    { date: new Date(Date.now() - 86400000).toISOString(), studentId: { name: 'Diana Prince', rollNumber: 'ME-001' }, checkinTime: '', checkoutTime: '', status: 'Absent' }
                ];

                const campusData = { name: "Main Campus Geofence", latitude: 12.9716, longitude: 77.5946, radius: 500 };

                renderOverview(studentsData, statsData, campusData);
                renderStudents(studentsData);
                renderLogs(allLogs);
                renderGeofence(campusData);
                return;
            }
            try {"""
content = content.replace(old_fetch, new_fetch)

# BLOCK 3: deleteStudent
old_delete = """        async function deleteStudent(id) {
            if (!confirm('Are you sure you want to delete this student?')) return;"""
new_delete = """        async function deleteStudent(id) {
            if (isDemo) return alert('Action Disabled in Demo Mode.');
            if (!confirm('Are you sure you want to delete this student?')) return;"""
content = content.replace(old_delete, new_delete)

# BLOCK 4: geofence-form
old_geo = """        document.getElementById('geofence-form').addEventListener('submit', async (e) => {
            e.preventDefault();"""
new_geo = """        document.getElementById('geofence-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isDemo) {
                alert('Geofence updated (Demo Mode)');
                return;
            }"""
content = content.replace(old_geo, new_geo)

# BLOCK 5: add-student-form
old_add = """        document.getElementById('add-student-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.submitter;"""
new_add = """        document.getElementById('add-student-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isDemo) {
                alert('Student added (Demo Mode)');
                document.getElementById('addStudentModal').classList.add('hidden');
                return;
            }
            const btn = e.submitter;"""
content = content.replace(old_add, new_add)

# BLOCK 6: logout
old_logout = """        function logout() {
            localStorage.clear();
            window.location.href = 'index.html';
        }"""
new_logout = """        function logout() {
            if (!isDemo) localStorage.clear();
            window.location.href = 'index.html';
        }"""
content = content.replace(old_logout, new_logout)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated admin-dashboard.html")
