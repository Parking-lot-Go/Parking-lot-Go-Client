import type { ParkingLot, ParkingResponse, MapBounds, DataMode } from '../types/parking';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchParkingLots(type: DataMode, bounds?: MapBounds): Promise<ParkingLot[]> {
  const params = new URLSearchParams({ type });
  if (bounds) {
    params.set('swLat', String(bounds.swLat));
    params.set('swLng', String(bounds.swLng));
    params.set('neLat', String(bounds.neLat));
    params.set('neLng', String(bounds.neLng));
  }

  const res = await fetch(`${BASE}/parking?${params}`);
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);

  const data: ParkingResponse = await res.json();
  return data.content;
}
