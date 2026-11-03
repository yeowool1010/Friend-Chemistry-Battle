import { PROFILES, type IndustryGroup, type IndustryProfile } from "@/lib/catalog";
import tree from "@/data/industries.json";

export type Industry = {
  id: string;
  label: string;
  largeCode: string;
  largeName: string;
  group: IndustryGroup | null;
  indsLclsCd: string;
  indsMclsCd: string;
  profile: IndustryProfile | null;
};

type RawGroup = {
  code: string;
  name: string;
  middle: { code: string; name: string }[];
};

const GROUP: Record<string, IndustryGroup> = {
  I2: "food",
  S2: "service",
  G2: "retail",
};

export const INDUSTRY_GROUPS = (tree as RawGroup[]).map((group) => ({
  code: group.code,
  name: group.name,
  industries: group.middle.map((item) => ({
    id: item.code,
    label: item.name,
    largeCode: group.code,
    largeName: group.name,
    group: GROUP[group.code] ?? null,
    indsLclsCd: group.code,
    indsMclsCd: item.code,
    profile: PROFILES[item.code] ?? null,
  })),
}));

export const INDUSTRIES: Industry[] = INDUSTRY_GROUPS.flatMap((group) => group.industries);

export function industryById(id: string): Industry {
  return INDUSTRIES.find((item) => item.id === id) ?? INDUSTRIES.find((item) => item.id === "I201") ?? INDUSTRIES[0];
}
