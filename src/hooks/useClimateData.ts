import { useState, useEffect, useRef } from "react";
import { STATE_COORDS } from "../data/stateCoords";

interface ClimateCacheEntry {
  data: any;
  timestamp: number;
}

interface ClimateCache {
  [coordKey: string]: ClimateCacheEntry;
}

const CACHE_KEY = "met_net_ingress_cache";
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes

export async function fetchAllStatesData(onStateProgress?: (stateName: string, data: any) => void): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  const states = Object.keys(STATE_COORDS);

  for (let i = 0; i < states.length; i++) {
    const stateName = states[i];
    const coords = STATE_COORDS[stateName];
    if (!coords) continue;

    const [latitude, longitude] = coords;
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    // Check localStorage cache first
    let cachedData: any = null;
    try {
      const rawCache = localStorage.getItem(CACHE_KEY);
      if (rawCache) {
        const cache = JSON.parse(rawCache);
        const entry = cache[cacheKey];
        if (entry && Date.now() - entry.timestamp < CACHE_EXPIRATION_MS) {
          cachedData = entry.data;
        }
      }
    } catch (e) {
      console.warn("Failed to read cache for eager fetch:", e);
    }

    if (cachedData) {
      results[stateName] = cachedData;
      onStateProgress?.(stateName, cachedData);
      continue;
    }

    // Wait 500ms before fetching if it's not the first query and not cached
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const apiData = await res.json();
      
      console.log(`MET-NET EAGER INGRESS for ${stateName}:`, apiData);

      // Save to cache
      try {
        const rawCache = localStorage.getItem(CACHE_KEY);
        const cache = rawCache ? JSON.parse(rawCache) : {};
        cache[cacheKey] = {
          data: apiData,
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (e) {
        console.warn("Failed to write cache for eager fetch:", e);
      }

      results[stateName] = apiData;
      onStateProgress?.(stateName, apiData);
    } catch (err) {
      console.error(`Eager fetch failed for ${stateName}:`, err);
    }
  }

  return results;
}

export function useClimateData(lat: number | null, lon: number | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isCircuitOpen, setIsCircuitOpen] = useState<boolean>(false);
  const consecutiveFailuresRef = useRef<number>(0);

  useEffect(() => {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      setData(null);
      setError(null);
      setLoading(false);
      setIsStale(false);
      return;
    }

    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

    // Check cache
    let cachedData: ClimateCache = {};
    try {
      const rawCache = localStorage.getItem(CACHE_KEY);
      if (rawCache) {
        cachedData = JSON.parse(rawCache);
      }
    } catch (e) {
      console.warn("Failed to parse climate data cache:", e);
    }

    const cachedEntry = cachedData[cacheKey];
    
    // If circuit breaker is open, serve cached data immediately (stale mode)
    if (isCircuitOpen) {
      if (cachedEntry) {
        setData(cachedEntry.data);
        setIsStale(true);
        setError("Circuit breaker active: Serving stale-while-revalidate cached data.");
      }
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (cachedEntry && now - cachedEntry.timestamp < CACHE_EXPIRATION_MS) {
      setData(cachedEntry.data);
      setIsStale(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let active = true;

    const performFetchWithBackoff = async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation`;
      
      const retryDelays = [1000, 2000, 4000];
      let attempt = 0;

      while (attempt <= retryDelays.length) {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`HTTP status ${res.status}`);
          }
          const apiData = await res.json();
          
          if (!active) return;

          // Success: reset circuit breaker counter and write cache
          consecutiveFailuresRef.current = 0;
          setIsCircuitOpen(false);

          try {
            const freshCache = {
              ...cachedData,
              [cacheKey]: {
                data: apiData,
                timestamp: Date.now(),
              },
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(freshCache));
          } catch (e) {
            console.warn("Failed to save climate data to cache:", e);
          }

          setData(apiData);
          setIsStale(false);
          setError(null);
          setLoading(false);
          return;
        } catch (err: any) {
          console.warn(`Fetch attempt ${attempt + 1} failed for coordinate [${cacheKey}]:`, err);
          
          if (attempt < retryDelays.length) {
            await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
            attempt++;
          } else {
            // All retry attempts failed
            if (!active) return;

            consecutiveFailuresRef.current += 1;
            if (consecutiveFailuresRef.current >= 3) {
              setIsCircuitOpen(true);
            }

            // Stale-while-revalidate fallback
            if (cachedEntry) {
              setData(cachedEntry.data);
              setIsStale(true);
              setError(`Live fetch failed. Serving stale cache.`);
            } else {
              setData(null);
              setError(`Ingress error: ${err.message}`);
            }
            setLoading(false);
            return;
          }
        }
      }
    };

    performFetchWithBackoff();

    return () => {
      active = false;
    };
  }, [lat, lon, isCircuitOpen]);

  return { data, loading, error, isStale, isCircuitOpen };
}
