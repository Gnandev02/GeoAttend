import os
import re

new_footer = """    <!-- Footer -->
    <footer id="contact" class="bg-white border-t border-slate-200 pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-8 mb-12">
                <div class="col-span-2 lg:col-span-1 md:col-span-3">
                    <div class="flex items-center gap-2 mb-4">
                        <svg class="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span class="font-bold text-slate-900">GeoAttend</span>
                    </div>
                    <p class="text-slate-500 text-sm">Automated attendance software for modern institutions.</p>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-900 mb-4 text-sm">Product</h4>
                    <ul class="space-y-2 text-sm text-slate-500">
                        <li><a href="features.html" class="hover:text-slate-900 transition-colors">Features</a></li>
                        <li><a href="compare.html" class="hover:text-slate-900 transition-colors">Comparison</a></li>
                        <li><a href="pricing.html" class="hover:text-slate-900 transition-colors">Pricing</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-900 mb-4 text-sm">Company</h4>
                    <ul class="space-y-2 text-sm text-slate-500">
                        <li><a href="about.html" class="hover:text-slate-900 transition-colors">About</a></li>
                        <li><a href="#contact" class="hover:text-slate-900 transition-colors">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-900 mb-4 text-sm">Legal</h4>
                    <ul class="space-y-2 text-sm text-slate-500">
                        <li><a href="privacy-policy.html" class="hover:text-slate-900 transition-colors">Privacy Policy</a></li>
                        <li><a href="terms-of-service.html" class="hover:text-slate-900 transition-colors">Terms of Service</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-900 mb-4 text-sm">Contact</h4>
                    <ul class="space-y-2 text-sm text-slate-500">
                        <li><span class="block text-slate-900 font-medium">Mobile:</span> +91 9121247185</li>
                        <li><span class="block text-slate-900 font-medium">Email:</span> <a href="mailto:geoattend20@gmail.com" class="hover:text-brand-600 transition-colors break-all">geoattend20@gmail.com</a></li>
                    </ul>
                </div>
            </div>
            <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <p class="text-sm text-slate-400">© 2026 GeoAttend. All rights reserved.</p>
                <div class="text-sm text-slate-400">Built using modern full-stack web technologies</div>
            </div>
        </div>
    </footer>"""

files_to_update = ['compare.html', 'features.html', 'how-it-works.html', 'index.html']
frontend_dir = "frontend"

# Regex pattern to match the entire footer block
# from <footer ...> to </footer>
footer_pattern = re.compile(r'(\s*<!--\s*Footer\s*-->\s*)?<footer.*?</footer>', re.DOTALL)

for filename in files_to_update:
    filepath = os.path.join(frontend_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the footer
        new_content = footer_pattern.sub('\n' + new_footer, content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated footer in {filename}")

# Generate template files from index.html (or features.html)
# Let's use index.html to ensure nav + new footer, and strip out the middle part.

with open(os.path.join(frontend_dir, 'index.html'), 'r', encoding='utf-8') as f:
    index_content = f.read()

# Try to extract everything before Hero section as the header (up to </nav>)
header_match = re.search(r'(.*?</nav>)', index_content, re.DOTALL)
header_html = header_match.group(1) if header_match else ""

# The footer is already updated in index_content from the loop above, wait no the loop modifies the file, index_content read here might not have updated footer if we didn't read after loop. Let's read it again.
with open(os.path.join(frontend_dir, 'index.html'), 'r', encoding='utf-8') as f:
    index_content = f.read()

# Extract header
header_match = re.search(r'(.*?</nav>)', index_content, re.DOTALL)
header_html = header_match.group(1) if header_match else ""

# Extract everything from <!-- Footer --> downwards
footer_match = re.search(r'(<!-- Footer -->.*)', index_content, re.DOTALL)
footer_html = footer_match.group(1) if footer_match else ""

def generate_placeholder_page(filename, title, description):
    body = f'''
    <!-- Main Content -->
    <section class="pt-32 pb-20 bg-slate-50 min-h-[60vh] flex flex-col items-center justify-center">
        <div class="max-w-3xl mx-auto px-6 text-center">
            <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-6">{title}</h1>
            <p class="text-lg text-slate-500 mb-8">{description}</p>
            <a href="index.html" class="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
            </a>
        </div>
    </section>
'''
    full_html = f"{header_html}\n{body}\n\n    {footer_html}"
    
    # Update <title>
    full_html = re.sub(r'<title>.*?</title>', f'<title>{title} | GeoAttend</title>', full_html)
    
    with open(os.path.join(frontend_dir, filename), 'w', encoding='utf-8') as f:
        f.write(full_html)
    print(f"Created {filename}")

placeholders = {
    'pricing.html': ('Pricing', 'Our pricing plans will be announced soon. Stay tuned!'),
    'about.html': ('About Us', 'Learn more about GeoAttend and our mission to secure campus attendance.'),
    'privacy-policy.html': ('Privacy Policy', 'Our privacy policy details how we handle your data.'),
    'terms-of-service.html': ('Terms of Service', 'Read our terms of service and user agreements.')
}

for filename, (title, desc) in placeholders.items():
    generate_placeholder_page(filename, title, desc)

print("All tasks completed.")
