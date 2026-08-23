/**
 * Rate Calculation Engine
 * Pure function — zero framework dependencies — fully unit-testable.
 *
 * Formula:
 *   volumetricWeight = (L × B × H) / 5000
 *   billableWeight   = max(actualWeight, volumetricWeight)
 *   zoneRelation     = pickupZoneId === dropZoneId ? 'intra' : 'inter'
 *   baseCharge       = rateCard.base_price + (billableWeight × rateCard.rate_per_kg)
 *   codSurcharge     = paymentType === 'COD' ? codConfig.surcharge_amount : 0
 *   total            = baseCharge + codSurcharge
 */

/**
 * @param {object} params
 * @param {number} params.pickupZoneId
 * @param {number} params.dropZoneId
 * @param {number} params.L             - length in cm
 * @param {number} params.B             - breadth in cm
 * @param {number} params.H             - height in cm
 * @param {number} params.actualWeight  - in kg
 * @param {'B2B'|'B2C'} params.orderType
 * @param {'Prepaid'|'COD'} params.paymentType
 * @param {Array<{order_type, zone_relation, rate_per_kg, base_price}>} params.rateCards
 * @param {Array<{order_type, surcharge_amount}>} params.codSurcharges
 *
 * @returns {{
 *   volumetricWeight: number,
 *   billableWeight: number,
 *   zoneRelation: 'intra'|'inter',
 *   ratePerKg: number,
 *   basePrice: number,
 *   baseCharge: number,
 *   codSurcharge: number,
 *   total: number
 * }}
 */
function calculateCharge({
  pickupZoneId,
  dropZoneId,
  L, B, H,
  actualWeight,
  orderType,
  paymentType,
  rateCards,
  codSurcharges,
}) {
  if (!pickupZoneId || !dropZoneId) {
    throw new Error('Could not determine zones from the provided pincodes. Please check the addresses.');
  }

  // 1. Volumetric weight (DIM factor = 5000 for cm/kg)
  const volumetricWeight = parseFloat(((L * B * H) / 5000).toFixed(4));

  // 2. Billable weight
  const billableWeight = parseFloat(Math.max(actualWeight, volumetricWeight).toFixed(4));

  // 3. Zone relation
  const zoneRelation = pickupZoneId === dropZoneId ? 'intra' : 'inter';

  // 4. Find matching rate card
  const rateCard = rateCards.find(
    (rc) => rc.order_type === orderType && rc.zone_relation === zoneRelation
  );
  if (!rateCard) {
    throw new Error(`No rate card found for order_type=${orderType} zone_relation=${zoneRelation}`);
  }

  const ratePerKg = parseFloat(rateCard.rate_per_kg);
  const basePrice  = parseFloat(rateCard.base_price);

  // 5. Base charge
  const baseCharge = parseFloat((basePrice + billableWeight * ratePerKg).toFixed(2));

  // 6. COD surcharge
  let codSurcharge = 0;
  if (paymentType === 'COD') {
    const codConfig = codSurcharges.find((c) => c.order_type === orderType);
    if (codConfig) {
      codSurcharge = parseFloat(codConfig.surcharge_amount);
    }
  }

  // 7. Total
  const total = parseFloat((baseCharge + codSurcharge).toFixed(2));

  return {
    volumetricWeight,
    billableWeight,
    zoneRelation,
    ratePerKg,
    basePrice,
    baseCharge,
    codSurcharge,
    total,
  };
}

module.exports = { calculateCharge };
