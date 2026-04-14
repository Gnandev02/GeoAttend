const GOOGLE_MAPS_API_KEY = "AIzaSyDhq-vVMfPkHbaiFLyhR029wjr0tHKj0ng";

/**
 * Dynamically loads the Google Maps script.
 * @param {string} callbackName - The name of the global function to call when loaded.
 */
function loadGoogleMaps(callbackName) {
    if (window.google && window.google.maps) {
        if (window[callbackName]) window[callbackName]();
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error("Google Maps API failed to load.");
        // We'll handle showing fallback in the dashboards themselves or via a standard ID
        showMapFallback('student-map');
        showMapFallback('admin-map');
    };
    document.head.appendChild(script);
}

/**
 * Checks if Google Maps is loaded and functional.
 * @returns {boolean}
 */
function isGoogleMapsLoaded() {
    return typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined';
}

/**
 * Displays a fallback message in the map container if loading fails.
 * @param {string} containerId - The ID of the map element.
 */
function showMapFallback(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                <div class="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
                    <i data-lucide="map-pin-off" class="w-6 h-6"></i>
                </div>
                <h4 class="text-slate-900 font-bold mb-1">Map failed to load</h4>
                <p class="text-xs text-slate-500">Please check API configuration or your internet connection.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// Exporting to window for global access
window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;
window.isGoogleMapsLoaded = isGoogleMapsLoaded;
window.showMapFallback = showMapFallback;
window.loadGoogleMaps = loadGoogleMaps;
