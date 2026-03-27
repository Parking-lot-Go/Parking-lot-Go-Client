import { useState, useCallback, useRef } from 'react';
import type { ParkingLot, MapBounds, DataMode } from '../types/parking';
import { fetchParkingLots } from '../services/parkingApi';

const REFRESH_INTERVAL = 30_000;
const DEBOUNCE_MS = 100;

function extractDistrict(region: string): string {
  const parts = region.split(' ');
  return parts.length > 1 ? parts[1].trim() : '';
}

export function useParkingData() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mode, setMode] = useState<DataMode>('REALTIME');
  const boundsRef = useRef<MapBounds | undefined>(undefined);
  const modeRef = useRef<DataMode>(mode);
  const districtRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const load = useCallback(async (m: DataMode, bounds?: MapBounds, district?: string) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    // 실시간: type만, 비실시간: bounds + district 포함
    const isRealtime = m === 'REALTIME';

    try {
      setLoading(true);
      const data = await fetchParkingLots(
        m,
        isRealtime ? undefined : bounds,
        isRealtime ? undefined : district,
      );
      if (data.length > 0) {
        setParkingLots(data);
      }
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => load(modeRef.current, boundsRef.current, districtRef.current), REFRESH_INTERVAL);
  }, [load]);

  const updateBounds = useCallback((bounds: MapBounds, region?: string) => {
    boundsRef.current = bounds;
    if (region) {
      districtRef.current = extractDistrict(region);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(modeRef.current, bounds, districtRef.current);
      startInterval();
    }, DEBOUNCE_MS);
  }, [load, startInterval]);

  const changeMode = useCallback((newMode: DataMode) => {
    setMode(newMode);
    modeRef.current = newMode;
    if (intervalRef.current) clearInterval(intervalRef.current);
    load(newMode, boundsRef.current, districtRef.current);
    startInterval();
  }, [load, startInterval]);

  const refresh = useCallback(() => {
    load(modeRef.current, boundsRef.current, districtRef.current);
  }, [load]);

  return { parkingLots, loading, error, lastUpdated, refresh, updateBounds, mode, changeMode };
}
