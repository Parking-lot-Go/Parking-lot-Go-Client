import { useState, useCallback, useRef } from 'react';
import { useParkingData } from './hooks/useParkingData';
import { fetchParkingDetail } from './services/parkingApi';
import Header from './components/Header';
import KakaoMap from './components/KakaoMap';
import NearbySheet from './components/NearbySheet';
import NavBar, { type TabId } from './components/NavBar';
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
  const [activeTab, setActiveTab] = useState<TabId>('nearby');
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const handleSelectLot = useCallback(async (lot: ParkingLot | ParkingLotSummary) => {
    if (selectedLot?.id === lot.id) { setSelectedLot(null); return; }
    if ('address' in lot) { setSelectedLot(lot); return; }
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

  const handleBoundsChange = useCallback((bounds: MapBounds, region?: string) => {
    mapCenterRef.current = {
      lat: (bounds.swLat + bounds.neLat) / 2,
      lng: (bounds.swLng + bounds.neLng) / 2,
    };
    updateBounds(bounds, region);
  }, [updateBounds]);

  const doNearbySearch = useCallback((lat: number, lng: number) => {
    userLocRef.current = { lat, lng };
    searchNearby(lat, lng);
    setSheetOpen(true);
  }, [searchNearby]);

  const handleReSearch = useCallback(() => {
    const center = mapCenterRef.current || userLocRef.current;
    if (center) doNearbySearch(center.lat, center.lng);
  }, [doNearbySearch]);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    exitNearby();
  }, [exitNearby]);

  const handleMinimizeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const handleSheetSelectLot = useCallback((lot: NearbyParkingLot) => {
    setSheetOpen(false);
    handleSelectLot(lot);
  }, [handleSelectLot]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'nearby') {
      if (isNearbyMode) { setSheetOpen(true); return; }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLoading(false);
          doNearbySearch(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setGpsLoading(false);
          doNearbySearch(37.27903037476364, 127.46299871026446);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, [isNearbyMode, doNearbySearch]);

  const nearbyLots = isNearbyMode
    ? (parkingLots as NearbyParkingLot[]).filter((l): l is NearbyParkingLot => 'distance' in l)
    : [];

  return (
    <div className="app">
      <Header
        searchQuery={inputQuery}
        onSearchChange={setInputQuery}
        onSearch={handleSearch}
        onClearSearch={() => setSearchKeyword(null)}
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
            onSearchResult={(placeName) => console.log(`[Search] ${placeName}`)}
            onCenterRegionChange={setCenterRegion}
            onBoundsChange={handleBoundsChange}
            onMapClick={isNearbyMode ? handleMinimizeSheet : undefined}
            dataMode={mode}
          />

          {activeTab === 'nearby' && gpsLoading && (
            <div className="nearby-gps-loading">
              <span className="nearby-fab-spinner" />
              위치를 확인하는 중...
            </div>
          )}

          {isNearbyMode && (
            <NearbySheet
              open={sheetOpen}
              lots={nearbyLots}
              loading={loading}
              onClose={handleCloseSheet}
              onMinimize={handleMinimizeSheet}
              onReSearch={handleReSearch}
              onSelectLot={handleSheetSelectLot}
            />
          )}
        </main>
      </div>
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
