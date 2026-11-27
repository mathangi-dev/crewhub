import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo accounts and events...");

  // 1. Volunteer (WORKER)
  const volPasswordHash = await bcrypt.hash("Volunteer@123", 12);
  const vol = await prisma.user.upsert({
    where: { email: "volunteer@crewhub.demo" },
    update: { passwordHash: volPasswordHash },
    create: {
      email: "volunteer@crewhub.demo",
      name: "Demo Volunteer",
      role: "WORKER",
      passwordHash: volPasswordHash,
      workerProfile: {
        create: {
          phone: "9876543210",
          upi: "volunteer@oksbi",
          city: "Chennai",
          skills: ["Crowd Control", "Registration", "Hospitality", "First Aid"],
          experience: "Experienced in college fests, trade exhibitions, and city concerts.",
          preferredCategories: ["Crowd management", "Registration", "Guest management"],
          emailNotif: true,
          pushNotif: true,
          remindNotif: true,
        },
      },
    },
  });

  // Ensure workerProfile has upi and preferredCategories if already existed
  await prisma.workerProfile.upsert({
    where: { userId: vol.id },
    create: {
      userId: vol.id,
      phone: "9876543210",
      upi: "volunteer@oksbi",
      city: "Chennai",
      skills: ["Crowd Control", "Registration", "Hospitality", "First Aid"],
      experience: "Experienced in college fests, trade exhibitions, and city concerts.",
      preferredCategories: ["Crowd management", "Registration", "Guest management"],
      emailNotif: true,
      pushNotif: true,
      remindNotif: true,
    },
    update: {
      upi: "volunteer@oksbi",
      preferredCategories: ["Crowd management", "Registration", "Guest management"],
    },
  });

  // 2. Organizer (ORGANIZER)
  const orgPasswordHash = await bcrypt.hash("Organizer@123", 12);
  const org = await prisma.user.upsert({
    where: { email: "organizer@crewhub.demo" },
    update: { passwordHash: orgPasswordHash },
    create: {
      email: "organizer@crewhub.demo",
      name: "Demo Organizer",
      role: "ORGANIZER",
      passwordHash: orgPasswordHash,
      organizerProfile: {
        create: {
          orgName: "Stage Works & Expo Hub",
          phone: "9876500000",
          description: "Premier event management and exhibition organising firm.",
          verified: true,
        },
      },
    },
  });

  // 3. Admin (ADMIN)
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  await prisma.user.upsert({
    where: { email: "admin@crewhub.demo" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "admin@crewhub.demo",
      name: "CrewHub Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  // 4. Demo Events
  const eventsData = [
    {
      title: "Music Concert",
      category: "Concert",
      venue: "Reliance Mall",
      city: "Erode",
      description: "An open-air evening of live bands. Crew will manage entry queues, seating areas and guest assistance.",
      startsAt: new Date("2026-12-20T12:30:00Z"),
      endsAt: new Date("2026-12-20T16:30:00Z"),
      applicationDeadline: new Date("2026-12-18T18:00:00Z"),
      jobs: [
        { name: "Crowd management", vacancies: 10, wageType: "DAILY" as const, wage: "450.00", eligibility: "Calm under pressure. Comfortable standing for 5+ hours." },
        { name: "Guest management", vacancies: 4, wageType: "DAILY" as const, wage: "350.00", eligibility: "Good communication in Tamil and English." },
      ],
    },
    {
      title: "Trade Expo",
      category: "Exhibition",
      venue: "Chennai Trade Centre",
      city: "Chennai",
      description: "A business exhibition. Crew will run registration desks and guide visitors to stalls.",
      startsAt: new Date("2027-01-04T03:30:00Z"),
      endsAt: new Date("2027-01-04T12:30:00Z"),
      applicationDeadline: new Date("2027-01-01T18:00:00Z"),
      jobs: [
        { name: "Registration", vacancies: 6, wageType: "DAILY" as const, wage: "350.00", eligibility: "Comfortable with tablets and data entry." },
        { name: "Guest management", vacancies: 4, wageType: "DAILY" as const, wage: "300.00", eligibility: "Friendly attitude and punctual." },
      ],
    },
    {
      title: "Comedy Night",
      category: "Stand-up",
      venue: "City Auditorium",
      city: "Coimbatore",
      description: "A stand-up show with four comedians. Crew will seat guests and manage the entrance.",
      startsAt: new Date("2027-01-18T13:30:00Z"),
      endsAt: new Date("2027-01-18T17:00:00Z"),
      applicationDeadline: new Date("2027-01-15T18:00:00Z"),
      jobs: [
        { name: "Guest management", vacancies: 3, wageType: "DAILY" as const, wage: "300.00", eligibility: "Friendly and punctual." },
      ],
    },
    {
      title: "Rooftop Party",
      category: "Party",
      venue: "Sky Deck",
      city: "Salem",
      description: "A ticketed rooftop party. Crew will support the stage team and artists.",
      startsAt: new Date("2027-01-25T14:30:00Z"),
      endsAt: new Date("2027-01-25T19:30:00Z"),
      applicationDeadline: new Date("2027-01-22T18:00:00Z"),
      jobs: [
        { name: "Backstage support", vacancies: 4, wageType: "DAILY" as const, wage: "500.00", eligibility: "Late-night availability. Experience preferred." },
        { name: "Social media support", vacancies: 2, wageType: "DAILY" as const, wage: "400.00", eligibility: "Can shoot and post short videos." },
      ],
    },
  ];

  for (const ed of eventsData) {
    const existing = await prisma.event.findFirst({ where: { title: ed.title } });
    if (!existing) {
      await prisma.event.create({
        data: {
          organizerId: org.id,
          title: ed.title,
          category: ed.category,
          venue: ed.venue,
          city: ed.city,
          description: ed.description,
          status: "PUBLISHED",
          startsAt: ed.startsAt,
          endsAt: ed.endsAt,
          applicationDeadline: ed.applicationDeadline,
          jobs: {
            create: ed.jobs,
          },
        },
      });
    }
  }

  // 5. Seed an initial confirmed application & payment for volunteer
  const musicEvent = await prisma.event.findFirst({
    where: { title: "Music Concert" },
    include: { jobs: true },
  });

  if (musicEvent && musicEvent.jobs.length > 0) {
    const job = musicEvent.jobs[0];
    const existingApp = await prisma.application.findUnique({
      where: { workerId_eventId: { workerId: vol.id, eventId: musicEvent.id } },
    });

    let appId = existingApp?.id;
    if (!existingApp) {
      const createdApp = await prisma.application.create({
        data: {
          eventId: musicEvent.id,
          eventJobId: job.id,
          workerId: vol.id,
          status: "CONFIRMED",
        },
      });
      appId = createdApp.id;
    }

    if (appId) {
      const existingPay = await prisma.workerPayment.findUnique({
        where: { applicationId: appId },
      });
      if (!existingPay) {
        await prisma.workerPayment.create({
          data: {
            applicationId: appId,
            amount: 450.0,
            status: "RECORDED",
            upiReference: "UPI9921001834",
            paidAt: new Date(),
          },
        });
      }
    }
  }

  // 6. Seed notifications
  const noticeCount = await prisma.notification.count({ where: { userId: vol.id } });
  if (noticeCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: vol.id,
          type: "PAYMENT_RECORDED",
          title: "Payment recorded",
          body: "Music Concert: ₹450 recorded by the organizer. Confirm if you received it.",
          link: "/worker/payments",
        },
        {
          userId: vol.id,
          type: "APPLICATION_CONFIRMED",
          title: "Application confirmed",
          body: "Music Concert: you are confirmed for Crowd management.",
          link: "/worker/applications",
          readAt: new Date(),
        },
      ],
    });
  }

  console.log("SUCCESS: Database seeded with real demo data!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
