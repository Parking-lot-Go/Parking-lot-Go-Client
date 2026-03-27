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

async function fetchSeoulParking() {
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
  return all;
}

// API: /api/v1/parking — type 파라미터로 연계구분(LNKG_SE) 필터링
app.get('/api/v1/parking', async (req, res) => {
  try {
    const type = req.query.type || 'REALTIME';
    const typeCode = TYPE_CODE_MAP[type] || '1';

    let data = await fetchSeoulParking();

    // LNKG_SE 필드로 연계구분 필터링
    data = data.filter((lot) => lot.linkType === typeCode);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
