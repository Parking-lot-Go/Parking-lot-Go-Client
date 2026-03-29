import type { ParkingLot, NearbyParkingLot, ParkingResponse, MapBounds, DataMode } from '../types/parking';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function fetchNearbyLots(lat: number, lng: number): Promise<NearbyParkingLot[]> {
  const params = new URLSearchParams({ type: 'near', lat: String(lat), lng: String(lng) });
  const res = await fetch(`${BASE}/search?${params}`);
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const data = await res.json();
  const lots: ParkingLot[] = Array.isArray(data) ? data : (data.content ?? []);
  return lots.map((lot) => ({
    ...lot,
    distance: haversine(lat, lng, Number(lot.lat), Number(lot.lng)),
  }));
}

export async function fetchParkingDetail(id: number): Promise<ParkingLot> {
  const res = await fetch(`${BASE}/parking/${id}`);
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  return res.json();
}

export async function fetchParkingLots(type: DataMode, bounds?: MapBounds, district?: string): Promise<ParkingLot[]> {
  const params = new URLSearchParams({ type });
  if (district) {
    params.set('district', district);
  }
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
