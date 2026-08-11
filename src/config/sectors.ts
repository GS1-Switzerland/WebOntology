/**
 * Fallback snapshot of the GS1 Sector code list.
 *
 * This is NOT the source of truth. The app fetches the current sector
 * codelist at runtime from the definitions repo (see loadSectors() in
 * src/lib/registryClient.ts and SECTORS_PATH in src/config/env.ts), so
 * adding, renaming, or reordering a sector never requires a code change
 * or redeploy of this SPA — only a new/updated
 * registry/sectors.jsonld in the WebOntology repo.
 *
 * This array only exists as a resilience fallback: if that fetch fails
 * (network hiccup, momentary GitHub Pages outage, misconfigured
 * SECTORS_PATH), the app falls back to this bundled snapshot rather than
 * showing a broken home page. Keep it roughly in sync, but it does not
 * need to be perfectly current — it's a safety net, not a feature.
 */
export interface Gs1Sector {
  codeList: "Gs1Sector";
  codeValue: string;
  codeName: string;
  order: number;
}

export const FALLBACK_GS1_SECTORS: Gs1Sector[] = [
  { codeList: "Gs1Sector", codeValue: "AGRI", codeName: "Section A – Agriculture, forestry and fishing", order: 0 },
  { codeList: "Gs1Sector", codeValue: "MINE", codeName: "Section B – Mining and quarrying", order: 1 },
  { codeList: "Gs1Sector", codeValue: "MANU", codeName: "Section C – Manufacturing", order: 2 },
  { codeList: "Gs1Sector", codeValue: "ELEC", codeName: "Section D – Electricity, gas, steam and air conditioning supply", order: 3 },
  { codeList: "Gs1Sector", codeValue: "WATR", codeName: "Section E – Water supply; sewerage, waste management and remediation activities", order: 4 },
  { codeList: "Gs1Sector", codeValue: "CONS", codeName: "Section F – Construction", order: 5 },
  { codeList: "Gs1Sector", codeValue: "TRAD", codeName: "Section G – Wholesale and retail trade; repair and selling of motor vehicles and motorcycles", order: 6 },
  { codeList: "Gs1Sector", codeValue: "TRAN", codeName: "Section H – Transportation and storage", order: 7 },
  { codeList: "Gs1Sector", codeValue: "ACCO", codeName: "Section I – Accommodation and food service activities", order: 8 },
  { codeList: "Gs1Sector", codeValue: "INFO", codeName: "Section J – Information and communication", order: 9 },
  { codeList: "Gs1Sector", codeValue: "FINA", codeName: "Section K – Financial and insurance activities", order: 10 },
  { codeList: "Gs1Sector", codeValue: "REAL", codeName: "Section L – Real estate activities", order: 11 },
  { codeList: "Gs1Sector", codeValue: "PROF", codeName: "Section M – Professional, scientific and technical activities", order: 12 },
  { codeList: "Gs1Sector", codeValue: "ADMI", codeName: "Section N – Administrative and support service activities", order: 13 },
  { codeList: "Gs1Sector", codeValue: "PUBL", codeName: "Section O – Public administration and defence; compulsory social security", order: 14 },
  { codeList: "Gs1Sector", codeValue: "EDUC", codeName: "Section P – Education", order: 15 },
  { codeList: "Gs1Sector", codeValue: "HEAL", codeName: "Section Q – Human health and social work activities", order: 16 },
  { codeList: "Gs1Sector", codeValue: "ARTS", codeName: "Section R – Arts, entertainment and recreation", order: 17 },
  { codeList: "Gs1Sector", codeValue: "SERV", codeName: "Section S – Other service activities", order: 18 },
  { codeList: "Gs1Sector", codeValue: "HOUS", codeName: "Section T – Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use", order: 19 },
  { codeList: "Gs1Sector", codeValue: "EXTR", codeName: "Section U – Activities of extraterritorial organizations and bodies", order: 20 },
];

/** Looks up a sector by code in any loaded list (fallback or fetched). */
export const sectorByCode = (sectors: Gs1Sector[], code: string): Gs1Sector | undefined =>
  sectors.find((s) => s.codeValue.toLowerCase() === code.toLowerCase());
