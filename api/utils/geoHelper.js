const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Ensure all inputs are Numbers
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
        console.warn("[GeoHelper] Invalid input detected (NaN).");
        return Infinity; 
    }

    const R = 6371e3; // Earth radius in meters
    const radLat1 = nLat1 * Math.PI / 180;
    const radLat2 = nLat2 * Math.PI / 180;
    const deltaLat = (nLat2 - nLat1) * Math.PI / 180;
    const deltaLon = (nLon2 - nLon1) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

module.exports = { calculateDistance };
