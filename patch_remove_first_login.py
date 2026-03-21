import os
import re

print("Starting to patch files to remove is_first_login...")

# 1. api/auth.js
auth_file = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\api\auth.js"
with open(auth_file, "r", encoding="utf-8") as f:
    auth_content = f.read()
    
auth_old = """            if (await comparePassword(password, student.password)) {
                return res.status(200).json({
                    _id: student.id, name: student.name, email: student.email, rollNumber: student.roll_number, role: 'student', collegeCode: student.college_code, isFirstLogin: student.is_first_login, token: generateToken(student.id, student.college_code),
                });
            }"""
auth_new = """            if (await comparePassword(password, student.password)) {
                return res.status(200).json({
                    _id: student.id, name: student.name, email: student.email, rollNumber: student.roll_number, role: 'student', collegeCode: student.college_code, token: generateToken(student.id, student.college_code),
                });
            }"""
auth_content = auth_content.replace(auth_old, auth_new)
with open(auth_file, "w", encoding="utf-8") as f:
    f.write(auth_content)
print("api/auth.js patched")


# 2. api/students.js
students_file = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\api\students.js"
with open(students_file, "r", encoding="utf-8") as f:
    students_content = f.read()

students_content = students_content.replace(
    "await query('UPDATE students SET password = $1, is_first_login = FALSE WHERE id = $2', [hashedPassword, student.id]);",
    "await query('UPDATE students SET password = $1 WHERE id = $2', [hashedPassword, student.id]);"
)
with open(students_file, "w", encoding="utf-8") as f:
    f.write(students_content)
print("api/students.js patched")


# 3. api/migrate.js
migrate_file = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\api\migrate.js"
with open(migrate_file, "r", encoding="utf-8") as f:
    m_content = f.read()

m_old = """        // 2. Update students table
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE');
        console.log("Added is_first_login to students table");"""
m_new = """        // 2. Update students table
        await query('ALTER TABLE students DROP COLUMN IF EXISTS is_first_login');
        console.log("Dropped is_first_login from students table");"""
m_content = m_content.replace(m_old, m_new)
with open(migrate_file, "w", encoding="utf-8") as f:
    f.write(m_content)
print("api/migrate.js patched")


# 4. frontend/student-login.html
login_html = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-login.html"
with open(login_html, "r", encoding="utf-8") as f:
    login_content = f.read()

old_success = """                if (res.ok) {
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
new_success = """                if (res.ok) {
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
login_content = login_content.replace(old_success, new_success)
with open(login_html, "w", encoding="utf-8") as f:
    f.write(login_content)
print("frontend/student-login.html patched")


# 5. frontend/student-dashboard.html
dash_html = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-dashboard.html"
with open(dash_html, "r", encoding="utf-8") as f:
    dash_content = f.read()

guard_old = """            if (userStr) {
                user = JSON.parse(userStr);
                if (user.role !== 'student') {
                    window.location.href = 'student-login.html';
                }
                if (user.isFirstLogin === true) {
                    window.location.href = 'change-password.html';
                }"""
guard_new = """            if (userStr) {
                user = JSON.parse(userStr);
                if (user.role !== 'student') {
                    window.location.href = 'student-login.html';
                }"""
dash_content = dash_content.replace(guard_old, guard_new)
dash_content = dash_content.replace("        if (user.role !== 'student') window.location.href = 'student-login.html';\n        if (user.isFirstLogin === true) window.location.href = 'change-password.html';", 
                                    "        if (user.role !== 'student') window.location.href = 'student-login.html';")

with open(dash_html, "w", encoding="utf-8") as f:
    f.write(dash_content)
print("frontend/student-dashboard.html patched")


# 6. frontend/change-password.html
change_pwd = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\change-password.html"
with open(change_pwd, "r", encoding="utf-8") as f:
    cp_content = f.read()

old_js_init = """        let user = {};
        if (!token || !userStr) {
            window.location.href = 'student-login.html';
        } else {
            user = JSON.parse(userStr);
            if (user.isFirstLogin === true) {
                document.getElementById('welcome-heading').textContent = "Security Required";
                document.getElementById('welcome-message').textContent = `Hi ${user.name.split(' ')[0]}, please change your temporary password to continue.`;
                document.getElementById('old-pwd-label').textContent = "Temporary Password";
                document.getElementById('oldPassword').placeholder = "Enter temporary password";
            } else {
                document.getElementById('welcome-heading').textContent = "Change Password";
                document.getElementById('welcome-message').textContent = "Update your account security details.";
                document.getElementById('old-pwd-label').textContent = "Current Password";
                document.getElementById('oldPassword').placeholder = "Enter current password";
            }
        }"""
new_js_init = """        let user = {};
        if (!token || !userStr) {
            window.location.href = 'student-login.html';
        } else {
            user = JSON.parse(userStr);
            document.getElementById('welcome-heading').textContent = "Change Password";
            document.getElementById('welcome-message').textContent = "Update your account security details.";
            document.getElementById('old-pwd-label').textContent = "Current Password";
            document.getElementById('oldPassword').placeholder = "Enter current password";
        }"""
cp_content = cp_content.replace(old_js_init, new_js_init)

old_update = """                // Update session object
                user.isFirstLogin = false;
                localStorage.setItem('geoattend_user', JSON.stringify(user));"""
cp_content = cp_content.replace(old_update, "                // Session object does not require state update on simple changes")

with open(change_pwd, "w", encoding="utf-8") as f:
    f.write(cp_content)
print("frontend/change-password.html patched")

print("All patch replacements completed!")
