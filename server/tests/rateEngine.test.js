/**
 * Rate Engine Unit Tests
 * No test runner required — plain Node.js
 * Run: node tests/rateEngine.test.js
 */
const { calculateCharge } = require('../services/rateEngine');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// Sample rate cards and COD surcharges (mirrors seed data)
const rateCards = [
  { order_type: 'B2C', zone_relation: 'intra', rate_per_kg: '30.00', base_price: '50.00' },
  { order_type: 'B2C', zone_relation: 'inter', rate_per_kg: '50.00', base_price: '80.00' },
  { order_type: 'B2B', zone_relation: 'intra', rate_per_kg: '20.00', base_price: '100.00' },
  { order_type: 'B2B', zone_relation: 'inter', rate_per_kg: '35.00', base_price: '150.00' },
];

const codSurcharges = [
  { order_type: 'B2C', surcharge_amount: '25.00' },
  { order_type: 'B2B', surcharge_amount: '50.00' },
];

// ---------------------------------------------------------------
console.log('\n─── Test 1: Intra-zone B2C Prepaid ───');
// same zone, actual = volumetric (L=50, B=20, H=5 → 5000/5000 = 1kg; actual=2kg → billable=2)
{
  const result = calculateCharge({
    pickupZoneId: 1, dropZoneId: 1,
    L: 100, B: 10, H: 10, actualWeight: 2,
    orderType: 'B2C', paymentType: 'Prepaid',
    rateCards, codSurcharges,
  });
  // volumetric = (100*10*10)/5000 = 10000/5000 = 2kg  → billable = max(2,2) = 2
  assert(result.zoneRelation === 'intra', 'zoneRelation = intra');
  assert(result.volumetricWeight === 2, `volumetricWeight = 2 (got ${result.volumetricWeight})`);
  assert(result.billableWeight === 2, `billableWeight = max(2,2) = 2 (got ${result.billableWeight})`);
  assert(result.ratePerKg === 30, `ratePerKg = 30 (got ${result.ratePerKg})`);
  assert(result.baseCharge === 110, `baseCharge = 50 + 2*30 = 110 (got ${result.baseCharge})`);
  assert(result.codSurcharge === 0, `codSurcharge = 0 (Prepaid) (got ${result.codSurcharge})`);
  assert(result.total === 110, `total = 110 (got ${result.total})`);
}

// ---------------------------------------------------------------
console.log('\n─── Test 2: Inter-zone B2B COD ───');
// different zones, actual > volumetric
{
  const result = calculateCharge({
    pickupZoneId: 1, dropZoneId: 2,
    L: 20, B: 15, H: 10, actualWeight: 5,
    orderType: 'B2B', paymentType: 'COD',
    rateCards, codSurcharges,
  });
  // volumetric = (20*15*10)/5000 = 600/5000 = 0.6kg  → billable = max(5, 0.6) = 5
  assert(result.zoneRelation === 'inter', 'zoneRelation = inter');
  assert(result.volumetricWeight === 0.6, `volumetricWeight = 0.6 (got ${result.volumetricWeight})`);
  assert(result.billableWeight === 5, `billableWeight = 5 (actual wins) (got ${result.billableWeight})`);
  assert(result.ratePerKg === 35, `ratePerKg = 35 (got ${result.ratePerKg})`);
  // baseCharge = 150 + 5*35 = 325
  assert(result.baseCharge === 325, `baseCharge = 325 (got ${result.baseCharge})`);
  assert(result.codSurcharge === 50, `codSurcharge = 50 (B2B COD) (got ${result.codSurcharge})`);
  assert(result.total === 375, `total = 375 (got ${result.total})`);
}

// ---------------------------------------------------------------
console.log('\n─── Test 3: Volumetric weight > actual weight ───');
{
  const result = calculateCharge({
    pickupZoneId: 1, dropZoneId: 1,
    L: 50, B: 50, H: 50, actualWeight: 1,
    orderType: 'B2C', paymentType: 'Prepaid',
    rateCards, codSurcharges,
  });
  // volumetric = (50*50*50)/5000 = 125000/5000 = 25kg → billable = max(1, 25) = 25
  assert(result.volumetricWeight === 25, `volumetricWeight = 25 (got ${result.volumetricWeight})`);
  assert(result.billableWeight === 25, `billableWeight = 25 (volumetric wins) (got ${result.billableWeight})`);
  // baseCharge = 50 + 25*30 = 800
  assert(result.baseCharge === 800, `baseCharge = 800 (got ${result.baseCharge})`);
  assert(result.total === 800, `total = 800 (got ${result.total})`);
}

// ---------------------------------------------------------------
console.log('\n─── Test 4: Intra-zone B2C COD ───');
{
  const result = calculateCharge({
    pickupZoneId: 3, dropZoneId: 3,
    L: 30, B: 20, H: 10, actualWeight: 3,
    orderType: 'B2C', paymentType: 'COD',
    rateCards, codSurcharges,
  });
  // volumetric = (30*20*10)/5000 = 1.2  → billable = max(3, 1.2) = 3
  assert(result.zoneRelation === 'intra', 'zoneRelation = intra');
  assert(result.volumetricWeight === 1.2, `volumetricWeight = 1.2 (got ${result.volumetricWeight})`);
  assert(result.billableWeight === 3, `billableWeight = 3 (actual wins) (got ${result.billableWeight})`);
  // baseCharge = 50 + 3*30 = 140
  assert(result.baseCharge === 140, `baseCharge = 140 (got ${result.baseCharge})`);
  assert(result.codSurcharge === 25, `codSurcharge = 25 (B2C COD) (got ${result.codSurcharge})`);
  assert(result.total === 165, `total = 165 (got ${result.total})`);
}

// ---------------------------------------------------------------
console.log('\n─── Test 5: Missing zone → throws ───');
{
  try {
    calculateCharge({
      pickupZoneId: null, dropZoneId: 1,
      L: 10, B: 10, H: 10, actualWeight: 1,
      orderType: 'B2C', paymentType: 'Prepaid',
      rateCards, codSurcharges,
    });
    assert(false, 'Should have thrown for missing zone');
  } catch (e) {
    assert(e.message.includes('zone'), `Throws with zone error message: "${e.message}"`);
  }
}

// ---------------------------------------------------------------
console.log('\n─────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
