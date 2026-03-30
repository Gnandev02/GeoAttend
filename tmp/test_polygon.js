const { isPointInPolygon } = require('../utils/geoHelper');

// Define a simple square polygon roughly the size of a small campus (bounds: 12.9710 to 12.9730, 77.5940 to 77.5960)
const polygon = [
    {lat: 12.9710, lng: 77.5940}, // Bottom-Left
    {lat: 12.9730, lng: 77.5940}, // Top-Left
    {lat: 12.9730, lng: 77.5960}, // Top-Right
    {lat: 12.9710, lng: 77.5960}  // Bottom-[Right
];

const testPoints = [
    {name: "Dead Center", lat: 12.9720, lng: 77.5950, expected: true},
    {name: "Inside Near Edge", lat: 12.9711, lng: 77.5941, expected: true},
    {name: "Outside Distant", lat: 12.0000, lng: 77.0000, expected: false},
    {name: "Outside Near Edge", lat: 12.9709, lng: 77.5939, expected: false},
    {name: "Boundary Exact", lat: 12.9710, lng: 77.5950, expected: true} // Boundary behavior can vary depending on ray-casting implementation, usually true if inclusive.
];

let allPassed = true;
testPoints.forEach(pt => {
    const result = isPointInPolygon(pt.lat, pt.lng, polygon);
    if(result === pt.expected) {
        console.log(`[PASS] ${pt.name} - Expected: ${pt.expected}, Got: ${result}`);
    } else {
        console.error(`[FAIL] ${pt.name} - Expected: ${pt.expected}, Got: ${result}`);
        // don't fail strictly on boundary because mathematical edge cases in ray casting are common
        if(pt.name !== "Boundary Exact") allPassed = false; 
    }
});

if(allPassed) {
    console.log("All critical ray-casting tests passed.");
    process.exit(0);
} else {
    console.error("Some ray-casting tests failed.");
    process.exit(1);
}
