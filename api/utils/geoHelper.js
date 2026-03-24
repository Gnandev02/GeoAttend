const calculateDistance = (lat1, lon1, lat2, lon2) => {

    if (
        lat1 === undefined || lon1 === undefined ||
        lat2 === undefined || lon2 === undefined
    ) {
        console.warn("[GeoHelper] Missing coordinates");
        return null;
    }

    const nLat1 = parseFloat(lat1);
    const nLon1 = parseFloat(lon1);
    const nLat2 = parseFloat(lat2);
    const nLon2 = parseFloat(lon2);

    if (
        isNaN(nLat1) || isNaN(nLon1) ||
        isNaN(nLat2) || isNaN(nLon2)
    ) {
        console.warn("[GeoHelper] Invalid coordinates:", {
            lat1, lon1, lat2, lon2
        });
        return null;
    }

    const R = 6371000;

    const dLat = (nLat2 - nLat1) * Math.PI / 180;
    const dLon = (nLon2 - nLon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(nLat1 * Math.PI / 180) *
        Math.cos(nLat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
};

module.exports = { calculateDistance };
