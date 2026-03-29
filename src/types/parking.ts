export interface ParkingLotSummary {
  id: number;
  parkingName: string;
  lat: number;
  lng: number;
  totalCapacity: number;
  availableCount: number;
  feeType: string;
}

export interface ParkingLot {
  id: number;
  parkingCode: string;
  parkingName: string;
  address: string;
  district: string;
  parkingTypeName: string;
  operationType: string;
  phone: string;
  totalCapacity: number;
  currentCount: number;
  availableCount: number;
  updatedAt: string;
  feeType: string;
  basicFee: number;
  basicTime: number;
  additionalFee: number;
  additionalTime: number;
  monthlyFee: number;
  dayMaxFee: number;
  lat: string;
  lng: string;
  weekdayStart: string;
  weekdayEnd: string;
  weekendStart: string;
  weekendEnd: string;
  holidayStart: string;
  holidayEnd: string;
}

export interface ParkingResponse {
  content: ParkingLot[];
  nextCursor: number | null;
  hasNext: boolean;
}

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export type DataMode = 'REALTIME' | 'NON_REALTIME' | 'NOT_LINKED';

export interface NearbyParkingLot extends ParkingLot {
  distance: number;
}
