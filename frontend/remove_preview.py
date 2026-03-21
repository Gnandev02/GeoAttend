import os
import re

filepath = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\index.html"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Watch Demo link
content = content.replace('href="#dashboard-preview"', 'href="admin-dashboard.html?demo=true"')

# Remove the Dashboard Preview Section block
# Regex to match <!-- Dashboard Preview Section --> up to the next </section>
pattern = re.compile(r'<!-- Dashboard Preview Section -->.*?<\/section>', re.DOTALL)
content = pattern.sub('', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html")
