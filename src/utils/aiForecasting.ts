export interface HistoryPoint {
  day: number;
  temp: number;
}

/**
 * Trains a simple linear regression model (y = mx + c) on historical temperature data
 * and predicts the temperature for a target future day.
 */
export function trainAndForecast(historicalTemps: number[], targetDayOffset: number): number {
  if (!historicalTemps || historicalTemps.length === 0) return 0;

  // Map temps to historical coordinate points
  const points: HistoryPoint[] = historicalTemps.map((temp, index) => ({
    day: index,
    temp
  }));

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = points[i].day;
    const y = points[i].temp;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].day;
    const y = points[i].temp;
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) * (x - meanX);
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // Day offset 30 is timeline index 0 (Today).
  // Day offset 30 + targetDayOffset calculates any timeline step index projection.
  const targetDay = 30 + targetDayOffset;
  const prediction = slope * targetDay + intercept;
  return Number(prediction.toFixed(1));
}

/**
 * Fetches 30 days of past maximum daily temperatures representing the state's center telemetry.
 */
export async function fetchStateHistoricalData(lat: number, lon: number): Promise<number[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=30&daily=temperature_2m_max&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (data && data.daily && data.daily.temperature_2m_max) {
      return data.daily.temperature_2m_max.slice(0, 30);
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch state historical data via AI Ingress:", e);
    return [];
  }
}
