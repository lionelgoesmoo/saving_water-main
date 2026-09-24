/**
 * unitConversion.ts
 *
 * Dual-display unit utilities for imperial & metric formats across Africa.
 * - Area: sqft & m²
 * - Rainfall: in/yr & mm/yr
 * - Volume: m³ & gal (metric prioritized for Kenya/East Africa)
 * - Tariffs: KSh/m³ & $/kgal (Kenyan Shilling prioritized)
 */

export function sqftToM2(sqft: number): number {
  return sqft * 0.092903;
}

export function inToMm(inches: number): number {
  return inches * 25.4;
}

export function galToM3(gal: number): number {
  return gal * 0.00378541;
}

export function waterRatePerKgalToM3(ratePerKgal: number): number {
  // 1 kgal (1000 gal) = 3.78541 m³
  // Cost per m³ = Cost per kgal / 3.78541
  return ratePerKgal / 3.78541;
}

export function usdToKSh(usd: number): number {
  // Approximate conversion rate: 1 USD = 130 KSh (Kenyan Shilling)
  return usd * 130;
}

/**
 * Format roof area with dual metric & imperial display (metric prioritized for Kenya)
 * e.g. "13,935 m² (150,000 sqft)" or "13.9K m² (150K sqft)"
 */
export function formatArea(sqft: number | null | undefined, compact = false): string {
  if (sqft == null || isNaN(sqft)) return "—";
  const m2 = sqftToM2(sqft);
  if (compact) {
    const kSqft = (sqft / 1000).toFixed(0);
    const kM2 = (m2 / 1000).toFixed(1);
    return `${kM2}K m² (${kSqft}K sqft)`;
  }
  return `${Math.round(m2).toLocaleString()} m² (${Math.round(sqft).toLocaleString()} sqft)`;
}

/**
 * Format annual rainfall with dual mm/yr and in/yr (metric prioritized for Kenya/East Africa)
 * e.g. "970 mm/yr (38.2 in/yr)"
 */
export function formatRainfall(inches: number | null | undefined): string {
  if (inches == null || isNaN(inches)) return "—";
  const mm = Math.round(inToMm(inches));
  return `${mm} mm/yr (${inches.toFixed(1)} in/yr)`;
}

/**
 * Format water volume in m³ and gal (metric prioritized for Kenya/East Africa)
 * e.g. "10,788 m³ (2,850,000 gal)" or "10.8K m³ (2.85M gal)"
 */
export function formatVolume(gal: number | null | undefined, compact = false): string {
  if (gal == null || isNaN(gal)) return "—";
  const m3 = Math.round(galToM3(gal));
  if (compact) {
    if (m3 >= 1_000) {
      return `${(m3 / 1_000).toFixed(1)}K m³ (${(gal / 1_000_000).toFixed(2)}M gal)`;
    }
    return `${m3.toLocaleString()} m³ (${Math.round(gal / 1_000)}K gal)`;
  }
  return `${m3.toLocaleString()} m³ (${Math.round(gal).toLocaleString()} gal)`;
}

/**
 * Format commercial water rate in KSh/m³ and $/kgal (Kenyan Shilling prioritized)
 * e.g. "KSh 360/m³ ($10.50/kgal)"
 */
export function formatWaterRate(ratePerKgal: number | null | undefined): string {
  if (ratePerKgal == null || isNaN(ratePerKgal)) return "—";
  const rateM3 = waterRatePerKgalToM3(ratePerKgal);
  const rateKShM3 = usdToKSh(rateM3);
  return `KSh ${rateKShM3.toFixed(0)}/m³ ($${ratePerKgal.toFixed(2)}/kgal)`;
}

/**
 * Format currency in Kenyan Shillings (primary) and USD (secondary)
 * e.g. "KSh 1.3M ($10K)" or "KSh 650K ($5K)"
 */
export function formatCurrencyKSh(usd: number | null | undefined): string {
  if (usd == null || isNaN(usd)) return "—";
  const ksh = usdToKSh(usd);
  if (ksh >= 1_000_000) return `KSh ${(ksh / 1_000_000).toFixed(1)}M ($${(usd / 1_000).toFixed(0)}K)`;
  if (ksh >= 1_000) return `KSh ${Math.round(ksh / 1_000)}K ($${Math.round(usd / 1_000)}K)`;
  return `KSh ${Math.round(ksh)} ($${Math.round(usd)})`;
}
