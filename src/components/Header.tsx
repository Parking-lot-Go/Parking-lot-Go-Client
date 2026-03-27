import type { DataMode } from '../types/parking';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  centerRegion?: string;
  dataMode: DataMode;
  onModeChange: (mode: DataMode) => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  centerRegion,
  dataMode,
  onModeChange,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleClear = () => {
    onSearchChange('');
    onClearSearch();
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="app-header">
      <div className="header-top-row">
        {centerRegion && (
          <div className="center-region">
            <svg viewBox="0 0 18 18" width="14" height="14">
              <path fill="#1e293b" d="M9,1C5.4,1,2.5,3.7,2.5,7.1c0,1.2.4,2.3,1,3.3l5.1,6.1c.2.2.6.2.8,0l5.1-6.1c.7-1,1-2.1,1-3.3C15.5,3.7,12.6,1,9,1zM9,9c-.8,0-1.5-.7-1.5-1.5S8.2,6,9,6s1.5.7,1.5,1.5S9.8,9,9,9z"/>
            </svg>
            <span>{centerRegion}</span>
          </div>
        )}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${dataMode === 'NON_REALTIME' ? 'active' : ''}`}
            onClick={() => onModeChange('NON_REALTIME')}
          >
            비실시간
          </button>
          <button
            className={`mode-btn ${dataMode === 'REALTIME' ? 'active' : ''}`}
            onClick={() => onModeChange('REALTIME')}
          >
            <span className="realtime-dot" />
            실시간
          </button>
        </div>
      </div>
      <div className="search-box">
        <svg className="search-box-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="주차장 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchQuery ? (
          <button className="search-clear" onClick={handleClear} aria-label="초기화">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" fill="#e2e8f0" stroke="none" />
              <path d="M15 9l-6 6M9 9l6 6" stroke="#64748b" />
            </svg>
          </button>
        ) : null}
        {searchQuery.trim() && (
          <button className="search-submit" onClick={handleSearchClick} aria-label="검색">
            검색
          </button>
        )}
      </div>
    </header>
  );
}
