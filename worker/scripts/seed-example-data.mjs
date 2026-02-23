#!/usr/bin/env node
/**
 * Seed the Worker D1 API with lots of example listing data.
 * Usage: API_URL=https://web-scrap-api.hessi3700.workers.dev node worker/scripts/seed-example-data.mjs
 */
const API_URL = (process.env.API_URL || "https://web-scrap-api.hessi3700.workers.dev").replace(/\/+$/, "");
const INGEST = `${API_URL}/api/ingest`;

const AREAS = ["Downtown", "Riverside", "Midtown", "West End", "Harbor View", "Park District", "Northside"];
const STREETS = ["Main St", "Oak Ave", "Park Rd", "River Dr", "Lake Blvd", "Cedar Ln", "Maple St", "Elm St", "Pine Ave", "Hill Rd"];
const TITLES = ["Cozy Apartment", "Family Home", "Modern Loft", "Garden View", "City View", "Quiet Street", "Renovated", "Spacious", "Charming", "Bright"];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate one day of listings with slight price drift for trends. */
function generateDay(recordedAt, basePricesByArea = {}) {
  const listings = [];
  const numListings = randomInt(12, 22);
  for (let i = 0; i < numListings; i++) {
    const area = randomChoice(AREAS);
    const base = basePricesByArea[area] ?? 280000 + Math.random() * 200000;
    const drift = (Math.random() - 0.5) * 0.08 * base;
    const price = Math.round(base + drift);
    const sourceId = `seed-${recordedAt}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    listings.push({
      source_id: sourceId,
      source: "seed-example",
      title: `${randomChoice(TITLES)} in ${area}`,
      address: `${randomInt(1, 999)} ${randomChoice(STREETS)}`,
      area,
      url: `https://example.com/listings/${sourceId}`,
      price: Math.max(150000, price),
    });
  }
  return listings;
}

/** Build base prices per area that drift over time for trend charts. */
function buildBasePricesForDay(daysAgo) {
  const t = daysAgo / 60;
  const bases = {};
  AREAS.forEach((area, i) => {
    const base = 250000 + i * 35000 + Math.sin(t * 2) * 20000;
    bases[area] = base;
  });
  return bases;
}

async function main() {
  console.log("Seeding example data to", INGEST);
  const today = new Date();
  let totalInserted = 0;
  const daysToSeed = 60;

  for (let d = 0; d < daysToSeed; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const recordedAt = date.toISOString().slice(0, 10);
    const basePrices = buildBasePricesForDay(d);
    const listings = generateDay(recordedAt, basePrices);

    const res = await fetch(INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recorded_at: recordedAt, listings }),
    });
    if (!res.ok) {
      console.error("Failed for", recordedAt, res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json();
    totalInserted += data.inserted ?? listings.length;
    if ((d + 1) % 10 === 0) console.log("  ", d + 1, "days,", totalInserted, "listings");
  }

  console.log("Done. Total listings inserted:", totalInserted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
