import os
import re

# 1. Patch api/auth.js OTP expiration
auth_js = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\api\auth.js"
with open(auth_js, 'r', encoding='utf-8') as f:
    auth_content = f.read()

# Replace from 10 minutes to 5 minutes
auth_content = auth_content.replace("10 * 60 * 1000", "5 * 60 * 1000")

with open(auth_js, 'w', encoding='utf-8') as f:
    f.write(auth_content)


# 2. Patch frontend/student-login.html (Remove Modal and update link)
student_login = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-login.html"
with open(student_login, 'r', encoding='utf-8') as f:
    sl_content = f.read()

# Link update
sl_content = sl_content.replace("""                                <a href="javascript:void(0)" onclick="openResetModal()\"""",
                                """                                <a href="forgot-password.html\"""")

# Modal removal block via regex
sl_content = re.sub(r'<!-- Forgot Password Modal -->.*?<!-- Back Link -->', '<!-- Back Link -->', sl_content, flags=re.DOTALL)

# JS removal block
sl_content = re.sub(r'        // Forgot Password Logic.*?    </script>', '    </script>', sl_content, flags=re.DOTALL)

with open(student_login, 'w', encoding='utf-8') as f:
    f.write(sl_content)


# 3. Patch frontend/change-password.html
change_pwd = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\change-password.html"
with open(change_pwd, 'r', encoding='utf-8') as f:
    cp_content = f.read()

# Dynamic initialization logic
old_js_init = """        let user = {};
        if (!token || !userStr) {
            window.location.href = 'student-login.html';
        } else {
            user = JSON.parse(userStr);
            if (user.name) {
                document.getElementById('welcome-message').textContent = `Hi ${user.name.split(' ')[0]}, please change your temporary password to continue.`;
            }
        }"""
new_js_init = """        let user = {};
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
cp_content = cp_content.replace(old_js_init, new_js_init)
cp_content = cp_content.replace('id="welcome-message"', 'id="welcome-message"') # it's already there
cp_content = cp_content.replace('<h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Security Required</h2>', '<h2 id="welcome-heading" class="text-3xl font-extrabold text-slate-900 tracking-tight">Security Required</h2>')
cp_content = cp_content.replace('<label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Temporary Password</label>', '<label id="old-pwd-label" class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Temporary Password</label>')

with open(change_pwd, 'w', encoding='utf-8') as f:
    f.write(cp_content)


# 4. Patch student-dashboard.html to add Change Password to sidebar
student_dashboard = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-dashboard.html"
with open(student_dashboard, 'r', encoding='utf-8') as f:
    sd_content = f.read()

sidebar_link_old = """                    <a href="javascript:void(0)" onclick="logout()"
                        class="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full">"""
sidebar_link_new = """                    <a href="change-password.html" class="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-[#0284c7] hover:bg-[#0284c7]/5 transition-colors">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Change Password
                    </a>
                    <a href="javascript:void(0)" onclick="logout()"
                        class="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full mt-2">"""
sd_content = sd_content.replace(sidebar_link_old, sidebar_link_new)

with open(student_dashboard, 'w', encoding='utf-8') as f:
    f.write(sd_content)

print("Patching complete!")
