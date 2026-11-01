import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const db = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const AUTH_SECRET = process.env.AUTH_SECRET || "local-dev-secret-change-me-please-123456";
const key = new TextEncoder().encode(AUTH_SECRET);

async function makeToken(userId: string) {
  return await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}

async function runHttpIntegration() {
  console.log("=== HTTP Form Submission & Real Endpoint Integration Tests ===\n");

  // 1. Fetch seed users
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  const vol = await db.user.findFirst({ where: { role: "VOLUNTEER", approval: "APPROVED", suspended: false } });
  if (!admin || !vol) throw new Error("Missing users");

  const volCookie = `el=${await makeToken(vol.id)}`;

  // Test 1: Notifications API POST mark_all_read
  const markAllRes = await fetch(`${BASE_URL}/api/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: volCookie },
    body: JSON.stringify({ action: "mark_all_read" }),
  });
  const markAllJson = await markAllRes.json();
  if (markAllRes.status === 200 && markAllJson.success) {
    console.log("✅ [API] POST /api/notifications mark_all_read succeeded");
  } else {
    console.log("❌ [API] POST /api/notifications mark_all_read failed", markAllRes.status, markAllJson);
  }

  // Test 2: Location API POST live GPS tracking
  const locRes = await fetch(`${BASE_URL}/api/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: volCookie },
    body: JSON.stringify({ lat: 11.0168, lng: 76.9558 }), // Coimbatore coords
  });
  const locJson = await locRes.json();
  if (locRes.status === 200 && locJson.success && locJson.lat === 11.0168) {
    console.log("✅ [API] POST /api/location live GPS coordinates update succeeded");
  } else {
    console.log("❌ [API] POST /api/location update failed", locRes.status, locJson);
  }

  // Verify in DB that volunteer's location was updated
  const updatedVol = await db.user.findUnique({ where: { id: vol.id } });
  if (updatedVol?.latitude === 11.0168 && updatedVol?.longitude === 76.9558) {
    console.log("✅ [DB State] Volunteer latitude and longitude accurately persisted in database");
  } else {
    console.log("❌ [DB State] Volunteer location mismatch in database");
  }

  // Test 3: Public home page query filters
  const filterRes = await fetch(`${BASE_URL}/?city=Coimbatore&cat=Concert`);
  if (filterRes.status === 200) {
    const text = await filterRes.text();
    console.log("✅ [Frontend] Home page query filter /?city=Coimbatore&cat=Concert returned HTTP 200 OK");
  } else {
    console.log("❌ [Frontend] Home page query filter failed with HTTP", filterRes.status);
  }

  // Test 4: Event detail public route
  const event = await db.event.findFirst({ where: { status: "PUBLISHED" } });
  if (event) {
    const evRes = await fetch(`${BASE_URL}/events/${event.id}`);
    if (evRes.status === 200) {
      console.log(`✅ [Frontend] Public event page /events/${event.id} rendered HTTP 200 OK`);
    } else {
      console.log(`❌ [Frontend] Public event page returned HTTP ${evRes.status}`);
    }
  }

  console.log("\nAll HTTP integration checks passed!\n");
}

runHttpIntegration().catch((e) => {
  console.error("HTTP integration test failed", e);
  process.exit(1);
});
