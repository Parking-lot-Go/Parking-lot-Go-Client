import type { ParkingLot } from '../types/parking';
import { openNavigation } from '../utils/navigation';

interface Props {
  lot: ParkingLot | null;
  open: boolean;
  onClose: () => void;
}

function fmt(t: string): string {
  if (!t || t === '00:00') return null as unknown as string;
  return t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t;
}

function TimeRow({ label, start, end }: { label: string; start: string; end: string }) {
  const s = fmt(start);
  const e = fmt(end);
  const allDay = s === '00:00' && e === '23:59';
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className="detail-row-value">
        {!s && !e ? '운영 안 함' : allDay ? '00:00 ~ 24:00' : `${s} ~ ${e}`}
      </span>
    </div>
  );
}

export default function DetailPage({ lot, open, onClose }: Props) {
  const translateY = open ? '0' : '100%';
  const transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';

  const lat = lot ? parseFloat(lot.lat) : 0;
  const lng = lot ? parseFloat(lot.lng) : 0;

  const handleShare = async () => {
    if (!lot) return;
    if (navigator.share) {
      await navigator.share({ title: lot.parkingName, text: lot.address }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(lot.address).catch(() => {});
    }
  };

  return (
    <div
      className="detail-page"
      style={{ transform: `translateY(${translateY})`, transition, pointerEvents: open ? 'auto' : 'none' }}
    >
      {lot && (
        <>
          {/* 상단 이미지 */}
          <div className="detail-hero">
            <img src="/parking-default.svg" alt={lot.parkingName} className="detail-hero-img" />
            <button className="detail-back-btn" onClick={onClose} aria-label="뒤로">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div className="detail-scroll">
            {/* 이름 + 타입 */}
            <div className="detail-title-section">
              <h1 className="detail-name">{lot.parkingName}</h1>
              <p className="detail-meta">
                {lot.parkingTypeName && <span>{lot.parkingTypeName}</span>}
                {lot.totalCapacity > 0 && <span>총 {lot.totalCapacity}면</span>}
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="detail-actions">
              <button className="detail-action-btn" onClick={handleShare}>
                <span className="detail-action-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                  </svg>
                </span>
                <span className="detail-action-label">공유</span>
              </button>
              <button className="detail-action-btn">
                <span className="detail-action-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3.5l2.09 4.26 4.71.68-3.4 3.32.8 4.69L12 14.27l-4.2 2.18.8-4.69-3.4-3.32 4.71-.68L12 3.5Z" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="detail-action-label">즐겨찾기</span>
              </button>
              <button
                className="detail-action-btn primary"
                onClick={() => openNavigation(lat, lng, lot.parkingName)}
              >
                <span className="detail-action-icon">
                  <img src="/navi_icon.png" alt="" width="22" height="22" className="detail-navi-icon" />
                </span>
                <span className="detail-action-label">길 안내</span>
              </button>
            </div>

            {/* 기본 정보 */}
            <div className="detail-section">
              {lot.address && (
                <div className="detail-info-row">
                  <svg viewBox="0 0 18 18" width="16" height="16" flex-shrink="0">
                    <path fill="#8B95A1" d="M9,1C5.4,1,2.5,3.7,2.5,7.1c0,1.2.4,2.3,1,3.3l5.1,6.1c.2.2.6.2.8,0l5.1-6.1c.7-1,1-2.1,1-3.3C15.5,3.7,12.6,1,9,1zM9,9c-.8,0-1.5-.7-1.5-1.5S8.2,6,9,6s1.5.7,1.5,1.5S9.8,9,9,9z"/>
                  </svg>
                  <span>{lot.address}</span>
                </div>
              )}
              {lot.phone && (
                <div className="detail-info-row">
                  <svg viewBox="0 0 18 18" width="16" height="16">
                    <path fill="#8B95A1" d="M13.8,15.6c-.2.2-.6.3-.9.3C7.6,14.6,3.4,10.4,2.1,5.1c-.1-.3,0-.6.3-.9L3.9,2.7c.4-.4,1-.4,1.4,0l2.5,2.5c.4.4.4,1,0,1.4l-.1.1-.7.8c-.4.3-.4.8-.2,1.2.8,1.2,1.9,2.2,3.1,2.9l1.3-1.3c.4-.4,1-.4,1.4,0l2.5,2.5c.4.4.4,1,0,1.4l-1.3,1.4z"/>
                  </svg>
                  <a href={`tel:${lot.phone}`} className="detail-phone">{lot.phone}</a>
                </div>
              )}
            </div>

            {/* 시간요금 */}
            {lot.feeType !== '무료' && (
              <div className="detail-section">
                <h2 className="detail-section-title">시간요금</h2>
                <div className="detail-row">
                  <span className="detail-row-label">기본요금</span>
                  <span className="detail-row-value">
                    {lot.basicFee > 0 ? `${lot.basicTime}분 ${lot.basicFee.toLocaleString()}원` : '없음'}
                  </span>
                </div>
                {lot.additionalFee > 0 && (
                  <div className="detail-row">
                    <span className="detail-row-label">추가요금</span>
                    <span className="detail-row-value">{lot.additionalTime}분 {lot.additionalFee.toLocaleString()}원</span>
                  </div>
                )}
                {lot.dayMaxFee > 0 && (
                  <div className="detail-row">
                    <span className="detail-row-label">일 최대</span>
                    <span className="detail-row-value">{lot.dayMaxFee.toLocaleString()}원</span>
                  </div>
                )}
              </div>
            )}

            {/* 월주차요금 */}
            {lot.monthlyFee > 0 && (
              <div className="detail-section">
                <h2 className="detail-section-title">월주차요금</h2>
                <div className="detail-row">
                  <span className="detail-row-label">기본</span>
                  <span className="detail-row-value">{lot.monthlyFee.toLocaleString()}원</span>
                </div>
              </div>
            )}

            {/* 운영시간 */}
            <div className="detail-section">
              <h2 className="detail-section-title">운영시간</h2>
              <TimeRow label="평일" start={lot.weekdayStart} end={lot.weekdayEnd} />
              <TimeRow label="토요일" start={lot.weekendStart} end={lot.weekendEnd} />
              <TimeRow label="일요일" start={lot.weekendStart} end={lot.weekendEnd} />
              <TimeRow label="공휴일" start={lot.holidayStart} end={lot.holidayEnd} />
            </div>

            {/* 업데이트 정보 */}
            {lot.updatedAt && (
              <p className="detail-updated">{lot.updatedAt.slice(0, 10).replace(/-/g, '.')} 업데이트된 정보입니다.</p>
            )}

            <div className="detail-disclaimer">
              안내하는 정보는 현장의 최신 정보와 차이가 있을 수 있습니다.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
