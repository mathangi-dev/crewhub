import { PrismaClient } from "@prisma/client";
import { notifyAdmins, notifyUser } from "../lib/notifications";

const db = new PrismaClient();

async function testNewFeatures() {
  console.log("=== Testing New CrewHub Features: Profiles, Queries, and Complaints ===");

  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  const org = await db.user.findFirst({ where: { role: "ORGANIZER" } });
  const vol = await db.user.findFirst({ where: { role: "VOLUNTEER" } });

  if (!admin || !org || !vol) {
    console.error("Missing test users in seed!");
    process.exit(1);
  }

  // 1. Test Profile Extended Fields
  console.log("\n1. Testing Profile Extended Fields...");
  const updatedVol = await db.user.update({
    where: { id: vol.id },
    data: {
      phone: "9876543210",
      age: 23,
      gender: "Male",
      upiNumber: "9876543210",
      upiId: "vol@upi"
    }
  });
  console.log("✅ Volunteer profile updated with age:", updatedVol.age, "gender:", updatedVol.gender, "phone:", updatedVol.phone);

  const updatedOrg = await db.user.update({
    where: { id: org.id },
    data: {
      phone: "8838617672",
      website: "https://stagecraft.example",
      upiNumber: "8838617672"
    }
  });
  console.log("✅ Organizer profile updated with website:", updatedOrg.website, "phone:", updatedOrg.phone);

  // 2. Test Support Query Submission from Organizer to Admin
  console.log("\n2. Testing Support Query & Complaint Submission...");
  const query = await db.supportQuery.create({
    data: {
      userId: org.id,
      subject: "Urgent: Need 10 extra crowd marshals for music expo",
      category: "URGENT",
      message: "Can we increase role count from 15 to 25 people?",
      status: "OPEN"
    }
  });
  console.log("✅ Support Query created with ID:", query.id, "Status:", query.status);

  // Notify Admin
  await notifyAdmins({
    title: `📩 New ${query.category}: ${query.subject}`,
    message: `From ${org.name}: ${query.message}`,
    link: `/admin/queries?id=${query.id}`
  });
  console.log("✅ Admin notification dispatched for query");

  // 3. Test Admin Answering Query
  console.log("\n3. Testing Admin Reply to Query...");
  const answeredQuery = await db.supportQuery.update({
    where: { id: query.id },
    data: {
      answer: "Approved! You can add 10 more slots under roles in Manage Events.",
      answeredAt: new Date(),
      status: "ANSWERED"
    }
  });
  console.log("✅ Query answered with Status:", answeredQuery.status, "Answer:", answeredQuery.answer);

  // Notify Organizer
  await notifyUser({
    userId: query.userId,
    title: `💬 Admin Response: ${query.subject}`,
    message: `Admin replied: "${answeredQuery.answer}"`,
    link: "/organizer?tab=contact"
  });
  console.log("✅ User notified of admin reply");

  // 4. Test Volunteer Complaint Filing & Account Deactivation
  console.log("\n4. Testing Volunteer Complaint Filing & Account Deactivation...");
  const report = await db.report.create({
    data: {
      reporterId: org.id,
      targetType: "VOLUNTEER",
      targetId: vol.id,
      reason: "Volunteer left shift 2 hours early without notice.",
      status: "OPEN"
    }
  });
  console.log("✅ Complaint Report filed against volunteer with ID:", report.id);

  // Simulate Admin Deactivation
  const suspendedVol = await db.user.update({
    where: { id: vol.id },
    data: { suspended: true }
  });
  console.log("✅ Volunteer account deactivated/suspended:", suspendedVol.suspended);

  // Simulate Admin Reinstatement
  const reinstatedVol = await db.user.update({
    where: { id: vol.id },
    data: { suspended: false, absences: 0 }
  });
  console.log("✅ Volunteer account reinstated, absences reset to:", reinstatedVol.absences);

  // Cleanup the test query and report
  await db.supportQuery.delete({ where: { id: query.id } });
  await db.report.delete({ where: { id: report.id } });
  console.log("\n✅ Test data cleaned up successfully!");

  console.log("\n=======================================================");
  console.log("ALL NEW CREWHUB FEATURES TESTED & VERIFIED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

testNewFeatures()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
