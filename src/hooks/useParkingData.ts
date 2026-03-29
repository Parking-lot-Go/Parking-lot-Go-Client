import { useState, useCallback, useRef } from 'react';
import type { ParkingLot, ParkingLotSummary, MapBounds, DataMode } from '../types/parking';
import { fetchParkingLots, fetchNearbyLots } from '../services/parkingApi';
import staticLots from '../data/parkingLots_static.json';

const REFRESH_INTERVAL = 30_000;
const DEBOUNCE_MS = 100;

function extractDistrict(region: string): string {
  const parts = region.split(' ');
  return parts.length > 1 ? parts[1].trim() : '';
}

function filterByBounds(lots: ParkingLotSummary[], bounds?: MapBounds): ParkingLotSummary[] {
  if (!bounds) return lots;
  return lots.filter(
    (lot) =>
      lot.lat >= bounds.swLat &&
      lot.lat <= bounds.neLat &&
      lot.lng >= bounds.swLng &&
      lot.lng <= bounds.neLng,
  );
}

export function useParkingData() {
  const [parkingLots, setParkingLots] = useState<(ParkingLot | ParkingLotSummary)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mode, setMode] = useState<DataMode>('NOT_LINKED');
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const isNearbyModeRef = useRef(false);
  const boundsRef = useRef<MapBounds | undefined>(undefined);
  const modeRef = useRef<DataMode>('NOT_LINKED');
  const districtRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const load = useCallback(async (m: DataMode, bounds?: MapBounds, _district?: string) => {
    if (m !== 'REALTIME') {
      const filtered = filterByBounds(staticLots as ParkingLotSummary[], bounds);
      if (filtered.length > 0) setParkingLots(filtered);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const data = await fetchParkingLots(m, undefined, undefined);
      if (data.length > 0) setParkingLots(data);
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
    if (modeRef.current !== 'REALTIME') return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      () => load(modeRef.current, boundsRef.current, districtRef.current),
      REFRESH_INTERVAL,
    );
  }, [load]);

  const updateBounds = useCallback(
    (bounds: MapBounds, region?: string) => {
      boundsRef.current = bounds;
      if (region) districtRef.current = extractDistrict(region);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (isNearbyModeRef.current) return;
        load(modeRef.current, bounds, districtRef.current);
        startInterval();
      }, DEBOUNCE_MS);
    },
    [load, startInterval],
  );

  const changeMode = useCallback(
    (newMode: DataMode) => {
      setMode(newMode);
      modeRef.current = newMode;
      if (intervalRef.current) clearInterval(intervalRef.current);
      load(newMode, boundsRef.current, districtRef.current);
      if (newMode === 'REALTIME') startInterval();
    },
    [load, startInterval],
  );

  const searchNearby = useCallback(async (lat: number, lng: number) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      setLoading(true);
      setIsNearbyMode(true);
      isNearbyModeRef.current = true;
      const data = await fetchNearbyLots(lat, lng);
      setParkingLots(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '주변 주차장을 불러올 수 없습니다');
      setIsNearbyMode(false);
      isNearbyModeRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  const exitNearby = useCallback(() => {
    setIsNearbyMode(false);
    isNearbyModeRef.current = false;
    load(modeRef.current, boundsRef.current, districtRef.current);
    startInterval();
  }, [load, startInterval]);

  const refresh = useCallback(() => {
    load(modeRef.current, boundsRef.current, districtRef.current);
  }, [load]);

  return { parkingLots, loading, error, lastUpdated, refresh, updateBounds, mode, changeMode, isNearbyMode, searchNearby, exitNearby };
}
