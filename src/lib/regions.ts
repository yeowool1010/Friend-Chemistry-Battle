import { DISTRICTS } from "@/lib/catalog";
import regions from "@/data/regions.json";

export type RegionDong = {
  name: string;
  code: string;
};

export type RegionGu = {
  name: string;
  code: string;
  dongs: RegionDong[];
};

export type RegionSi = {
  name: string;
  gus: RegionGu[];
};

/** 행정동 목록. 광주와 전북 코드는 주민등록 인구 API가 받는 코드다. */
export const REGIONS = regions as RegionSi[];

export function planningDistrictId(signguCd: string): string | null {
  return DISTRICTS.find((district) => district.signguCds.includes(signguCd))?.id ?? null;
}

export function dongsInSigngu(signguCds: string[]): string[] {
  const wanted = new Set(signguCds);
  const names = new Set<string>();
  for (const si of REGIONS) {
    for (const gu of si.gus) {
      if (!wanted.has(gu.code)) continue;
      for (const dong of gu.dongs) names.add(dong.name);
    }
  }
  return [...names];
}
