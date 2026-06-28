export interface Coordinate {
  lat: number;
  lon: number;
}

/**
 * Calculates Euclidean distance between two coordinate centroids
 */
export function getDistance(c1: Coordinate, c2: Coordinate): number {
  const dLat = c1.lat - c2.lat;
  const dLon = c1.lon - c2.lon;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Spatially interpolates a temperature value for a district centroid based on the state centroid.
 * We apply a smooth geographic gradient variation based on distance and lat/lon coordinate offsets.
 */
export function interpolateValue(
  stateVal: number,
  stateCenter: Coordinate,
  districtCenter: Coordinate
): number {
  const dist = getDistance(stateCenter, districtCenter);
  
  // Latitude variance: temperature decreases as we go further north
  const latDelta = districtCenter.lat - stateCenter.lat;
  const lonDelta = districtCenter.lon - stateCenter.lon;

  const latVariance = latDelta * -0.6; // -0.6°C per degree latitude shift
  const lonVariance = lonDelta * 0.25; // +0.25°C per degree longitude shift
  const distanceNoise = Math.sin(dist * 6) * 0.5; // predictable micro-fluctuation wave

  const finalVal = stateVal + latVariance + lonVariance + distanceNoise;
  return Number(finalVal.toFixed(1));
}

/**
 * Fetches a single weather forecast payload representing the state's center telemetry.
 */
export async function fetchStateTelemetry(lat: number, lon: number): Promise<number | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (data && data.daily && data.daily.temperature_2m_max) {
      return data.daily.temperature_2m_max[0];
    }
    return null;
  } catch (e) {
    console.error("Failed to fetch state telemetry via Data Bridge:", e);
    return null;
  }
}
