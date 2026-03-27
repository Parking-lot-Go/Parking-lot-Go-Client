import { useState, useCallback, useRef } from 'react';
import type { ParkingLot, MapBounds, DataMode } from '../types/parking';
import { fetchParkingLots } from '../services/parkingApi';

const REFRESH_INTERVAL = 30_000;

export function useParkingData() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mode, setMode] = useState<DataMode>('REALTIME');
  const boundsRef = useRef<MapBounds | undefined>();
  const modeRef = useRef<DataMode>(mode);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async (m: DataMode, bounds?: MapBounds) => {
    try {
      setLoading(true);
      const data = await fetchParkingLots(m, bounds);
      setParkingLots(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => load(modeRef.current, boundsRef.current), REFRESH_INTERVAL);
  }, [load]);

  const updateBounds = useCallback((bounds: MapBounds) => {
    boundsRef.current = bounds;
    load(modeRef.current, bounds);
    startInterval();
  }, [load, startInterval]);

  const changeMode = useCallback((newMode: DataMode) => {
    setMode(newMode);
    modeRef.current = newMode;
    if (intervalRef.current) clearInterval(intervalRef.current);
    load(newMode, boundsRef.current);
    startInterval();
  }, [load, startInterval]);

  const refresh = useCallback(() => {
    load(modeRef.current, boundsRef.current);
  }, [load]);

  return { parkingLots, loading, error, lastUpdated, refresh, updateBounds, mode, changeMode };
}
