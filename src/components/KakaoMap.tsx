import { useEffect, useRef, useState, useCallback } from 'react';
import type { ParkingLot, ParkingLotSummary, MapBounds, DataMode } from '../types/parking';

type AnyLot = ParkingLot | ParkingLotSummary;

function isFullLot(lot: AnyLot): lot is ParkingLot {
  return 'address' in lot;
}

function openNavigation(lat: number, lng: number, name: string) {
  const provider = localStorage.getItem('preferredNav') || 'naver';
  const encoded = encodeURIComponent(name);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (provider === 'naver') {
    if (isAndroid) {
      // Intent URL → Chrome Custom Tab이 처리 → 네이버지도 앱 실행
      window.open(`intent://route/car?dlat=${lat}&dlng=${lng}&dname=${encoded}&appname=carpark#Intent;scheme=nmap;package=com.nhn.android.nmap;end`, '_blank');
    } else if (isIOS) {
      location.href = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encoded}&appname=carpark`;
    } else {
      window.open(`https://map.naver.com/index.nhn?menu=route&pathType=0&elng=${lng}&elat=${lat}&etext=${encoded}`, '_blank');
    }
    return;
  }

  // 카카오내비
  if (isAndroid) {
    window.open(`intent://route?ep=${lat},${lng}&by=CAR&destinationName=${encoded}#Intent;scheme=kakaonavi;package=com.locnall.KimGiSa;end`, '_blank');
  } else if (isIOS) {
    location.href = `kakaonavi://route?ep=${lat},${lng}&by=CAR&destinationName=${encoded}`;
  } else {
    window.open(`https://map.kakao.com/link/to/${encoded},${lat},${lng}`, '_blank');
  }
}

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY;
const KAKAO_SDK_URL =
  `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;

interface Props {
  parkingLots: AnyLot[];
  selectedLot: AnyLot | null;
  onSelectLot: (lot: AnyLot) => void;
  searchKeyword: string | null;
  onSearchResult: (placeName: string, lat: number, lng: number) => void;
  onCenterRegionChange?: (region: string) => void;
  onBoundsChange?: (bounds: MapBounds, region?: string) => void;
  onMapClick?: () => void;
  dataMode: DataMode;
}

function toLat(lot: AnyLot) { return typeof lot.lat === 'number' ? lot.lat : parseFloat(lot.lat as string); }
function toLng(lot: AnyLot) { return typeof lot.lng === 'number' ? lot.lng : parseFloat(lot.lng as string); }

function getStatusColor(lot: AnyLot): string {
  if (lot.totalCapacity === 0) return '#9ca3af';
  const ratio = lot.availableCount / lot.totalCapacity;
  if (ratio > 0.3) return '#22c55e';
  if (ratio > 0.1) return '#f59e0b';
  return '#ef4444';
}

function getStatusLabel(lot: AnyLot): string {
  if (lot.totalCapacity === 0) return '정보없음';
  const ratio = lot.availableCount / lot.totalCapacity;
  if (ratio > 0.3) return '여유';
  if (ratio > 0.1) return '혼잡';
  return '만차';
}

function formatTime(t: string): string {
  if (!t || t.length < 4) return t;
  return t.slice(0, 2) + ':' + t.slice(2);
}

export default function KakaoMap({ parkingLots, selectedLot, onSelectLot, searchKeyword, onSearchResult, onCenterRegionChange, onBoundsChange, onMapClick, dataMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlayMapRef = useRef<Map<string, { overlay: kakao.maps.CustomOverlay; el: HTMLDivElement }>>(new Map());
  const popupRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const myLocOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');

  // 1) Load Kakao SDK
  useEffect(() => {
    const initSdk = () => {
      try {
        window.kakao.maps.load(() => {
          console.log('[KakaoMap] SDK loaded successfully');
          setSdkReady(true);
        });
      } catch (err) {
        console.error('[KakaoMap] SDK load() failed:', err);
        setSdkError('카카오맵 SDK 초기화 실패');
      }
    };

    if (window.kakao?.maps) {
      initSdk();
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps) initSdk();
      else setSdkError('카카오맵 SDK를 찾을 수 없습니다. JavaScript 키를 확인하세요.');
    };
    script.onerror = () => setSdkError('카카오맵 SDK 스크립트 로드 실패.');
    document.head.appendChild(script);
  }, []);

  // 2) Init map
  useEffect(() => {
    if (!sdkReady || !containerRef.current || mapRef.current) return;

    try {
      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 7,
        minLevel: 3,
        maxLevel: 8,
      });
      mapRef.current = map;

      // 역지오코딩 (지역명 표시용) — 별도 처리
      const geocoder = new kakao.maps.services.Geocoder();
      let geocodeTimer: ReturnType<typeof setTimeout>;
      let lastGeoLat = 0;
      let lastGeoLng = 0;
      let lastRegionName = '';

      const updateRegionName = () => {
        clearTimeout(geocodeTimer);
        geocodeTimer = setTimeout(() => {
          const center = map.getCenter();
          const lat = center.getLat();
          const lng = center.getLng();

          const moved = Math.abs(lat - lastGeoLat) + Math.abs(lng - lastGeoLng);
          if (moved < 0.005 && lastRegionName) return;

          geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
            if (status === kakao.maps.services.Status.OK && result.length > 0) {
              const r = result.find((item: any) => item.region_type === 'H') || result[0];
              const name = [r.region_1depth_name, r.region_2depth_name, r.region_3depth_name]
                .filter(Boolean)
                .join(' ');
              lastGeoLat = lat;
              lastGeoLng = lng;
              lastRegionName = name;
              onCenterRegionChange?.(name);
            }
          });
        }, 1000);
      };

      // bounds 변경 (데이터 요청용) — 즉시 처리
      const updateBounds = () => {
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        onBoundsChange?.({
          swLat: sw.getLat(),
          swLng: sw.getLng(),
          neLat: ne.getLat(),
          neLng: ne.getLng(),
        }, lastRegionName);
      };

      kakao.maps.event.addListener(map, 'idle', () => {
        updateBounds();
        updateRegionName();
      });
      updateBounds();
      updateRegionName();

      kakao.maps.event.addListener(map, 'click', () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        if (popupRef.current) {
          popupRef.current.setMap(null);
          popupRef.current = null;
        }
        onMapClick?.();
      });

      kakao.maps.event.addListener(map, 'dragstart', () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
    } catch (err) {
      console.error('[KakaoMap] Map init failed:', err);
      setSdkError('지도 초기화 실패. 카카오 개발자 콘솔에서 현재 도메인이 등록되어 있는지 확인하세요.');
    }
  }, [sdkReady]);

  // Close popup
  const closePopup = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.setMap(null);
      popupRef.current = null;
    }
  }, []);

  // ===== GPS =====
  const showMyLocation = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (myLocOverlayRef.current) myLocOverlayRef.current.setMap(null);

    const el = document.createElement('div');
    el.className = 'my-location-marker';
    el.innerHTML = `<div class="my-loc-pulse"></div><div class="my-loc-dot"></div>`;

    myLocOverlayRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(lat, lng),
      content: el,
      map,
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 15,
    });
  }, []);

  const moveToMyLocation = useCallback((lat: number, lng: number) => {
    setGpsStatus('active');
    showMyLocation(lat, lng);
    if (mapRef.current) {
      mapRef.current.setCenter(new kakao.maps.LatLng(lat, lng));
      mapRef.current.setLevel(4);
    }
  }, [showMyLocation]);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('loading');

    // 1차: 캐시 허용, 정확도 낮춤 → PC/모바일 모두 빠르게 응답
    navigator.geolocation.getCurrentPosition(
      (pos) => moveToMyLocation(pos.coords.latitude, pos.coords.longitude),
      (firstErr) => {
        console.warn('[GPS] 1차 실패:', firstErr.message);
        // 2차: 정확도 높임, 타임아웃 넉넉하게
        navigator.geolocation.getCurrentPosition(
          (pos) => moveToMyLocation(pos.coords.latitude, pos.coords.longitude),
          (secondErr) => {
            console.error('[GPS] 2차 실패:', secondErr.message);
            setGpsStatus('error');
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [moveToMyLocation]);

  // ===== Popup =====
  const showPopup = useCallback((lot: AnyLot) => {
    const map = mapRef.current;
    if (!map) return;
    closePopup();

    const isRealtime = dataMode === 'REALTIME';
    const full = isFullLot(lot);
    const color = isRealtime ? getStatusColor(lot) : '#9ca3af';
    const label = isRealtime ? getStatusLabel(lot) : '';
    const pct = isRealtime && lot.totalCapacity > 0
      ? Math.round(((lot.totalCapacity - lot.availableCount) / lot.totalCapacity) * 100)
      : 0;
    const isPaid = lot.feeType === '유료';

    const availSection = isRealtime
      ? `<div class="popup-avail-bar">
            <div class="popup-avail-info">
              <span class="popup-avail-label">주차 가능</span>
              <span><strong style="color:${color}">${lot.availableCount}</strong> / ${lot.totalCapacity}면</span>
            </div>
            <div class="popup-bar"><div class="popup-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`
      : `<div class="popup-avail-bar">
            <div class="popup-avail-info">
              <span class="popup-avail-label">총 주차면</span>
              <span><strong>${lot.totalCapacity}면</strong></span>
            </div>
          </div>`;

    const el = document.createElement('div');
    el.className = 'map-popup';
    el.innerHTML = `
      <div class="popup-card">
        <button class="popup-close">&times;</button>
        <div class="popup-img">
          <img src="/parking-default.svg" alt="${lot.parkingName}" />
          <span class="popup-img-type">${full ? lot.parkingTypeName : '-'}</span>
        </div>
        <div class="popup-body">
          <div class="popup-header">
            <div class="popup-name">${lot.parkingName}</div>
            ${label ? `<span class="popup-badge" style="background:${color}">${label}</span>` : ''}
          </div>
          ${availSection}
          <div class="popup-section">
            ${full ? `<div class="popup-info-row">
              <svg class="popup-icon" viewBox="0 0 18 18"><path fill="#8B95A1" d="M9,1C5.4,1,2.5,3.7,2.5,7.1c0,1.2.4,2.3,1,3.3l5.1,6.1c.2.2.6.2.8,0l5.1-6.1c.7-1,1-2.1,1-3.3C15.5,3.7,12.6,1,9,1zM9,9c-.8,0-1.5-.7-1.5-1.5S8.2,6,9,6s1.5.7,1.5,1.5S9.8,9,9,9z"/></svg>
              <span>${lot.address}</span>
            </div>` : ''}
            ${full ? `<div class="popup-info-row">
              <svg class="popup-icon" viewBox="0 0 18 18"><path fill="#8B95A1" d="M9,1.5C4.9,1.5,1.5,4.9,1.5,9s3.4,7.5,7.5,7.5,7.5-3.4,7.5-7.5S13.1,1.5,9,1.5zM11.7,11.5c-.2.3-.6.3-.9.1L8.4,9.9V5.8c0-.4.3-.6.6-.6s.6.3.6.6v3.4l1.9,1.4c.3.2.4.6.2.9z"/></svg>
              <span>평일 ${formatTime(lot.weekdayStart)} ~ ${formatTime(lot.weekdayEnd)}</span>
            </div>` : ''}
            ${full && lot.phone ? `<div class="popup-info-row">
              <svg class="popup-icon" viewBox="0 0 18 18"><path fill="#8B95A1" d="M13.8,15.6c-.2.2-.6.3-.9.3C7.6,14.6,3.4,10.4,2.1,5.1c-.1-.3,0-.6.3-.9L3.9,2.7c.4-.4,1-.4,1.4,0l2.5,2.5c.4.4.4,1,0,1.4l-.1.1-.7.8c-.4.3-.4.8-.2,1.2.8,1.2,1.9,2.2,3.1,2.9l1.3-1.3c.4-.4,1-.4,1.4,0l2.5,2.5c.4.4.4,1,0,1.4l-1.3,1.4z"/></svg>
              <span>${lot.phone}</span>
            </div>` : ''}
            <div class="popup-info-row">
              <svg class="popup-icon" viewBox="0 0 18 18"><path fill="#8B95A1" d="M9,16.5c4.1,0,7.5-3.4,7.5-7.5S13.1,1.5,9,1.5,1.5,4.9,1.5,9s3.4,7.5,7.5,7.5zM13.5,6.1l-.7,2.4h.7c.3,0,.5.2.5.5s-.2.5-.5.5h-1.2l-.8,3h-1.3l-.8-3h-1l-.8,3H6.3l-.8-3h-1C4.2,9.5,4,9.3,4,9s.2-.5.5-.5h.8L4.6,6.1h1.2l.6,2.4h1.4l.6-2.4h1.2l.6,2.4h1.4l.6-2.4h1.3z"/></svg>
              <div class="popup-price-wrap">
                ${full && isPaid
                  ? `<span class="popup-price-row">기본 <em>${lot.basicFee.toLocaleString()}원</em> / ${lot.basicTime}분</span>
                     ${lot.dayMaxFee > 0 ? `<span class="popup-price-row">일 최대 <em>${lot.dayMaxFee.toLocaleString()}원</em></span>` : ''}`
                  : `<span class="popup-price-free">${isPaid ? '유료' : '무료'}</span>`}
              </div>
            </div>
          </div>
        </div>
        <div class="popup-footer">
          <button class="popup-nav-btn">
            <img src="/navi_icon.png" alt="" width="16" height="16" class="popup-nav-icon" />
            길 안내
          </button>
        </div>
      </div>
      <div class="popup-tail"></div>
    `;

    el.querySelector('.popup-close')!.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });

    el.querySelector('.popup-nav-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      openNavigation(toLat(lot), toLng(lot), lot.parkingName);
    });

    popupRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(toLat(lot), toLng(lot)),
      content: el,
      map,
      yAnchor: 1.15,
      xAnchor: 0.5,
      zIndex: 20,
    });
  }, [closePopup, dataMode]);

  // 3) Render markers (diff 기반: 기존 마커 유지, 변경분만 업데이트)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sdkReady) return;

    const isRealtime = dataMode === 'REALTIME';
    const prev = overlayMapRef.current;
    const next = new Map<string, { overlay: kakao.maps.CustomOverlay; el: HTMLDivElement }>();
    const newKeys = new Set<string>();

    parkingLots.forEach((lot) => {
      const lat = toLat(lot);
      const lng = toLng(lot);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const key = (isFullLot(lot) ? lot.parkingCode : null) || `${lot.id}`;
      newKeys.add(key);

      const color = isRealtime ? getStatusColor(lot) : '#9ca3af';

      const existing = prev.get(key);
      if (existing) {
        // 기존 마커 업데이트 (DOM만 교체, 오버레이 유지)
        existing.el.innerHTML = isRealtime
          ? `<div class="marker-pin" style="--c:${color}">
              <div class="marker-head">
                <span class="marker-p">P</span>
                <span class="marker-count">${lot.availableCount}</span>
              </div>
              <div class="marker-tail"></div>
            </div>`
          : `<div class="marker-pin" style="--c:${color}">
              <div class="marker-head">
                <span class="marker-p">P</span>
              </div>
              <div class="marker-tail"></div>
            </div>`;
        next.set(key, existing);
      } else {
        // 새 마커 생성
        const pos = new kakao.maps.LatLng(lat, lng);
        const el = document.createElement('div');
        el.className = 'map-marker';
        el.innerHTML = isRealtime
          ? `<div class="marker-pin" style="--c:${color}">
              <div class="marker-head">
                <span class="marker-p">P</span>
                <span class="marker-count">${lot.availableCount}</span>
              </div>
              <div class="marker-tail"></div>
            </div>`
          : `<div class="marker-pin" style="--c:${color}">
              <div class="marker-head">
                <span class="marker-p">P</span>
              </div>
              <div class="marker-tail"></div>
            </div>`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectLot(lot);
        });

        const overlay = new kakao.maps.CustomOverlay({
          position: pos,
          content: el,
          map,
          yAnchor: 1,
          xAnchor: 0.5,
          zIndex: 5,
        });

        next.set(key, { overlay, el });
      }
    });

    // 새 데이터에 없는 마커만 제거
    prev.forEach((entry, key) => {
      if (!newKeys.has(key)) {
        entry.overlay.setMap(null);
      }
    });

    overlayMapRef.current = next;
  }, [parkingLots, sdkReady, onSelectLot, dataMode]);

  // 4) Pan to selected — 부드럽게 이동 후 팝업
  useEffect(() => {
    const map = mapRef.current;
    if (!selectedLot || !map) return;

    const targetLevel = 5;
    const pos = new kakao.maps.LatLng(toLat(selectedLot), toLng(selectedLot));

    // 줌 레벨이 다르면 한 번에 변경 후 panTo
    if (map.getLevel() !== targetLevel) {
      map.setLevel(targetLevel);
    }

    // 팝업이 검색창을 가리지 않도록 마커 위치보다 지도를 아래로 내림
    const proj = map.getProjection();
    const point = proj.pointFromCoords(pos);
    point.y -= 150;
    const shiftedPos = proj.coordsFromPoint(point);
    map.panTo(shiftedPos);

    showPopup(selectedLot);
  }, [selectedLot, showPopup]);

  // 5) Kakao Places search
  const searchOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!searchKeyword || !map || !sdkReady) return;

    const ps = new kakao.maps.services.Places();
    const keyword = searchKeyword.replace(/::.*$/, '');

    ps.keywordSearch(keyword, (results, status) => {
      if (status !== kakao.maps.services.Status.OK || results.length === 0) {
        const gc = new kakao.maps.services.Geocoder();
        gc.addressSearch(keyword, (addrResults, addrStatus) => {
          if (addrStatus === kakao.maps.services.Status.OK && addrResults.length > 0) {
            const r = addrResults[0];
            moveToSearchResult(r.address_name, parseFloat(r.y), parseFloat(r.x));
          }
        });
        return;
      }
      const r = results[0];
      moveToSearchResult(r.place_name, parseFloat(r.y), parseFloat(r.x));
    });

    function moveToSearchResult(name: string, lat: number, lng: number) {
      console.log('========== 검색 결과 ==========');
      console.log('장소명:', name);
      console.log('lat:', lat);
      console.log('lng:', lng);
      console.log('DB 저장용:', JSON.stringify({ name, lat, lng }));
      console.log('================================');
      if (!map) return;
      if (searchOverlayRef.current) searchOverlayRef.current.setMap(null);

      const pos = new kakao.maps.LatLng(lat, lng);
      map.setCenter(pos);
      map.setLevel(5);

      const el = document.createElement('div');
      el.className = 'search-marker';
      el.innerHTML = `
        <div class="search-pin">
          <svg viewBox="0 0 24 32" width="28" height="36">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#2563eb"/>
            <circle cx="12" cy="11" r="5" fill="white"/>
          </svg>
        </div>
        <div class="search-label">${name}</div>
      `;

      searchOverlayRef.current = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        map: map ?? undefined,
        yAnchor: 1.1,
        xAnchor: 0.5,
        zIndex: 12,
      });

      onSearchResult(name, lat, lng);
    }
  }, [searchKeyword, sdkReady, onSearchResult]);

  return (
    <div ref={containerRef} className="kakao-map">
      {sdkReady && (
        <button className={`my-loc-btn ${gpsStatus}`} onClick={handleMyLocation} title="내 위치">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
          </svg>
          {gpsStatus === 'loading' && <span className="my-loc-spinner" />}
        </button>
      )}

      {gpsStatus === 'error' && (
        <div className="gps-toast">
          <svg viewBox="0 0 18 18" width="16" height="16">
            <path fill="#ef4444" d="M9,1C5.4,1,2.5,3.7,2.5,7.1c0,1.2.4,2.3,1,3.3l5.1,6.1c.2.2.6.2.8,0l5.1-6.1c.7-1,1-2.1,1-3.3C15.5,3.7,12.6,1,9,1zM9,9c-.8,0-1.5-.7-1.5-1.5S8.2,6,9,6s1.5.7,1.5,1.5S9.8,9,9,9z"/>
          </svg>
          <span>위치 정보를 가져올 수 없습니다.</span>
          <button onClick={() => setGpsStatus('idle')}>&times;</button>
        </div>
      )}

      {!sdkReady && !sdkError && (
        <div className="map-loading">
          <div className="spinner" />
          <p>지도를 불러오는 중...</p>
        </div>
      )}
      {sdkError && (
        <div className="map-error">
          <div className="error-icon">!</div>
          <p className="error-msg">{sdkError}</p>
          <div className="error-help">
            <p><strong>확인 사항:</strong></p>
            <ol>
              <li>카카오 개발자 콘솔에서 <strong>JavaScript 키</strong> 확인</li>
              <li>플랫폼 &gt; Web에 현재 도메인 등록</li>
              <li>브라우저 콘솔(F12)에서 상세 에러 확인</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
