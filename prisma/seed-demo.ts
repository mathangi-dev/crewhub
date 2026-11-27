// DEV ONLY: creates one demo organizer and one published event so the landing page has something to show.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const password = randomBytes(9).toString("base64url");
  const org = await prisma.user.upsert({
    where: { email: "organizer@demo.crewhub.local" },
    update: {},
    create: {
      email: "organizer@demo.crewhub.local", name: "Demo Organizer", role: "ORGANIZER",
      passwordHash: await bcrypt.hash(password, 12),
      organizerProfile: { create: { orgName: "Demo Events", verified: true } },
    },
  });
  await prisma.event.create({
    data: {
      organizerId: org.id, title: "Music Concert", description: "Live music night.", category: "Concert",
      venue: "Reliance Mall", city: "Erode", status: "PUBLISHED",
      startsAt: new Date("2026-12-20T12:30:00Z"), endsAt: new Date("2026-12-20T16:30:00Z"),
      applicationDeadline: new Date("2026-12-18T12:30:00Z"),
      jobs: { create: [
        { name: "Crowd management", vacancies: 10, wageType: "DAILY", wage: "450.00" },
        { name: "Guest management", vacancies: 4, wageType: "DAILY", wage: "350.00" },
      ] },
    },
  });
  console.log(`Demo organizer: organizer@demo.crewhub.local / ${password} (only shown once)`);
}
main().finally(() => prisma.$disconnect());
