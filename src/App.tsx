import { useState, useCallback, useRef } from 'react';
import { useParkingData } from './hooks/useParkingData';
import { fetchParkingDetail } from './services/parkingApi';
import Header from './components/Header';
import KakaoMap from './components/KakaoMap';
import NearbySheet from './components/NearbySheet';
import type { ParkingLot, ParkingLotSummary, NearbyParkingLot, MapBounds } from './types/parking';
import './App.css';

export default function App() {
  const { parkingLots, loading, updateBounds, mode, changeMode, isNearbyMode, searchNearby, exitNearby } = useParkingData();
  const [selectedLot, setSelectedLot] = useState<ParkingLot | ParkingLotSummary | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [searchKeyword, setSearchKeyword] = useState<string | null>(null);
  const [centerRegion, setCenterRegion] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);

  const handleSelectLot = useCallback(async (lot: ParkingLot | ParkingLotSummary) => {
    if (selectedLot?.id === lot.id) {
      setSelectedLot(null);
      return;
    }
    if ('address' in lot) {
      setSelectedLot(lot);
      return;
    }
    try {
      const detail = await fetchParkingDetail(lot.id);
      setSelectedLot(detail);
    } catch {
      setSelectedLot(lot);
    }
  }, [selectedLot]);

  const handleSearch = useCallback((query: string) => {
    setSearchKeyword(query + '::' + Date.now());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchKeyword(null);
  }, []);

  const handleSearchResult = useCallback((placeName: string, _lat: number, _lng: number) => {
    console.log(`[Search] ${placeName} 으로 이동`);
  }, []);

  const handleBoundsChange = useCallback((bounds: MapBounds, region?: string) => {
    updateBounds(bounds, region);
  }, [updateBounds]);

  const doNearbySearch = useCallback((lat: number, lng: number) => {
    userLocRef.current = { lat, lng };
    searchNearby(lat, lng);
    setSheetOpen(true);
  }, [searchNearby]);

  const handleNearbyFab = useCallback(() => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        doNearbySearch(pos.coords.latitude, pos.coords.longitude);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [doNearbySearch]);

  const handleReSearch = useCallback(() => {
    if (userLocRef.current) {
      doNearbySearch(userLocRef.current.lat, userLocRef.current.lng);
    }
  }, [doNearbySearch]);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    exitNearby();
  }, [exitNearby]);

  const handleSheetSelectLot = useCallback((lot: NearbyParkingLot) => {
    setSheetOpen(false);
    handleSelectLot(lot);
  }, [handleSelectLot]);

  const nearbyLots = isNearbyMode
    ? (parkingLots as NearbyParkingLot[]).filter((l): l is NearbyParkingLot => 'distance' in l)
    : [];

  return (
    <div className="app">
      <Header
        searchQuery={inputQuery}
        onSearchChange={setInputQuery}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        centerRegion={centerRegion}
        dataMode={mode}
        onModeChange={changeMode}
      />
      <div className="app-body">
        <main className="app-map">
          <KakaoMap
            parkingLots={parkingLots}
            selectedLot={selectedLot}
            onSelectLot={handleSelectLot}
            searchKeyword={searchKeyword}
            onSearchResult={handleSearchResult}
            onCenterRegionChange={setCenterRegion}
            onBoundsChange={handleBoundsChange}
            dataMode={mode}
          />

          {!isNearbyMode && (
            <button
              className={`nearby-fab ${gpsLoading ? 'loading' : ''}`}
              onClick={handleNearbyFab}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <span className="nearby-fab-spinner" />
              ) : (
                <span className="nearby-fab-p">P</span>
              )}
              내 주변 주차장
            </button>
          )}

          {isNearbyMode && sheetOpen && (
            <NearbySheet
              lots={nearbyLots}
              loading={loading}
              onClose={handleCloseSheet}
              onReSearch={handleReSearch}
              onSelectLot={handleSheetSelectLot}
            />
          )}
        </main>
      </div>
    </div>
  );
}
