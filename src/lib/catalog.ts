export type Traffic = "high" | "mid" | "low";
export type IndustryGroup = "food" | "service" | "retail";

/** 중분류 가운데 계획 문안이 있는 업종만 둔다. 없는 업종은 숫자를 만들지 않는다. */
export type IndustryProfile = {
  sales: { low: number; mid: number; high: number };
  labor: number;
  variableRatio: number;
  permits: string[];
  leaseChecks: string[];
  equipment: string[];
  interior: { construction: number; sign: number; kitchen: number; hall: number; reserve: number };
  peak: string;
  season: string;
  weeks: { permit: number; build: number; ready: number };
};

export type District = {
  id: string;
  sido: string;
  name: string;
  lat: number;
  lon: number;
  /** 상가정보 API 시군구코드. 일산은 동구·서구를 함께 센다. */
  signguCds: string[];
  rentPerPyeong: number;
  traffic: Traffic;
  foodSaturation: number;
  serviceSaturation: number;
};

export const PROFILES: Record<string, IndustryProfile> = {
  I201: {
    sales: { low: 1500, mid: 2500, high: 4000 },
    labor: 450,
    variableRatio: 0.45,
    permits: ["일반음식점 영업신고", "보건증", "소방안전 확인", "간판 관련 허가"],
    leaseChecks: ["급배수와 도시가스 용량", "주방 배기 덕트 가능 여부", "권리금과 시설물 목록", "계약 기간과 중도 해지", "관리비에 포함된 항목"],
    equipment: ["냉장·냉동고", "작업대", "가스레인지", "테이블", "포스", "간판"],
    interior: { construction: 40, sign: 8, kitchen: 32, hall: 15, reserve: 5 },
    peak: "저녁과 주말 점심",
    season: "명절 전후와 연말 모임",
    weeks: { permit: 2, build: 5, ready: 2 },
  },
  I212: {
    sales: { low: 900, mid: 1600, high: 2800 },
    labor: 300,
    variableRatio: 0.35,
    permits: ["휴게음식점 영업신고", "보건증", "소방안전 확인", "간판 관련 허가"],
    leaseChecks: ["전기 용량", "급배수", "테라스 사용 가능 여부", "권리금과 시설물 목록", "관리비에 포함된 항목"],
    equipment: ["에스프레소 머신", "냉장고", "제빙기", "테이블", "포스", "간판"],
    interior: { construction: 30, sign: 10, kitchen: 25, hall: 30, reserve: 5 },
    peak: "오후와 주말",
    season: "봄·가을. 학교 근처는 학기 중",
    weeks: { permit: 2, build: 4, ready: 2 },
  },
  S207: {
    sales: { low: 800, mid: 1400, high: 2200 },
    labor: 350,
    variableRatio: 0.25,
    permits: ["미용업 신고", "보건증", "소독·위생 장비", "간판 관련 허가"],
    leaseChecks: ["샴푸 급배수", "전기 용량", "층수와 간판 노출", "권리금과 시설물 목록", "관리비에 포함된 항목"],
    equipment: ["미용 의자", "경대", "샴푸대", "소독기", "포스", "간판"],
    interior: { construction: 30, sign: 10, kitchen: 5, hall: 45, reserve: 10 },
    peak: "주말과 퇴근 이후",
    season: "졸업·입학과 명절 전",
    weeks: { permit: 2, build: 4, ready: 1 },
  },
};

export const DISTRICTS: District[] = [
  { id: "gangnam", sido: "서울", name: "강남구", lat: 37.4979, lon: 127.0276, signguCds: ["11680"], rentPerPyeong: 20, traffic: "high", foodSaturation: 82, serviceSaturation: 70 },
  { id: "mapo", sido: "서울", name: "마포구", lat: 37.5563, lon: 126.9236, signguCds: ["11440"], rentPerPyeong: 14, traffic: "high", foodSaturation: 86, serviceSaturation: 68 },
  { id: "seongdong", sido: "서울", name: "성동구", lat: 37.5634, lon: 127.0368, signguCds: ["11200"], rentPerPyeong: 12, traffic: "mid", foodSaturation: 60, serviceSaturation: 55 },
  { id: "gwanak", sido: "서울", name: "관악구", lat: 37.4784, lon: 126.9516, signguCds: ["11620"], rentPerPyeong: 8, traffic: "mid", foodSaturation: 58, serviceSaturation: 62 },
  { id: "suwon", sido: "경기", name: "수원시 팔달구", lat: 37.2826, lon: 127.0156, signguCds: ["41115"], rentPerPyeong: 8, traffic: "mid", foodSaturation: 52, serviceSaturation: 48 },
  { id: "ilsan", sido: "경기", name: "고양시 일산", lat: 37.6584, lon: 126.7694, signguCds: ["41285", "41287"], rentPerPyeong: 7, traffic: "mid", foodSaturation: 42, serviceSaturation: 50 },
  { id: "seomyeon", sido: "부산", name: "부산진구", lat: 35.1579, lon: 129.0594, signguCds: ["26230"], rentPerPyeong: 10, traffic: "high", foodSaturation: 76, serviceSaturation: 64 },
  { id: "haeundae", sido: "부산", name: "해운대구", lat: 35.1631, lon: 129.1636, signguCds: ["26350"], rentPerPyeong: 13, traffic: "high", foodSaturation: 70, serviceSaturation: 60 },
  { id: "daegu", sido: "대구", name: "중구", lat: 35.8694, lon: 128.606, signguCds: ["27110"], rentPerPyeong: 7, traffic: "mid", foodSaturation: 55, serviceSaturation: 50 },
  { id: "namdong", sido: "인천", name: "남동구", lat: 37.447, lon: 126.7314, signguCds: ["28200"], rentPerPyeong: 6, traffic: "mid", foodSaturation: 45, serviceSaturation: 42 },
  { id: "daejeon", sido: "대전", name: "서구", lat: 36.3554, lon: 127.3838, signguCds: ["30170"], rentPerPyeong: 6, traffic: "mid", foodSaturation: 40, serviceSaturation: 44 },
  { id: "gwangju", sido: "광주", name: "동구", lat: 35.1461, lon: 126.923, signguCds: ["12210"], rentPerPyeong: 6, traffic: "mid", foodSaturation: 46, serviceSaturation: 44 },
];

export const PLANNING_NOTE =
  "월세와 매출 구간은 계획용 기준입니다. 빈 상가의 실제 시세나 카드 매출이 아닙니다.";

export const DEPOSIT_MONTHS = 10;
export const RUNWAY_MONTHS = 3;
export const INTERIOR_RATIO = 0.35;
