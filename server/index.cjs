require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());
app.use(express.json());

// 연계구분 코드 매핑
const TYPE_CODE_MAP = {
  REALTIME: '1',     // 실시간 연계
  NON_REALTIME: '2', // 비실시간
  NOT_LINKED: '0',   // 미연계
};

// bounds 필터링 유틸
function filterByBounds(data, query) {
  const { swLat, swLng, neLat, neLng } = query;
  if (!swLat || !swLng || !neLat || !neLng) return data;
  const sw = { lat: parseFloat(swLat), lng: parseFloat(swLng) };
  const ne = { lat: parseFloat(neLat), lng: parseFloat(neLng) };
  return data.filter((lot) => {
    const lat = parseFloat(lot.lat);
    const lng = parseFloat(lot.lng);
    return lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng;
  });
}

// 서울시 공영주차장 실시간 API
const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const SEOUL_API_HOST = process.env.SEOUL_API_HOST;
if (!SEOUL_API_KEY || !SEOUL_API_HOST) {
  console.error('SEOUL_API_KEY 또는 SEOUL_API_HOST 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}
const SEOUL_API_BASE = `${SEOUL_API_HOST}/${SEOUL_API_KEY}/json/GetParkingInfo`;

// 인메모리 캐시: 실시간 60초, 비실시간 5분
const cache = { data: null, updatedAt: 0 };
const CACHE_TTL_REALTIME = 60 * 1000;
const CACHE_TTL_STATIC = 5 * 60 * 1000;

async function fetchSeoulParking(typeCode) {
  const ttl = typeCode === '1' ? CACHE_TTL_REALTIME : CACHE_TTL_STATIC;
  const now = Date.now();

  if (cache.data && (now - cache.updatedAt) < ttl) {
    return cache.data;
  }

  const all = [];
  const PAGE_SIZE = 1000;
  let start = 1;
  let total = Infinity;

  while (start <= total) {
    const end = start + PAGE_SIZE - 1;
    const url = `${SEOUL_API_BASE}/${start}/${end}/`;
    const response = await fetch(url);
    const json = await response.json();

    if (!json.GetParkingInfo || json.GetParkingInfo.RESULT?.CODE !== 'INFO-000') break;

    total = json.GetParkingInfo.list_total_count;
    const rows = json.GetParkingInfo.row || [];

    for (const r of rows) {
      const lat = parseFloat(r.LAT);
      const lng = parseFloat(r.LNG);
      if (!lat || !lng || lat === 0 || lng === 0) continue;

      all.push({
        id: r.PARKING_CODE ? parseInt(r.PARKING_CODE) : start,
        parkingCode: r.PARKING_CODE || '',
        parkingName: r.PARKING_NAME || '',
        address: r.ADDR || '',
        district: r.QUE_NM || '',
        parkingTypeName: r.PARKING_TYPE_NM || '',
        operationType: r.OPERATION_RULE_NM || '',
        phone: r.TEL || '',
        totalCapacity: parseInt(r.CAPACITY) || 0,
        currentCount: parseInt(r.CUR_PARKING) || 0,
        availableCount: Math.max(0, (parseInt(r.CAPACITY) || 0) - (parseInt(r.CUR_PARKING) || 0)),
        feeType: r.PAY_YN === 'Y' ? '유료' : '무료',
        basicFee: parseInt(r.RATES) || 0,
        basicTime: parseInt(r.TIME_RATE) || 0,
        additionalFee: parseInt(r.ADD_RATES) || 0,
        additionalTime: parseInt(r.ADD_TIME_RATE) || 0,
        monthlyFee: parseInt(r.FULLTIME_MONTHLY) || 0,
        dayMaxFee: parseInt(r.DAY_MAXIMUM) || 0,
        lat: String(lat),
        lng: String(lng),
        weekdayStart: r.WEEKDAY_BEGIN_TIME || '',
        weekdayEnd: r.WEEKDAY_END_TIME || '',
        weekendStart: r.WEEKEND_BEGIN_TIME || '',
        weekendEnd: r.WEEKEND_END_TIME || '',
        holidayStart: r.HOLIDAY_BEGIN_TIME || '',
        holidayEnd: r.HOLIDAY_END_TIME || '',
        updatedAt: r.SYNC_TIME || new Date().toISOString(),
        linkType: r.LNKG_SE || '',
      });
    }
    start += PAGE_SIZE;
  }

  cache.data = all;
  cache.updatedAt = Date.now();
  console.log(`[Cache] 서울 API 데이터 갱신 (${all.length}건)`);
  return all;
}

// API: /api/v1/parking — type 파라미터로 연계구분(LNKG_SE) 필터링
app.get('/api/v1/parking', async (req, res) => {
  try {
    const type = req.query.type || 'REALTIME';
    const typeCode = TYPE_CODE_MAP[type] || '1';

    let data = await fetchSeoulParking(typeCode);

    // LNKG_SE 필드로 연계구분 필터링
    data = data.filter((lot) => lot.linkType === typeCode);

    // district 파라미터로 구/군 필터링
    const district = req.query.district;
    if (district) {
      data = data.filter((lot) => lot.district.includes(district));
    }

    data = filterByBounds(data, req.query);

    res.json({
      content: data,
      nextCursor: null,
      hasNext: false,
    });
  } catch (err) {
    console.error('[API Error]', err.message);
    res.status(500).json({ error: '데이터를 불러올 수 없습니다' });
  }
});

// API: Get single parking lot by code
app.get('/api/parking/:code', async (req, res) => {
  try {
    const data = await fetchSeoulParking();
    const lot = data.find((l) => l.parkingCode === req.params.code);

    if (!lot) {
      return res.status(404).json({ error: '주차장을 찾을 수 없습니다' });
    }

    res.json(lot);
  } catch (err) {
    console.error('[API Error]', err.message);
    res.status(500).json({ error: '데이터를 불러올 수 없습니다' });
  }
});

// Production: serve built frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  // 서버 시작 시 서울 API 데이터 미리 로드 (첫 요청 즉시 응답)
  try {
    await fetchSeoulParking('1');
    console.log(`[Cache] 서울 API 데이터 사전 로드 완료`);
  } catch (err) {
    console.error('[Cache] 사전 로드 실패:', err.message);
  }
});
