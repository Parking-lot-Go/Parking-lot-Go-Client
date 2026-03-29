import { useState, useRef } from 'react';
import type { NearbyParkingLot } from '../types/parking';

interface Props {
  open: boolean;
  lots: NearbyParkingLot[];
  loading: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onReSearch: () => void;
  onSelectLot: (lot: NearbyParkingLot) => void;
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

const SWIPE_THRESHOLD = 80;

export default function NearbySheet({ open, lots, loading, onClose, onMinimize, onReSearch, onSelectLot }: Props) {
  const [sortBy, setSortBy] = useState<'distance' | 'fee'>('distance');
  const [dragY, setDragY] = useState(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);

  const sorted = [...lots].sort((a, b) =>
    sortBy === 'distance' ? a.distance - b.distance : a.basicFee - b.basicFee,
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    if (dragY > SWIPE_THRESHOLD) {
      onMinimize();
    }
    setDragY(0);
  };

  const translateY = !open ? '100%' : dragY > 0 ? `${dragY}px` : '0';
  const transition = dragY > 0 ? 'none' : 'transform 0.28s cubic-bezier(0.32,0.72,0,1)';

  return (
    <div
      className="nearby-sheet"
      style={{ transform: `translateY(${translateY})`, transition, pointerEvents: open ? 'auto' : 'none' }}
    >
      <div
        className="nearby-sheet-handle-area"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="nearby-sheet-handle" />
        <div className="nearby-sheet-header">
          <span className="nearby-sheet-title">내 주변 주차장</span>
          <div className="nearby-sheet-actions">
            <button className="nearby-research-btn" onClick={onReSearch}>
              <svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 9A5.5 5.5 0 1 1 9 3.5" strokeLinecap="round"/>
                <path d="M9 1v4l2.5-2L9 1Z" fill="currentColor" stroke="none"/>
              </svg>
              현위치 재검색
            </button>
            <button className="nearby-close-btn" onClick={onClose} aria-label="닫기">✕</button>
          </div>
        </div>
      </div>

      <div className="nearby-sort-row">
        <button
          className={`nearby-sort-btn ${sortBy === 'distance' ? 'active' : ''}`}
          onClick={() => setSortBy('distance')}
        >
          거리순
        </button>
        <button
          className={`nearby-sort-btn ${sortBy === 'fee' ? 'active' : ''}`}
          onClick={() => setSortBy('fee')}
        >
          요금순
        </button>
      </div>

      <div className="nearby-list">
        {loading && (
          <div className="nearby-loading">
            <span className="nearby-loading-spinner" />
            주변 주차장을 찾는 중...
          </div>
        )}
        {!loading && sorted.map((lot, i) => (
          <div key={lot.id} className="nearby-item" onClick={() => onSelectLot(lot)}>
            <div className="nearby-item-rank">{i + 1}</div>
            <div className="nearby-item-body">
              <div className="nearby-item-top">
                <span className="nearby-item-name">{lot.parkingName}</span>
                <span className="nearby-item-dist">{formatDistance(lot.distance)}</span>
              </div>
              <div className="nearby-item-bottom">
                {lot.feeType === '유료' && (
                  <span className="nearby-fee-badge">유료</span>
                )}
                {lot.basicFee > 0 && (
                  <span className="nearby-item-fee">{lot.basicFee.toLocaleString()}원/{lot.basicTime}분</span>
                )}
                {lot.totalCapacity > 0 && (
                  <span className="nearby-item-capacity">총 {lot.totalCapacity}면</span>
                )}
              </div>
            </div>
            <svg className="nearby-item-arrow" viewBox="0 0 8 14" fill="none" width="8" height="14">
              <path d="M1 1l6 6-6 6" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ))}
        </div>
    </div>
  );
}
