/**
 * Geolocation & Philippine Address Helpers for 10RCDG Roster & Enlistment
 */

export interface CommonLocation {
  short: string;
  full: string;
}

export const COMMON_10RCDG_LOCATIONS: CommonLocation[] = [
  { short: "Carmen, CDO", full: "Brgy. Carmen, Cagayan de Oro City, Misamis Oriental" },
  { short: "Lapasan, CDO", full: "Brgy. Lapasan, Cagayan de Oro City, Misamis Oriental" },
  { short: "Bulua, CDO", full: "Brgy. Bulua, Cagayan de Oro City, Misamis Oriental" },
  { short: "Nazareth, CDO", full: "Brgy. Nazareth, Cagayan de Oro City, Misamis Oriental" },
  { short: "Kauswagan, CDO", full: "Brgy. Kauswagan, Cagayan de Oro City, Misamis Oriental" },
  { short: "Macasandig, CDO", full: "Brgy. Macasandig, Cagayan de Oro City, Misamis Oriental" },
  { short: "Iligan City", full: "Iligan City, Lanao del Norte" },
  { short: "Malaybalay", full: "Malaybalay City, Bukidnon" },
  { short: "Valencia", full: "Valencia City, Bukidnon" },
  { short: "Tagoloan, MisOr", full: "Tagoloan, Misamis Oriental" },
  { short: "Gingoog City", full: "Gingoog City, Misamis Oriental" },
  { short: "El Salvador", full: "El Salvador City, Misamis Oriental" },
];

/**
 * Reverse geocode latitude/longitude coordinates to a readable Philippine address string.
 */
export async function reverseGeocodeCoords(lat: number, lon: number): Promise<string> {
  // 1. Primary: OpenStreetMap Nominatim with 4-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { "Accept-Language": "en" },
      }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const brgy = addr.quarter || addr.suburb || addr.neighbourhood || addr.village || addr.residential;
        const city = addr.city || addr.town || addr.municipality || addr.county;
        const province = addr.province || addr.state || addr.region;

        const parts: string[] = [];
        if (brgy) {
          const formattedBrgy = brgy.toLowerCase().startsWith("brgy") || brgy.toLowerCase().startsWith("barangay")
            ? brgy
            : `Brgy. ${brgy}`;
          parts.push(formattedBrgy);
        }
        if (city) parts.push(city);
        if (province && province !== city) parts.push(province);

        if (parts.length > 0) {
          return parts.join(", ");
        }
      }
    }
  } catch {}

  // 2. Secondary fallback: BigDataCloud client reverse geocoding
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.city;
      const subdivision = data.principalSubdivision;
      if (locality && subdivision) {
        return `${locality}, ${subdivision}`;
      } else if (locality) {
        return locality;
      }
    }
  } catch {}

  // 3. Fallback coordinate string
  return `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * Request device geolocation and resolve to address string
 */
export function requestDeviceLocation(): Promise<{
  address: string;
  coords: { lat: number; lon: number };
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device/browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const address = await reverseGeocodeCoords(latitude, longitude);
          resolve({
            address,
            coords: { lat: latitude, lon: longitude },
          });
        } catch (err: any) {
          reject(new Error("Unable to convert coordinates to an address. Please enter address manually."));
        }
      },
      (err) => {
        let msg = "Could not retrieve your location.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access or type address manually.";
        } else if (err.code === 2) {
          msg = "GPS signal unavailable. Please select from common location tags below.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please select from common location tags below.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

