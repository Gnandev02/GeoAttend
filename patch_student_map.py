import os

student_html = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\student-dashboard.html"

with open(student_html, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Provide Maps script tag
head_end = "</head>"
script_tag = """    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDhq-vVMfPkHbaiFLyhR029wjr0tHKj0ng&callback=initStudentMap" async defer></script>
</head>"""
content = content.replace(head_end, script_tag)

# 2. Add map div to Overview Tab
alert_box = '<div id="alert-box" class="hidden p-4 rounded-xl flex items-start gap-3 border"></div>'
map_box = """<div id="alert-box" class="hidden p-4 rounded-xl flex items-start gap-3 border"></div>

                <!-- Live Campus View -->
                <div class="saas-card p-6 flex flex-col h-[450px]">
                    <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <i data-lucide="map" class="w-5 h-5 text-[#0284c7]"></i>
                        Live Geofence Radar
                    </h3>
                    <div id="student-map" class="flex-1 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden relative z-0 flex items-center justify-center text-slate-400 font-medium">
                        Awaiting Campus Location Initialization...
                    </div>
                </div>"""
content = content.replace(alert_box, map_box)

# 3. Add global variables to top script scope
var_old = "let lastDistance = null;"
var_new = """let lastDistance = null;
        let studentMap, campusMarker, studentMarker, geofenceCircle, distanceLine;
        let mapInitialized = false;"""
content = content.replace(var_old, var_new)

# 4. Inject Map Initialization logic
script_end_old = "</body>"
map_js = """
        window.initStudentMap = function() {
            // Setup generic view pointing near general coordinate or wait for campusConfig
            studentMap = new google.maps.Map(document.getElementById('student-map'), {
                center: { lat: 12.9716, lng: 77.5946 }, 
                zoom: 16,
                mapTypeId: 'roadmap',
                mapTypeControl: false,
                streetViewControl: false
            });
            mapInitialized = true;
            
            // Try to render if campus config already arrived
            if (campusConfig) {
                renderMapCampus(campusConfig);
            }
        };

        function renderMapCampus(config) {
            if (!mapInitialized || !config.latitude) return;
            const cLat = parseFloat(config.latitude);
            const cLng = parseFloat(config.longitude);
            const cRad = parseFloat(config.radius);
            
            studentMap.setCenter({ lat: cLat, lng: cLng });

            if(!campusMarker) {
                campusMarker = new google.maps.Marker({
                    position: { lat: cLat, lng: cLng },
                    map: studentMap,
                    title: config.name || "Campus Center",
                    icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" 
                });
            } else {
                campusMarker.setPosition({ lat: cLat, lng: cLng });
            }

            if(!geofenceCircle) {
                geofenceCircle = new google.maps.Circle({
                    strokeColor: "#0284c7",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#0284c7",
                    fillOpacity: 0.15,
                    map: studentMap,
                    center: { lat: cLat, lng: cLng },
                    radius: cRad
                });
            } else {
                geofenceCircle.setCenter({ lat: cLat, lng: cLng });
                geofenceCircle.setRadius(cRad);
            }
        }

        function updateStudentLocationOnMap(lat, lng) {
            if (!mapInitialized || !campusConfig) return;
            const cLat = parseFloat(campusConfig.latitude);
            const cLng = parseFloat(campusConfig.longitude);

            if (!studentMarker) {
                studentMarker = new google.maps.Marker({
                    position: { lat, lng },
                    map: studentMap,
                    title: "You are here",
                    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                });
            } else {
                studentMarker.setPosition({ lat, lng });
            }

            const path = [
                { lat, lng },
                { lat: cLat, lng: cLng }
            ];

            if (!distanceLine) {
                distanceLine = new google.maps.Polyline({
                    path: path,
                    geodesic: true,
                    strokeColor: "#ef4444",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    map: studentMap,
                    patterns: [{
                        icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                        offset: '50%'
                    }]
                });
            } else {
                distanceLine.setPath(path);
            }

            // Adjust bounds to fit both markers
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: cLat, lng: cLng });
            bounds.extend({ lat, lng });
            studentMap.fitBounds(bounds);
        }
</body>"""
content = content.replace(script_end_old, map_js)

# 5. Hook renderMapCampus to fetchCampusConfig success
fetch_cc_old = """                const res = await fetch('/api/attendance?action=getCampus', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) campusConfig = await res.json();
            } catch (e) { console.error("Campus config error:", e); }"""
fetch_cc_new = """                const res = await fetch('/api/attendance?action=getCampus', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    campusConfig = await res.json();
                    if(mapInitialized) renderMapCampus(campusConfig);
                }
            } catch (e) { console.error("Campus config error:", e); }"""
content = content.replace(fetch_cc_old, fetch_cc_new)

# 6. Hook updateStudentLocationOnMap and log coordinates inside Tracking handlers
update_pos_1 = """const dist = calculateDistanceLocal(latitude, longitude, campusConfig.latitude, campusConfig.longitude);"""
update_pos_new = """const dist = calculateDistanceLocal(latitude, longitude, campusConfig.latitude, campusConfig.longitude);
                        updateStudentLocationOnMap(latitude, longitude);
                        console.log(`[Google Maps Info] Student: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | Admin: ${campusConfig.latitude}, ${campusConfig.longitude} | Dist: ${dist.toFixed(1)}m`);
"""
content = content.replace(update_pos_1, update_pos_new)

with open(student_html, "w", encoding="utf-8") as f:
    f.write(content)

print("Student dashboard patched successfully.")
