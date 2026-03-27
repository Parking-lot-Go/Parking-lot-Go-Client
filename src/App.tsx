import { useState, useCallback } from 'react';
import { useParkingData } from './hooks/useParkingData';
import Header from './components/Header';
import KakaoMap from './components/KakaoMap';
import type { ParkingLot, MapBounds } from './types/parking';
import './App.css';

export default function App() {
  const { parkingLots, updateBounds, mode, changeMode } = useParkingData();
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [searchKeyword, setSearchKeyword] = useState<string | null>(null);
  const [centerRegion, setCenterRegion] = useState<string>('');

  const handleSelectLot = useCallback((lot: ParkingLot) => {
    setSelectedLot((prev) => (prev?.id === lot.id ? null : lot));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchKeyword(query + '::' + Date.now());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchKeyword(null);
  }, []);

  const handleSearchResult = useCallback((placeName: string, _lat: number, _lng: number) => {
    console.log(`[Search-test] ${placeName} 으로 이동`);
  }, []);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    updateBounds(bounds);
  }, [updateBounds]);

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
          />
        </main>
      </div>
    </div>
  );
}
