/**
 * Pricing and Discount Calculation Engine for Host Market Place
 *
 * Rules:
 * - Face Value = Original / Denomination value
 * - Selling Price = Actual amount customer pays
 * - Discount % = ((Face Value - Selling Price) / Face Value) * 100
 * - Edge Cases:
 *   - Face Value <= Selling Price => 0% discount (no discount)
 *   - Face Value <= 0 or missing => 0% discount (prevent divide by zero)
 *   - Selling Price <= 0 or missing => 0% discount
 */

export interface DiscountCalculation {
  discountPercent: number;
  savings: number;
  hasDiscount: boolean;
  faceValue: number;
  sellingPrice: number;
}

export function calculateDiscount(
  faceValue?: number | string | null,
  sellingPrice?: number | string | null
): DiscountCalculation {
  const fv = Number(faceValue || 0);
  const sp = Number(sellingPrice || 0);

  if (fv > 0 && sp > 0 && fv > sp) {
    const rawSavings = fv - sp;
    const savings = Math.max(0, Number(rawSavings.toFixed(2)));
    const discountPercent = Math.round(((fv - sp) / fv) * 100);

    return {
      discountPercent: discountPercent > 0 ? discountPercent : 0,
      savings,
      hasDiscount: discountPercent > 0,
      faceValue: fv,
      sellingPrice: sp,
    };
  }

  return {
    discountPercent: 0,
    savings: 0,
    hasDiscount: false,
    faceValue: fv > 0 ? fv : 0,
    sellingPrice: sp > 0 ? sp : 0,
  };
}
