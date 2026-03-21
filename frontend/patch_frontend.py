import os

# patch admin-dashboard.html Add Student modal layout and payload
admin_html = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\admin-dashboard.html"
with open(admin_html, 'r', encoding='utf-8') as f:
    content = f.read()

# remove password HTML field
pwd_html = """                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Password</label>
                                <input type="password" id="studentPassword" required minlength="6" class="saas-input"
                                    placeholder="Enter your password">
                            </div>"""
content = content.replace(pwd_html, "")

# remove password from payload
payload_old = """            const payload = {
                studentName: document.getElementById('studentName').value,
                email: document.getElementById('studentEmail').value,
                password: document.getElementById('studentPassword').value,
                rollNumber: document.getElementById('studentRoll').value,
                department: document.getElementById('studentDept').value
            };"""
payload_new = """            const payload = {
                studentName: document.getElementById('studentName').value,
                email: document.getElementById('studentEmail').value,
                rollNumber: document.getElementById('studentRoll').value,
                department: document.getElementById('studentDept').value
            };"""
content = content.replace(payload_old, payload_new)
with open(admin_html, 'w', encoding='utf-8') as f:
    f.write(content)


# patch student-login.html success handler
student_login = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-login.html"
with open(student_login, 'r', encoding='utf-8') as f:
    s_content = f.read()

old_success = """                if (res.ok) {
                    localStorage.setItem('geoattend_token', data.token);
                    localStorage.setItem('geoattend_user', JSON.stringify({
                        _id: data._id,
                        name: data.name,
                        email: data.email,
                        rollNumber: data.rollNumber,
                        role: data.role,
                        collegeCode: data.collegeCode
                    }));
                    window.location.href = 'student-dashboard.html';
                }"""
new_success = """                if (res.ok) {
                    localStorage.setItem('geoattend_token', data.token);
                    localStorage.setItem('geoattend_user', JSON.stringify({
                        _id: data._id,
                        name: data.name,
                        email: data.email,
                        rollNumber: data.rollNumber,
                        role: data.role,
                        collegeCode: data.collegeCode,
                        isFirstLogin: data.isFirstLogin
                    }));
                    if (data.isFirstLogin) {
                        window.location.href = 'change-password.html';
                    } else {
                        window.location.href = 'student-dashboard.html';
                    }
                }"""
s_content = s_content.replace(old_success, new_success)
with open(student_login, 'w', encoding='utf-8') as f:
    f.write(s_content)


# patch student-dashboard.html to redirect if firstLogin
student_dashboard = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-dashboard.html"
with open(student_dashboard, 'r', encoding='utf-8') as f:
    d_content = f.read()

guard_old = """            if (userStr) {
                user = JSON.parse(userStr);
                if (user.role !== 'student') {
                    window.location.href = 'student-login.html';
                }"""
guard_new = """            if (userStr) {
                user = JSON.parse(userStr);
                if (user.role !== 'student') {
                    window.location.href = 'student-login.html';
                }
                if (user.isFirstLogin === true) {
                    window.location.href = 'change-password.html';
                }"""
d_content = d_content.replace(guard_old, guard_new)

# handle the fallback case if any
d_content = d_content.replace("        if (user.role !== 'student') window.location.href = 'student-login.html';", 
                             "        if (user.role !== 'student') window.location.href = 'student-login.html';\n        if (user.isFirstLogin === true) window.location.href = 'change-password.html';")

with open(student_dashboard, 'w', encoding='utf-8') as f:
    f.write(d_content)

print("Frontend patch completed successfully")
