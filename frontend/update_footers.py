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
                        <li><span class="block text-slate-900 font-medium">Email:</span> <a href="mailto:geoattend01@gmail.com" class="hover:text-brand-600 transition-colors break-all">geoattend01@gmail.com</a></li>
                    </ul>
                </div>
            </div>
            <div class="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <p class="text-sm text-slate-400">© 2026 GeoAttend. All rights reserved.</p>
                <div class="text-sm text-slate-400">Built using modern full-stack web technologies</div>
            </div>
        </div>
    </footer>"""

frontend_dir = "frontend"

def get_body_content(page_id):
    if page_id == 'features.html':
        return '''
    <!-- Features Content -->
    <section class="pt-32 pb-20 bg-white">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center mb-16">
                <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Powerful Features</h1>
                <p class="text-lg text-slate-500 max-w-2xl mx-auto">Everything you need to automate attendance and eliminate proxy records with real-time GPS verification.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Feature 1 -->
                <div class="p-8 border border-slate-100 rounded-3xl bg-white hover:border-brand-200 hover:shadow-xl transition-all group">
                    <div class="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">Real-time GPS Tracking</h3>
                    <p class="text-slate-500 leading-relaxed">Secure, sub-15 second verification using precise device location data and real-time mapping.</p>
                </div>
                <!-- Feature 2 -->
                <div class="p-8 border border-slate-100 rounded-3xl bg-white hover:border-brand-200 hover:shadow-xl transition-all group">
                    <div class="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L10 2l6.447 2.571A2 2 0 0118 6.513v8.974a2 2 0 01-1.553 1.943L12 20V10z" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">Geofencing Verification</h3>
                    <p class="text-slate-500 leading-relaxed">Define precise institution boundaries. Attendance is only marked if the student is physically within the polygon.</p>
                </div>
                <!-- Feature 3 -->
                <div class="p-8 border border-slate-100 rounded-3xl bg-white hover:border-brand-200 hover:shadow-xl transition-all group">
                    <div class="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">Multi-campus Support</h3>
                    <p class="text-slate-500 leading-relaxed">Manage multiple branches, departments, and buildings from a single administrative command center.</p>
                </div>
                <!-- Feature 4 -->
                <div class="p-8 border border-slate-100 rounded-3xl bg-white hover:border-brand-200 hover:shadow-xl transition-all group">
                    <div class="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">Role-based Dashboards</h3>
                    <p class="text-slate-500 leading-relaxed">Dedicated interfaces for Administrators and Students, tailored to their specific needs and management tasks.</p>
                </div>
                <!-- Feature 5 -->
                <div class="p-8 border border-slate-100 rounded-3xl bg-white hover:border-brand-200 hover:shadow-xl transition-all group">
                    <div class="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 002-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">Attendance Logs & Analytics</h3>
                    <p class="text-slate-500 leading-relaxed">Generate detailed reports, track historical attendance trends, and export data for institutional records.</p>
                </div>
                <!-- Feature 6 -->
                <div class="p-8 border border-slate-100 rounded-3xl bg-white hover:border-brand-200 hover:shadow-xl transition-all group">
                    <div class="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3">Secure Authentication</h3>
                    <p class="text-slate-500 leading-relaxed">Protected by industry-standard JWT protocols and encrypted password hashing for maximum data security.</p>
                </div>
            </div>
        </div>
    </section>
'''
    elif page_id == 'compare.html':
        return '''
    <!-- Comparison Content -->
    <section class="pt-32 pb-20 bg-slate-50">
        <div class="max-w-5xl mx-auto px-6">
            <div class="text-center mb-16">
                <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">GeoAttend vs Traditional</h1>
                <p class="text-lg text-slate-500 max-w-2xl mx-auto">See how GeoAttend eliminates the flaws of manual attendance records.</p>
            </div>
            
            <div class="bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-900 text-white">
                                <th class="py-6 px-10 text-sm font-bold uppercase tracking-wider">Metric</th>
                                <th class="py-6 px-10 text-sm font-bold uppercase tracking-wider">Traditional Method</th>
                                <th class="py-6 px-10 text-sm font-bold uppercase tracking-wider bg-brand-600">GeoAttend (Automated)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr>
                                <td class="py-6 px-10 font-bold text-slate-900">Process Type</td>
                                <td class="py-6 px-10 text-slate-500">Manual Paper/Digital Entry</td>
                                <td class="py-6 px-10 font-bold text-brand-600">GPS & Geofence Verified</td>
                            </tr>
                            <tr>
                                <td class="py-6 px-10 font-bold text-slate-900">Proxy Attendance</td>
                                <td class="py-6 px-10 text-red-500 font-medium italic">High Risk (Easy to fake)</td>
                                <td class="py-6 px-10 font-bold text-green-600">Zero Risk (Physical Presence)</td>
                            </tr>
                            <tr>
                                <td class="py-6 px-10 font-bold text-slate-900">Verification Time</td>
                                <td class="py-6 px-10 text-slate-500">10 - 20 Minutes per class</td>
                                <td class="py-6 px-10 font-bold text-slate-900">&lt; 15 Seconds</td>
                            </tr>
                            <tr>
                                <td class="py-6 px-10 font-bold text-slate-900">Data Accuracy</td>
                                <td class="py-6 px-10 text-slate-500">Human Error Prone</td>
                                <td class="py-6 px-10 font-bold text-slate-900">100% System Precision</td>
                            </tr>
                            <tr>
                                <td class="py-6 px-10 font-bold text-slate-900">Reporting</td>
                                <td class="py-6 px-10 text-slate-500">Manual Calculation</td>
                                <td class="py-6 px-10 font-bold text-slate-900">Instant Real-time Analytics</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>
'''
    elif page_id == 'pricing.html':
        return '''
    <!-- Razorpay Checkout Script -->
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>

    <!-- Pricing Content -->
    <section class="pt-32 pb-20 bg-white">
        <div class="max-w-7xl mx-auto px-6 text-center">
            <div class="mb-16">
                <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Simple Pricing</h1>
                <p class="text-lg text-slate-500 max-w-2xl mx-auto">Scalable plans for institutions of all sizes.</p>
                <div class="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100 text-amber-700 text-sm font-bold">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>
                    Payment System in Test Mode
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <!-- Free -->
                <div class="p-8 border border-slate-200 rounded-3xl bg-white flex flex-col items-center">
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Free</p>
                    <div class="flex items-baseline gap-1 mb-8">
                        <span class="text-4xl font-extrabold text-slate-900">₹0</span>
                        <span class="text-slate-400 font-medium">/mo</span>
                    </div>
                    <ul class="space-y-4 text-sm text-slate-600 mb-10 text-left w-full">
                        <li class="flex items-center gap-2 font-semibold italic"><svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>Up to 50 Students</li>
                        <li class="flex items-center gap-2"><svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>1 Campus Support</li>
                    </ul>
                    <a href="admin-signup.html" class="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Current Plan</a>
                </div>
                <!-- Basic -->
                <div class="p-8 border-2 border-brand-500 rounded-3xl bg-white flex flex-col items-center relative shadow-2xl shadow-brand-100 scale-105">
                    <div class="absolute -top-4 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-tighter px-4 py-1.5 rounded-full">Best Value</div>
                    <p class="text-sm font-bold text-brand-600 uppercase tracking-widest mb-4">Basic</p>
                    <div class="flex items-baseline gap-1 mb-8">
                        <span class="text-4xl font-extrabold text-slate-900">₹99</span>
                        <span class="text-slate-400 font-medium">/mo</span>
                    </div>
                    <ul class="space-y-4 text-sm text-slate-600 mb-10 text-left w-full">
                        <li class="flex items-center gap-2 font-bold"><svg class="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>Up to 500 Students</li>
                        <li class="flex items-center gap-2"><svg class="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>Unlimited Campus</li>
                    </ul>
                    <button class="buy-btn w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors" data-plan="basic" data-amount="99">Buy Now</button>
                </div>
                <!-- Pro -->
                <div class="p-8 border border-slate-200 rounded-3xl bg-white flex flex-col items-center">
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Pro</p>
                    <div class="flex items-baseline gap-1 mb-8">
                        <span class="text-4xl font-extrabold text-slate-900">₹199</span>
                        <span class="text-slate-400 font-medium">/mo</span>
                    </div>
                    <ul class="space-y-4 text-sm text-slate-600 mb-10 text-left w-full">
                        <li class="flex items-center gap-2 font-bold"><svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>Unlimited Students</li>
                        <li class="flex items-center gap-2 font-bold"><svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>Priority Support</li>
                    </ul>
                    <button class="buy-btn w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors" data-plan="pro" data-amount="199">Buy Now</button>
                </div>
            </div>
        </div>
    </section>

    <script>
        document.querySelectorAll(".buy-btn").forEach(btn => {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                const plan = this.getAttribute("data-plan");
                const amount = parseInt(this.getAttribute("data-amount"));
                console.log("Starting payment for:", plan, amount);
                startPayment(plan, amount);
            });
        });

        async function startPayment(plan, amount) {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("Please log in as an administrator to purchase a plan.");
                window.location.href = "admin-login.html";
                return;
            }

            try {
                const response = await fetch('/api/main?action=create-payment-order', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ plan, amount })
                });

                const data = await response.json();
                if (!data.success) {
                    alert(data.message || "Failed to initiate payment");
                    return;
                }

                if (data.simulated) {
                    // Logic for simulation
                    const confirmSim = confirm("Simulation Mode: System keys not found. Do you want to simulate a successful payment for " + plan.toUpperCase() + "?");
                    if (confirmSim) {
                        const verifyRes = await fetch('/api/main?action=verify-payment', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ 
                                razorpay_order_id: data.order_id,
                                plan: plan,
                                amount: amount,
                                simulated: true 
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            window.location.href = `payment-success.html?plan=${plan}`;
                        } else {
                            alert("Simulation verification failed");
                        }
                    }
                    return;
                }

                // Razorpay real checkout logic
                const options = {
                    "key": data.key_id,
                    "amount": data.amount,
                    "currency": data.currency,
                    "name": "GeoAttend",
                    "description": "Upgrade to " + plan.toUpperCase() + " Plan",
                    "order_id": data.order_id,
                    "handler": async function (response) {
                        const verifyRes = await fetch('/api/main?action=verify-payment', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                plan: plan,
                                amount: amount
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            window.location.href = `payment-success.html?plan=${plan}`;
                        } else {
                            alert("Payment verification failed. Please contact support.");
                        }
                    },
                    "theme": { "color": "#3b82f6" }
                };
                const rzp = new Razorpay(options);
                rzp.open();

            } catch (err) {
                console.error("Payment Process Error:", err);
                alert("An error occurred during the payment process.");
            }
        }
    </script>
'''
    elif page_id == 'about.html':
        return '''
    <!-- About Content -->
    <section class="pt-32 pb-20 bg-white">
        <div class="max-w-4xl mx-auto px-6">
            <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight text-center">About GeoAttend</h1>
            <div class="prose prose-slate max-w-none">
                <p class="text-xl text-slate-600 leading-relaxed mb-8">
                    GeoAttend is a geo-integrated attendance system designed to automate attendance using GPS and geofencing technology. Our mission is to eliminate proxy attendance and streamline institutional management through location-aware software.
                </p>
                
                <div class="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] mb-12">
                    <h3 class="text-2xl font-bold text-slate-900 mb-4">Our Purpose</h3>
                    <p class="text-slate-500 leading-relaxed">
                        This application was developed as a comprehensive engineering project to showcase the power of modern web technologies like React, Node.js, and Geolocation APIs in solving real-world academic challenges. By requiring physical presence within a defined campus geofence, we ensure higher accuracy and accountability in attendance tracking.
                    </p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div class="p-6 border border-slate-100 rounded-2xl">
                        <h4 class="font-bold text-slate-900 mb-2">Student Led Project</h4>
                        <p class="text-slate-500 text-sm italic underline">"Built by students, for students and administrators."</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
'''
    elif page_id == 'privacy-policy.html':
        return '''
    <!-- Privacy Policy Content -->
    <section class="pt-32 pb-20 bg-white">
        <div class="max-w-4xl mx-auto px-6">
            <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight">Privacy Policy</h1>
            <div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">1. Data Collection</h2>
                    <p class="text-slate-500 leading-relaxed">We collect basic user profile information (name, email, roll number) and physical location coordinates during the attendance marking process to verify your presence within the campus geofence.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">2. Location Usage</h2>
                    <p class="text-slate-500 leading-relaxed">Your location is used <strong>only</strong> for the purpose of marking attendance. We do not track you outside of active attendance sessions or your institution's geofenced boundaries.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">3. Data Security</h2>
                    <p class="text-slate-500 leading-relaxed">All user data is securely stored on our servers. We use industry-standard encryption protocols to protect your personal information from unauthorized access.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">4. Third-Party Sharing</h2>
                    <p class="text-slate-500 leading-relaxed">We maintain a strict policy against sharing your personal or location data with any third-party marketing or profiling services.</p>
                </section>
            </div>
        </div>
    </section>
'''
    elif page_id == 'terms-of-service.html':
        return '''
    <!-- Terms of Service Content -->
    <section class="pt-32 pb-20 bg-white">
        <div class="max-w-4xl mx-auto px-6">
            <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight">Terms of Service</h1>
            <div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">1. Ethical Usage</h2>
                    <p class="text-slate-500 leading-relaxed">Users are required to use the system ethically. Any attempts to spoof location data or manipulate attendance records will result in immediate suspension from the platform.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">2. Misuse of System</h2>
                    <p class="text-slate-500 leading-relaxed">Misuse of the attendance system, including providing false login credentials or interfering with GPS services, is strictly prohibited.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">3. Administrative Controls</h2>
                    <p class="text-slate-500 leading-relaxed">Administrators maintain full control over campus boundaries and student records. The system is provided specifically for academic use within registered institutions.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-bold text-slate-900 mb-4">4. Limitations of Liability</h2>
                    <p class="text-slate-500 leading-relaxed">GeoAttend is an academic tool provided "as-is". While we strive for 100% accuracy, we are not responsible for discrepancies caused by hardware failures or network limitations.</p>
                </section>
            </div>
        </div>
    </section>
'''
    return "<!-- No content for this page -->"

# Regex pattern to match the entire footer block
footer_pattern = re.compile(r'(\s*<!--\s*Footer\s*-->\s*)?<footer.*?</footer>', re.DOTALL)

# Update core files first
core_files = ['compare.html', 'features.html', 'how-it-works.html', 'index.html']
for filename in core_files:
    filepath = os.path.join(frontend_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the footer
        new_content = footer_pattern.sub('\n' + new_footer, content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated footer in {filename}")

# Get common components from index.html for generation
with open(os.path.join(frontend_dir, 'index.html'), 'r', encoding='utf-8') as f:
    index_content = f.read()

# Extract header (up to </nav>)
header_match = re.search(r'(.*?</nav>)', index_content, re.DOTALL)
header_html = header_match.group(1) if header_match else ""

# Extract everything from <!-- Footer --> downwards
footer_match = re.search(r'(<!-- Footer -->.*)', index_content, re.DOTALL)
footer_html = footer_match.group(1) if footer_match else ""

def generate_page(filename, title):
    body = get_body_content(filename)
    full_html = f"{header_html}\n{body}\n\n    {footer_html}"
    
    # Update <title>
    full_html = re.sub(r'<title>.*?</title>', f'<title>{title} | GeoAttend</title>', full_html)
    
    with open(os.path.join(frontend_dir, filename), 'w', encoding='utf-8') as f:
        f.write(full_html)
    print(f"Generated {filename}")

pages = {
    'features.html': 'Features',
    'compare.html': 'Comparison',
    'pricing.html': 'Pricing',
    'about.html': 'About Us',
    'privacy-policy.html': 'Privacy Policy',
    'terms-of-service.html': 'Terms of Service'
}

for filename, title in pages.items():
    generate_page(filename, title)

print("All footer pages updated with rich content.")
