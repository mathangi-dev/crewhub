import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { readFileSync } from "fs"
import { encrypt } from "../lib/bank"
import { crewOf, commissionOf } from "../lib/money"
import { dispatchNearbyEventNotifications } from "../lib/notifications"

const db = new PrismaClient()
// make sure .env values (BANK_SECRET, COMMISSION_PERCENT) are available even if the seed runner did not load them
try {
  for (const l of readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^(\w+)="?(.*?)"?\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch {}

const bank = (holder: string, acct: string) => ({
  bankHolder: holder,
  bankName: "HDFC Bank",
  bankAccountEnc: encrypt(acct),
  bankLast4: acct.slice(-4),
  bankIfsc: "HDFC0001234",
  upiId: `${holder.toLowerCase()}@okhdfcbank`,
  upiNumber: `98765${acct.slice(-5)}`
})

const daysFromNow = (days: number, h = 10, m = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(h, m, 0, 0)
  return d
}

async function main() {
  for (const m of [db.supportQuery, db.report, db.transaction, db.notification, db.application, db.eventRole, db.event, db.auditLog, db.user]) {
    await (m as any).deleteMany()
  }

  const password = await bcrypt.hash("password123", 10)
  const mk = (data: any) => db.user.create({ data: { password, ...data } })

  const admin = await mk({
    email: "admin@eventlink.test",
    name: "Admin",
    role: "ADMIN",
    phone: "8220324140",
    ...bank("CrewHub Admin", "50100432198765"),
    upiNumber: "8220324140",
    upiId: "8220324140@upi",
  })

  const org = await mk({
    email: "org@eventlink.test",
    name: "Meera",
    role: "ORGANIZER",
    orgName: "Stagecraft Events",
    phone: "8838617672",
    website: "https://stagecraft.example",
    verifyInfo: "stagecraft.example · 40+ events hosted across Tamil Nadu · Reg. TN-2021-987",
    verified: true,
    approval: "APPROVED",
    city: "Chennai",
    ...bank("Stagecraft Events", "50100883861767"),
    upiNumber: "8838617672",
    upiId: "8838617672@upi",
  })

  await mk({
    email: "nimbus@eventlink.test",
    name: "Nimbus Events",
    role: "ORGANIZER",
    orgName: "Nimbus Events",
    phone: "9876512340",
    website: "https://nimbusevents.in",
    verifyInfo: "Reg. TN-2022-1180 · 6 past events in Coimbatore & Salem",
    city: "Chennai"
  })

  const CITY_COORDS_SEED: Record<string, { latitude: number; longitude: number }> = {
    Chennai: { latitude: 13.0827, longitude: 80.2707 },
    Coimbatore: { latitude: 11.0168, longitude: 76.9558 },
    Salem: { latitude: 11.6643, longitude: 78.146 },
    Erode: { latitude: 11.341, longitude: 77.7172 },
  }

  const vol = (email: string, name: string, acct: string, extra: any = {}) => {
    const city = extra.city || "Chennai"
    const coords = CITY_COORDS_SEED[city] || { latitude: 13.0827, longitude: 80.2707 }
    return mk({
      email,
      name,
      role: "VOLUNTEER",
      city,
      approval: "APPROVED",
      skills: "ushering, registration, crowd management",
      age: 22,
      gender: "Male",
      phone: `98765${acct.slice(-5)}`,
      termsVersion: "1.0",
      termsAcceptedAt: new Date(),
      ...coords,
      ...bank(name, acct),
      ...extra
    })
  }

  const arjun = await vol("vol@eventlink.test", "Arjun", "501002003004", { age: 21, gender: "Male" })
  const priya = await vol("priya@eventlink.test", "Priya", "501002003005", { skills: "hospitality, help desk", age: 23, gender: "Female" })
  const karthik = await vol("karthik@eventlink.test", "Karthik", "501002003006", { age: 22, gender: "Male" })
  const sneha = await vol("sneha@eventlink.test", "Sneha", "501002003007", { age: 20, gender: "Female" })
  const ravi = await vol("ravi@eventlink.test", "Ravi", "602003004005", { age: 24, gender: "Male" })
  const divya = await vol("divya@eventlink.test", "Divya", "501002003008", { city: "Coimbatore", age: 22, gender: "Female" })
  const ananya = await vol("ananya@eventlink.test", "Ananya", "501002003009", { city: "Salem", age: 21, gender: "Female" })
  const vikram = await vol("vikram@eventlink.test", "Vikram", "501002003010", { city: "Erode", age: 25, gender: "Male" })
  const deepak = await vol("deepak@eventlink.test", "Deepak", "501002003011", { city: "Coimbatore", age: 23, gender: "Male" })
  const pooja = await vol("pooja@eventlink.test", "Pooja", "501002003012", { city: "Salem", age: 22, gender: "Female" })
  const suresh = await vol("suresh@eventlink.test", "Suresh", "501002003013", { city: "Erode", age: 24, gender: "Male" })
  const meenakshi = await vol("meenakshi@eventlink.test", "Meenakshi", "501002003014", { age: 21, gender: "Female" })

  const rahul = await vol("rahul@eventlink.test", "Rahul", "501002003099", { suspended: true, absences: 3, age: 24, gender: "Male" })

  // Seed complaints against suspended volunteer
  await db.report.create({
    data: {
      reporterId: org.id,
      targetType: "VOLUNTEER",
      targetId: rahul.id,
      reason: "Repeated no-show for 3 shifts without prior intimation to event coordinator.",
      status: "OPEN"
    }
  })

  // Seed sample support queries & complaints
  await db.supportQuery.create({
    data: {
      userId: org.id,
      subject: "Inquiry on bulk volunteer requirement for Foodishh Expo",
      category: "URGENT",
      message: "We need 25 volunteers for our upcoming Foodishh festival. Can we request priority notifications for Coimbatore colleges?",
      answer: "Hello Meera, our location tracking automatically prioritizes volunteers within 20km radius in Coimbatore. Your event is published and live!",
      answeredAt: new Date(),
      status: "ANSWERED"
    }
  })

  await db.supportQuery.create({
    data: {
      userId: arjun.id,
      subject: "Payout inquiry for Kreya Art Expo shift",
      category: "PAYMENT",
      message: "Hi Admin, I completed my 12-hour shift at Kreya Art Expo on time. Please confirm when the bulk payout will be transferred to my UPI.",
      answer: "Hi Arjun, Kreya Art Expo attendances are verified and your payout is processed directly to your UPI.",
      answeredAt: new Date(),
      status: "ANSWERED"
    }
  })

  const volunteers = [arjun, priya, karthik, sneha, ravi, divya, ananya, vikram, deepak, pooja, suresh, meenakshi]

  // Helper to create an event with roles and sample applications
  const createEventWithCrew = async ({
    title,
    category,
    description,
    city,
    venue,
    startsAt,
    endsAt,
    cardImage,
    poster,
    roles,
    isCompleted
  }: any) => {
    const crewTotal = crewOf(roles)
    const commission = commissionOf(crewTotal)
    const cityKey = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    const coords = CITY_COORDS_SEED[cityKey] || { latitude: 13.0827, longitude: 80.2707 }

    const ev = await db.event.create({
      data: {
        title,
        category,
        description,
        city,
        venue,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusKm: 20,
        startsAt,
        endsAt,
        status: "PUBLISHED",
        payStatus: "PAID",
        paidAt: new Date(startsAt.getTime() - 864e5 * 2),
        crewTotal,
        commission,
        organizerId: org.id,
        cardImage,
        poster,
        roles: {
          create: roles
        }
      },
      include: { roles: true }
    })

    let volIdx = 0
    for (const r of ev.roles) {
      const slotsToFill = isCompleted ? r.slots : Math.min(r.slots, 3)
      for (let i = 0; i < slotsToFill && volIdx < volunteers.length; i++) {
        const u = volunteers[volIdx % volunteers.length]
        volIdx++

        if (isCompleted) {
          // COMPLETED EVENT: ALL VOLUNTEERS PRESENT
          await db.application.create({
            data: {
              roleId: r.id,
              userId: u.id,
              status: "ACCEPTED",
              checkIn: new Date(startsAt.getTime() + 10 * 60 * 1000),
              checkOut: new Date(endsAt.getTime()),
              absent: false,
              absentCounted: false,
              refunded: false,
              rating: 5,
              paid: false,
              payout: r.pay
            }
          })
        } else {
          // UPCOMING EVENT: ACCEPTED VOLUNTEERS
          await db.application.create({
            data: {
              roleId: r.id,
              userId: u.id,
              status: "ACCEPTED",
              checkIn: null,
              checkOut: null,
              absent: false,
              absentCounted: false,
              refunded: false,
              payout: 0
            }
          })
        }
      }
    }
    await dispatchNearbyEventNotifications(ev.id)
  }

  // 1. COMPLETED EVENT: Kreya-art expo (all volunteers present!)
  await createEventWithCrew({
    title: "Kreya-art expo",
    category: "Expo",
    description: "ID cards, food will be provided. wear formal dresses.",
    city: "salem",
    venue: "Sri Varalakshmi mahal",
    startsAt: daysFromNow(-3, 9, 0),
    endsAt: daysFromNow(-3, 21, 0),
    cardImage: "/uploads/72b86773-def0-4995-8c04-78666f080e81.png",
    poster: "/uploads/f176863b-28a7-43f1-a530-76201ae2e396.jpg",
    roles: [
      { title: "Operations Lead (Crew Head)", slots: 2, pay: 900, hours: 12 },
      { title: "Registration Management", slots: 3, pay: 750, hours: 12 },
      { title: "Visitors Guide", slots: 5, pay: 600, hours: 12 }
    ],
    isCompleted: true
  })

  // 2. UPCOMING EVENT: Foodishh
  await createEventWithCrew({
    title: "Foodishh",
    category: "Food Festival",
    description: "ID cards, food, and tshirts will be provided by the management committee.",
    city: "coimbatore",
    venue: "Codissia Hall",
    startsAt: daysFromNow(4, 10, 0),
    endsAt: daysFromNow(4, 21, 0),
    cardImage: "/uploads/378b9e99-7bb6-4ded-a78d-78a0aef11783.png",
    poster: "/uploads/86a4d94c-1db3-49cc-8014-8defa3a22937.jpg",
    roles: [
      { title: "crowd management", slots: 10, pay: 300, hours: 11 },
      { title: "Stall management", slots: 10, pay: 300, hours: 11 },
      { title: "Help Desk", slots: 3, pay: 250, hours: 11 }
    ],
    isCompleted: false
  })

  // 3. UPCOMING EVENT: Music Concert
  await createEventWithCrew({
    title: "Music Concert",
    category: "Concert",
    description: "ID cards, tshirts, and refreshments will be provided",
    city: "Erode",
    venue: "Reliance mall",
    startsAt: daysFromNow(48, 18, 0),
    endsAt: daysFromNow(48, 22, 0),
    cardImage: "/uploads/e838bcc4-bb44-4330-b3e2-37bf5165269d.png",
    poster: "/uploads/affa05db-a172-4dfe-9ddd-ba75875fa335.png",
    roles: [
      { title: "Entry and Checking", slots: 10, pay: 350, hours: 4 },
      { title: "crowd management", slots: 15, pay: 450, hours: 4 },
      { title: "Stage support", slots: 3, pay: 350, hours: 4 },
      { title: "Hospitality", slots: 4, pay: 350, hours: 4 },
      { title: "help desk", slots: 2, pay: 300, hours: 4 }
    ],
    isCompleted: false
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => db.$disconnect())
