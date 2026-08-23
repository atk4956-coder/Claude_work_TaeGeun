import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { config } from '../config/env.js';

interface EstateData {
  date: string;
  price: number;
  area: number;
  location: string;
}

// 지역코드 매핑 (예시)
const REGION_CODES: Record<string, string> = {
  '서울': '11110', // 강남구
  '부산': '26110',
  '인천': '28110',
};

export async function fetchMolitData(
  region: string = '서울',
  dealType: string = 'apts',
  pageNo: number = 1
): Promise<EstateData[]> {
  try {
    const lawdCd = REGION_CODES[region] || '11110';
    const serviceKey = config.MOLIT_SERVICE_KEY;

    // MOLIT API 호출 (최근 3개월 데이터)
    const promises = [];
    const now = new Date();

    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dealYmd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

      const url = 'https://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade';
      const params = {
        serviceKey,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo: 1,
        numOfRows: 10,
      };

      promises.push(
        axios.get(url, { params }).catch(err => {
          console.error(`[MOLIT API Error] DEAL_YMD=${dealYmd}:`, err.message);
          return null;
        })
      );
    }

    const responses = await Promise.all(promises);
    const allData: EstateData[] = [];

    for (const response of responses) {
      if (!response || !response.data) continue;

      const parsed = await parseStringPromise(response.data);
      const items = parsed?.response?.body?.[0]?.items?.[0]?.item || [];

      for (const item of items) {
        const dealAmount = parseInt(item.거래금액?.[0] || '0');
        const area = parseFloat(item.건물면적?.[0] || '0');
        const address = item.도로명주소?.[0] || '';
        const dateStr = item.계약일자?.[0] || '';

        if (dealAmount && dateStr) {
          allData.push({
            date: formatDate(dateStr),
            price: Math.round(dealAmount / 10000), // 만원 단위
            area,
            location: address,
          });
        }
      }
    }

    // 날짜순 정렬 (최신순)
    allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allData.length > 0 ? allData : getMockData();
  } catch (error) {
    console.error('[MOLIT API] Fatal error:', error);
    return getMockData();
  }
}

function formatDate(dateStr: string): string {
  // 20240115 → 2024-01-15
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function getMockData(): EstateData[] {
  return [
    { date: '2024-01-15', price: 80.0, area: 84.95, location: '서울시 강남구' },
    { date: '2024-01-10', price: 75.0, area: 84.95, location: '서울시 강남구' },
    { date: '2023-12-28', price: 82.0, area: 84.95, location: '서울시 강남구' },
    { date: '2023-12-20', price: 78.5, area: 84.95, location: '서울시 강남구' },
    { date: '2023-12-15', price: 81.0, area: 84.95, location: '서울시 강남구' },
  ];
}
