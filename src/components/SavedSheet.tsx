import { useState, useRef } from 'react';

interface Props {
  open: boolean;
  expanded: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onExpandChange: (expanded: boolean) => void;
}

const PARTIAL_VH = 38;
const CLOSE_THRESHOLD = 80;
const EXPAND_THRESHOLD = -80;

export default function SavedSheet({ open, expanded, onClose, onMinimize, onExpandChange }: Props) {
  const [dragY, setDragY] = useState(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    setDragY(e.touches[0].clientY - startYRef.current);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    if (expanded) {
      if (dragY > CLOSE_THRESHOLD * 3) {
        onExpandChange(false);
        onMinimize();
      } else if (dragY > CLOSE_THRESHOLD) {
        onExpandChange(false);
      }
    } else {
      if (dragY < EXPAND_THRESHOLD) {
        onExpandChange(true);
      } else if (dragY > CLOSE_THRESHOLD) {
        onMinimize();
      }
    }
    setDragY(0);
  };

  const baseVh = !open ? 100 : expanded ? 0 : PARTIAL_VH;
  const translateY = dragY !== 0
    ? `calc(${baseVh}vh + ${dragY}px)`
    : !open ? '100%' : `${baseVh}vh`;
  const transition = dragY !== 0 ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';

  return (
    <div
      className="saved-sheet"
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
          <span className="nearby-sheet-title">저장한 주차장</span>
          <button className="nearby-close-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>
      </div>

      <div className="nearby-list">
        <div className="tab-page-body">
          <p className="tab-page-empty">저장된 주차장이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
