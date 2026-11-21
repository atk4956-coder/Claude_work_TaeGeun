import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { config } from '../config/env.js';
import { saveEstateRecords, EstateRecord } from './database.js';

type EstateData = EstateRecord;

// 지역코드 매핑 (법정동 코드 앞 5자리, LAWD_CD)
export const SEOUL_GU_CODES: Record<string, string> = {
  '종로구': '11110', '중구': '11140', '용산구': '11170', '성동구': '11200', '광진구': '11215',
  '동대문구': '11230', '중랑구': '11260', '성북구': '11290', '강북구': '11305', '도봉구': '11320',
  '노원구': '11350', '은평구': '11380', '서대문구': '11410', '마포구': '11440', '양천구': '11470',
  '강서구': '11500', '구로구': '11530', '금천구': '11545', '영등포구': '11560', '동작구': '11590',
  '관악구': '11620', '서초구': '11650', '강남구': '11680', '송파구': '11710', '강동구': '11740',
};

// 경기도 주요 시 (구가 있는 시는 대표 코드 사용)
const GYEONGGI_CODES: Record<string, string> = {
  '수원시': '41110', '성남시': '41130', '의정부시': '41150', '안양시': '41170', '부천시': '41190',
  '광명시': '41210', '평택시': '41220', '안산시': '41270', '고양시': '41280', '남양주시': '41360',
  '오산시': '41370', '하남시': '41450', '용인시': '41460', '김포시': '41570', '화성시': '41590',
};

const REGION_CODES: Record<string, string> = {
  ...SEOUL_GU_CODES,
  ...GYEONGGI_CODES,
};

// 경기도 전체 요청 시 조회할 대표 시 (전체 시군 조회는 호출 수가 너무 많음)
const GYEONGGI_DEFAULT = ['성남시', '수원시', '고양시', '용인시'];

// 코드 → 이름 (location 생성용)
const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_CODES).map(([name, code]) => [code, name])
);
export async function fetchMolitData(region: string = '서울'): Promise<EstateData[]> {
  try {
    // 서울 요청 시 모든 구 데이터 수집
    let lawdCodes: string[];
    if (region === '서울') {
      lawdCodes = Object.values(SEOUL_GU_CODES);
    } else if (region === '경기도' || region === '경기') {
      lawdCodes = GYEONGGI_DEFAULT.map(n => REGION_CODES[n]);
    } else if (REGION_CODES[region]) {
      lawdCodes = [REGION_CODES[region]];
    } else {
      throw new Error(`Unknown region: ${region}`);
    }

    const serviceKey = config.MOLIT_SERVICE_KEY;
    const allData: EstateData[] = [];
    const now = new Date();

    // 각 지역코드별로 순차 요청
    for (const lawdCd of lawdCodes) {
      const responses = [];

      // 병렬 요청 (2개씩 동시)
      for (let i = 0; i < 12; i += 2) {
        const requests = [];

        // 2개 요청 준비
        for (let j = i; j < Math.min(i + 2, 12); j++) {
          const date = new Date(now.getFullYear(), now.getMonth() - j, 1);
          const dealYmd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

          const url = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
          const params = {
            serviceKey,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd,
            pageNo: 1,
            numOfRows: 100,
          };

          requests.push(
            axios.get(url, {
              params,
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              }
            }).catch(err => {
              console.error(`[MOLIT API Error] LAWD_CD=${lawdCd}, DEAL_YMD=${dealYmd}:`, err instanceof Error ? err.message : String(err));
              return null;
            })
          );
        }

        // 2개 동시 실행
        responses.push(...await Promise.all(requests));

        // 다음 배치 전에 100ms 지연 (레이트 제한 피하기)
        if (i + 2 < 12) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      let districtItemCount = 0;

      for (const response of responses) {
        if (!response || !response.data) continue;

        let items: any[] = [];
        try {
          const parsed = await parseStringPromise(response.data);
          items = parsed?.response?.body?.[0]?.items?.[0]?.item || [];
        } catch (err) {
          console.error(`[MOLIT API] XML parse error (LAWD_CD=${lawdCd}):`, err instanceof Error ? err.message : String(err));
          continue;
        }

        for (const item of items) {
          // MOLIT API 필드명 (쉼표 제거, 분리된 날짜 처리)
          const dealAmountStr = item.dealAmount?.[0] || '0';
          const dealAmount = parseInt(dealAmountStr.replace(/,/g, ''));

          const area = parseFloat(item.excluUseAr?.[0] || '0');

          // 지역명(구/시) + 법정동. (estateAgentSggNm은 중개사 소재지라 사용하지 않음)
          const umdNm = (item.umdNm?.[0] || '').trim();
          const address = [CODE_TO_NAME[lawdCd] || '', umdNm].filter(Boolean).join(' ');

          // 날짜는 분리되어 있음: dealYear, dealMonth, dealDay
          const dealYear = item.dealYear?.[0] || '';
          const dealMonth = item.dealMonth?.[0] || '';
          const dealDay = item.dealDay?.[0] || '';
          const dateStr = dealYear && dealMonth && dealDay
            ? `${dealYear}${String(dealMonth).padStart(2, '0')}${String(dealDay).padStart(2, '0')}`
            : '';

          if (dealAmount && dateStr) {
            allData.push({
              date: formatDate(dateStr),
              price: dealAmount, // 만원 단위
              area,
              location: address,
              region,
              dealType: 'apts',
            });
            districtItemCount++;
          }
        }
      }
      console.log(`[MOLIT API] ${lawdCd}: ${districtItemCount} items`);
    }

    allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allData.length > 0) {
      console.log(`[MOLIT API] Collected ${allData.length} real records for region: "${region}"`);
      const saved = await saveEstateRecords(allData);
      console.log(`[MOLIT API] Saved ${saved} records to database`);
      return allData;
    } else {
      console.log(`[MOLIT API] No real data collected for region: "${region}", using mock data`);
      const mockData = getMockData(region);
      await saveEstateRecords(mockData);
      return mockData;
    }
  } catch (error) {
    console.error('[MOLIT API] Fatal error:', error);
    const mockData = getMockData(region);
    await saveEstateRecords(mockData);
    return mockData;
  }
}

function formatDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function getMockData(region: string = '서울'): EstateData[] {
  // 서울 데이터 (모든 주요 구 포함)
  const seoulData = [
    // 강남구
    { date: '2024-01-28', price: 850000, area: 84.95, location: '서울시 강남구', dealType: 'apts' },
    { date: '2024-01-25', price: 820000, area: 59.80, location: '서울시 강남구', dealType: 'apts' },
    { date: '2024-01-22', price: 780000, area: 84.95, location: '서울시 강남구', dealType: 'apts' },
    // 서초구
    { date: '2024-01-18', price: 810000, area: 101.50, location: '서울시 서초구', dealType: 'apts' },
    { date: '2024-01-15', price: 800000, area: 84.95, location: '서울시 서초구', dealType: 'apts' },
    { date: '2024-01-10', price: 750000, area: 59.80, location: '서울시 서초구', dealType: 'apts' },
    // 강서구
    { date: '2024-01-08', price: 720000, area: 74.50, location: '서울시 강서구', dealType: 'apts' },
    { date: '2024-01-05', price: 710000, area: 68.30, location: '서울시 강서구', dealType: 'apts' },
    { date: '2023-12-28', price: 740000, area: 80.00, location: '서울시 강서구', dealType: 'apts' },
    // 마포구
    { date: '2023-12-25', price: 680000, area: 72.50, location: '서울시 마포구', dealType: 'apts' },
    { date: '2023-12-20', price: 690000, area: 75.00, location: '서울시 마포구', dealType: 'apts' },
    { date: '2023-12-15', price: 670000, area: 70.00, location: '서울시 마포구', dealType: 'apts' },
    // 용산구
    { date: '2023-12-10', price: 760000, area: 85.00, location: '서울시 용산구', dealType: 'apts' },
    { date: '2023-12-05', price: 750000, area: 82.00, location: '서울시 용산구', dealType: 'apts' },
    { date: '2023-11-30', price: 770000, area: 88.00, location: '서울시 용산구', dealType: 'apts' },
  ];

  // 경기도 데이터 (성남시, 수원시)
  const gyeonggiData = [
    { date: '2024-01-28', price: 620000, area: 84.95, location: '경기도 성남시 분당구', dealType: 'apts' },
    { date: '2024-01-25', price: 598000, area: 59.80, location: '경기도 수원시 영통구', dealType: 'apts' },
    { date: '2024-01-22', price: 580000, area: 84.95, location: '경기도 성남시 분당구', dealType: 'apts' },
    { date: '2024-01-18', price: 610000, area: 101.50, location: '경기도 수원시 영통구', dealType: 'apts' },
    { date: '2024-01-15', price: 600000, area: 84.95, location: '경기도 성남시 분당구', dealType: 'apts' },
    { date: '2024-01-10', price: 570000, area: 59.80, location: '경기도 수원시 영통구', dealType: 'apts' },
    { date: '2024-01-08', price: 590000, area: 84.95, location: '경기도 성남시 분당구', dealType: 'apts' },
    { date: '2024-01-05', price: 620000, area: 101.50, location: '경기도 수원시 영통구', dealType: 'apts' },
    { date: '2023-12-28', price: 610000, area: 84.95, location: '경기도 성남시 분당구', dealType: 'apts' },
    { date: '2023-12-25', price: 595000, area: 59.80, location: '경기도 수원시 영통구', dealType: 'apts' },
  ];

  // 요청 지역에 따라 데이터 선택
  // 경기도 지역: 경기도, 경기, 성남, 수원, 고양, 용인, 안산, 안양, 부천, 평택, 화성
  const isGyeonggi = region.includes('경기') ||
                     region.includes('성남') ||
                     region.includes('수원') ||
                     region.includes('고양') ||
                     region.includes('용인') ||
                     region.includes('안산') ||
                     region.includes('안양') ||
                     region.includes('부천') ||
                     region.includes('평택') ||
                     region.includes('화성') ||
                     region.includes('김포') ||
                     region.includes('광명') ||
                     region.includes('하남') ||
                     region.includes('오산') ||
                     region.includes('의정부') ||
                     region.includes('남양주');
  const baseData = isGyeonggi ? gyeonggiData : seoulData;

  // location에서 지역/도시 이름 추출
  const data: EstateData[] = baseData.map(item => ({
    ...item,
    region: item.location.split(' ')[1] || region, // '경기도 성남시 분당구' → '성남시'
  }));

  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
