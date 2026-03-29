import { useState, useCallback, useRef, useEffect } from 'react';
import { useParkingData } from './hooks/useParkingData';
import { fetchParkingDetail } from './services/parkingApi';
import Header from './components/Header';
import KakaoMap from './components/KakaoMap';
import NearbySheet from './components/NearbySheet';
import SavedSheet from './components/SavedSheet';
import DetailPage from './components/DetailPage';
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
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedExpanded, setSavedExpanded] = useState(false);
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);
  const [detailLot, setDetailLot] = useState<ParkingLot | null>(null);
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
    setPanTo({ lat, lng });
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
    if (tab === 'nearby') {
      setSavedOpen(false);
      setActiveTab(tab);
      if (isNearbyMode) {
        setSheetOpen(prev => !prev);
        return;
      }
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
      return;
    }

    if (tab === 'home') {
      setSavedOpen(false);
      setSheetOpen(false);
      setActiveTab(tab);
      return;
    }

    if (tab === 'saved') {
      setSheetOpen(false);
      setActiveTab(tab);
      setSavedOpen(prev => !prev);
      return;
    }
  }, [isNearbyMode, doNearbySearch]);

  const handleShowDetail = useCallback(async (lot: ParkingLot | ParkingLotSummary) => {
    try {
      const full = await fetchParkingDetail(lot.id);
      setDetailLot(full ?? (lot as ParkingLot));
    } catch {
      setDetailLot(lot as ParkingLot);
    }
  }, []);

  const hideHeader = savedExpanded || !!detailLot;

  // 뒤로가기 가로채기 — 열린 UI가 있으면 닫고, 없으면 앱 종료 방지
  const closeTopRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    closeTopRef.current = () => {
      if (detailLot) { setDetailLot(null); return true; }
      if (savedExpanded) { setSavedExpanded(false); return true; }
      if (savedOpen) { setSavedOpen(false); return true; }
      if (sheetOpen) { setSheetOpen(false); return true; }
      if (selectedLot) { setSelectedLot(null); return true; }
      return false;
    };
  }, [detailLot, savedExpanded, savedOpen, sheetOpen, selectedLot]);

  useEffect(() => {
    history.pushState({ pwa: true }, '');
    const handler = () => {
      const closed = closeTopRef.current();
      // 항상 스택 유지 — 앱이 꺼지지 않도록
      history.pushState({ pwa: true }, '');
      if (!closed) {
        // 닫을 게 없으면 홈 화면처럼 아무것도 안 함
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const nearbyLots = isNearbyMode
    ? (parkingLots as NearbyParkingLot[]).filter((l): l is NearbyParkingLot => 'distance' in l)
    : [];

  return (
    <div className="app">
      {!hideHeader && (
        <Header
          searchQuery={inputQuery}
          onSearchChange={setInputQuery}
          onSearch={handleSearch}
          onClearSearch={() => setSearchKeyword(null)}
          centerRegion={centerRegion}
          dataMode={mode}
          onModeChange={changeMode}
        />
      )}
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
            onShowDetail={handleShowDetail}
            panTo={panTo}
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

          <SavedSheet
            open={savedOpen}
            expanded={savedExpanded}
            onClose={() => { setSavedOpen(false); setSavedExpanded(false); }}
            onMinimize={() => { setSavedOpen(false); setSavedExpanded(false); }}
            onExpandChange={setSavedExpanded}
          />

        </main>
      </div>
      <NavBar activeTab={activeTab} onTabChange={handleTabChange} />

      <DetailPage
        lot={detailLot}
        open={!!detailLot}
        onClose={() => setDetailLot(null)}
      />
    </div>
  );
}
