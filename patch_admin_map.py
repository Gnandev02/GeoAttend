import os

admin_html = r"c:\Users\Gnandev\Desktop\GEO INTEGRATED ATTENDENCE\frontend\admin-dashboard.html"

with open(admin_html, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject Map script tag
head_end = "</head>"
script_tag = """    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDhq-vVMfPkHbaiFLyhR029wjr0tHKj0ng&callback=initAdminMap" async defer></script>
</head>"""
content = content.replace(head_end, script_tag)

# 2. Add map div to Geofence Tab
geo_form = '<form id="geofence-form"'
geo_form_inject = """                    <div class="px-8 pt-8">
                        <div id="admin-map" class="w-full h-96 rounded-2xl border border-slate-200 shadow-sm z-0 relative bg-slate-100 flex items-center justify-center text-slate-400 font-medium">Loading Interactive Map...</div>
                    </div>
                    <form id="geofence-form\""""
content = content.replace(geo_form, geo_form_inject)

# 3. Add JS functions and hook into renderGeofence
script_end = "</body>"
map_js = """
        let adminMap, adminMarker, adminCircle;
        window.initAdminMap = function() {
            const latInput = document.getElementById('geo-lat');
            const lngInput = document.getElementById('geo-lng');
            const radiusInput = document.getElementById('geo-radius');

            const lat = parseFloat(latInput.value) || 12.9716;
            const lng = parseFloat(lngInput.value) || 77.5946;
            const radius = parseFloat(radiusInput.value) || 500;

            adminMap = new google.maps.Map(document.getElementById('admin-map'), {
                center: { lat, lng },
                zoom: 16,
                mapTypeId: 'roadmap',
                mapTypeControl: false,
                streetViewControl: false
            });

            adminMarker = new google.maps.Marker({
                position: { lat, lng },
                map: adminMap,
                draggable: true,
                animation: google.maps.Animation.DROP,
                title: "Campus Center"
            });

            adminCircle = new google.maps.Circle({
                strokeColor: "#4f46e5",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#4f46e5",
                fillOpacity: 0.15,
                map: adminMap,
                center: { lat, lng },
                radius: radius
            });

            google.maps.event.addListener(adminMarker, 'dragend', function(event) {
                const newLat = event.latLng.lat();
                const newLng = event.latLng.lng();
                latInput.value = newLat.toFixed(6);
                lngInput.value = newLng.toFixed(6);
                adminCircle.setCenter({ lat: newLat, lng: newLng });
            });

            adminMap.addListener('click', (e) => {
                const newLat = e.latLng.lat();
                const newLng = e.latLng.lng();
                adminMarker.setPosition({ lat: newLat, lng: newLng });
                adminCircle.setCenter({ lat: newLat, lng: newLng });
                latInput.value = newLat.toFixed(6);
                lngInput.value = newLng.toFixed(6);
            });

            radiusInput.addEventListener('input', (e) => {
                const r = parseFloat(e.target.value) || 0;
                if(adminCircle) adminCircle.setRadius(r);
            });
            
            // Allow manual keyboard entry for lat/lng to move map
            const updateFromInputs = () => {
                const nLat = parseFloat(latInput.value) || 0;
                const nLng = parseFloat(lngInput.value) || 0;
                if (nLat && nLng) {
                    const pos = { lat: nLat, lng: nLng };
                    adminMap.setCenter(pos);
                    adminMarker.setPosition(pos);
                    adminCircle.setCenter(pos);
                }
            };
            latInput.addEventListener('input', updateFromInputs);
            lngInput.addEventListener('input', updateFromInputs);
        };
</body>"""
content = content.replace("</body>", map_js)

render_geo_old = """                document.getElementById('geo-radius').value = mainCampus.radius || '';
            }"""
render_geo_new = """                document.getElementById('geo-radius').value = mainCampus.radius || '';
                
                if (window.adminMap && mainCampus.latitude) {
                    const pos = { lat: parseFloat(mainCampus.latitude), lng: parseFloat(mainCampus.longitude) };
                    adminMap.setCenter(pos);
                    if(adminMarker) adminMarker.setPosition(pos);
                    if(adminCircle) {
                        adminCircle.setCenter(pos);
                        adminCircle.setRadius(parseFloat(mainCampus.radius) || 500);
                    }
                }
            }"""
content = content.replace(render_geo_old, render_geo_new)

with open(admin_html, "w", encoding="utf-8") as f:
    f.write(content)

print("Admin dashboard patched successfully.")
