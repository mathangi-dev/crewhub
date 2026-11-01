"use server"
import { writeFile, mkdir } from "fs/promises"; import path from "path"; import { randomUUID } from "crypto"; import bcrypt from "bcryptjs"; import { redirect } from "next/navigation"; import { cookies } from "next/headers"; import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"; import { me, need, setSession } from "@/lib/auth"; import { crewOf, commissionOf, accepted } from "@/lib/money"; import { encrypt } from "@/lib/bank"; import { TERMS_VERSION } from "@/lib/terms"; import { payState, unusedOf } from "@/lib/payroll"
import { dispatchNearbyEventNotifications, notifyAdmins, notifyUser } from "@/lib/notifications";
import { getCityCoordinates, getVenueCoordinates } from "@/lib/geo";
import { ADMIN_UPI_ID, ADMIN_UPI_NUMBER, generateUTR } from "@/lib/payment";
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim()
const home = (r: string) => (r === "ADMIN" ? "/admin" : r === "ORGANIZER" ? "/organizer" : "/volunteer")
const log = (actorId: string, action: string) => db.auditLog.create({ data: { actorId, action } })

export async function register(f: FormData) {
  const role = s(f, "role") === "ORGANIZER" ? "ORGANIZER" : "VOLUNTEER"
  if (await db.user.findUnique({ where: { email: s(f, "email").toLowerCase() } })) redirect("/register?e=exists")
  const u = await db.user.create({ data: { email: s(f, "email").toLowerCase(), name: s(f, "name"), role, city: s(f, "city"), password: await bcrypt.hash(s(f, "password"), 10) } })
  if (role === "VOLUNTEER") {
    await notifyAdmins({
      title: `👤 New Volunteer Registered: ${u.name}`,
      message: `${u.name} (${u.city || "Tamil Nadu"}) has joined CrewHub as a volunteer.`,
      link: `/admin/volunteers`,
    }).catch(console.error)
  }
  await setSession(u.id); redirect(home(role))
}
export async function login(f: FormData) {
  const u = await db.user.findUnique({ where: { email: s(f, "email").toLowerCase() } })
  if (!u || u.suspended || !(await bcrypt.compare(s(f, "password"), u.password))) redirect("/login?e=1")
  await setSession(u.id); redirect(home(u.role))
}
// volunteers must agree to the terms before they can use the volunteer area (see app/volunteer/layout.tsx)
export async function acceptTerms(f: FormData) {
  const u = await need("VOLUNTEER")
  if (f.get("agree") !== "on") redirect("/terms")
  await db.user.update({ where: { id: u.id }, data: { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() } })
  await log(u.id, `terms-accepted:${TERMS_VERSION}`); redirect("/volunteer")
}
export async function logout() { cookies().delete("el"); redirect("/") }

export async function saveProfile(f: FormData) {
  const u = await me(); if (!u) redirect("/login")
  const d: any = { name: s(f, "name"), city: s(f, "city"), bio: s(f, "bio") }
  if (u.role === "VOLUNTEER") Object.assign(d, { skills: s(f, "skills"), interests: s(f, "interests"), availability: s(f, "availability") })
  else Object.assign(d, { orgName: s(f, "orgName"), verifyInfo: s(f, "verifyInfo") })
  await db.user.update({ where: { id: u.id }, data: d }); revalidatePath("/", "layout")
}

async function saveImage(f: FormDataEntryValue | null) {
  if (!(f instanceof File) || !f.size) return null
  const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[f.type]
  if (!ext || f.size > 5 * 1024 * 1024) return null
  const dir = path.join(process.cwd(), "public", "uploads"); await mkdir(dir, { recursive: true })
  const name = `${randomUUID()}.${ext}`; await writeFile(path.join(dir, name), Buffer.from(await f.arrayBuffer())); return `/uploads/${name}`
}
export async function createEvent(f: FormData) {
  const u = await need("ORGANIZER"); if (u.approval !== "APPROVED") redirect("/organizer"); const T = f.getAll("roleTitle"), N = f.getAll("roleSlots"), P = f.getAll("rolePay"), K = f.getAll("roleSkills"), H = f.getAll("roleHours")
  const roles = T.map((t, i) => ({ title: String(t).trim(), slots: Math.max(1, +String(N[i]) || 1), pay: Math.max(0, +String(P[i]) || 0), skills: String(K[i] ?? "").trim(), hours: Math.max(0, +String(H[i]) || 0) })).filter(r => r.title)
  if (!roles.length) redirect("/organizer?tab=create")
  const startsAt = new Date(`${s(f, "date")}T${s(f, "startTime")}`); let endsAt = new Date(`${s(f, "date")}T${s(f, "endTime")}`)
  if (isNaN(+startsAt) || isNaN(+endsAt)) redirect("/organizer?tab=create")
  if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 864e5) // overnight event
  // The event is only a DRAFT until the organizer pays crew pay + platform fee on the checkout page.
  // A DRAFT is invisible to everyone (admin, volunteers, home page). Events with no paid roles have nothing to pay.
  const title = s(f, "title")
  // Clean up any previous unpaid draft for this organizer with the same title to prevent duplicate drafts
  await db.event.deleteMany({ where: { organizerId: u.id, status: "DRAFT", payStatus: "UNPAID", title } })
  const crew = crewOf(roles), free = crew === 0
  const venue = s(f, "venue")
  const city = s(f, "city")
  const rawLat = parseFloat(s(f, "latitude")), rawLng = parseFloat(s(f, "longitude"))
  const venueFallback = getVenueCoordinates(venue, city)
  const latitude = !isNaN(rawLat) && rawLat !== 0 ? rawLat : venueFallback?.lat ?? null
  const longitude = !isNaN(rawLng) && rawLng !== 0 ? rawLng : venueFallback?.lng ?? null
  const radiusKm = Math.max(1, parseFloat(s(f, "radiusKm")) || 20)
  const locationAddress = s(f, "locationAddress") || venue

  const ev = await db.event.create({ data: { cardImage: await saveImage(f.get("card")), poster: await saveImage(f.get("poster")), title, category: s(f, "category"), description: s(f, "description"), city, venue,
    latitude, longitude, radiusKm, locationAddress,
    startsAt, endsAt, organizerId: u.id, status: free ? "PENDING" : "DRAFT", payStatus: free ? "PAID" : "UNPAID", paidAt: free ? new Date() : null, crewTotal: crew, commission: commissionOf(crew), roles: { create: roles } } })
  
  // Notify admin when new event is created
  await notifyAdmins({
    title: `📢 New Event Created: ${ev.title}`,
    message: `Organizer "${u.orgName || u.name}" created event "${ev.title}" in ${ev.city} (${free ? "Ready for approval" : "Awaiting payment"}).`,
    link: `/admin/events?s=PENDING`,
    eventId: ev.id,
  }).catch(console.error)

  // Send instant in-app notification to volunteers within the radius
  await dispatchNearbyEventNotifications(ev.id).catch(console.error)

  revalidatePath("/organizer"); redirect(free ? "/organizer?tab=events" : `/organizer/checkout/${ev.id}`)
}
export async function payEvent(id: string, formDataOrRef?: FormData | string) { // organizer pays crew pay + platform fee to Admin via UPI
  const u = await need("ORGANIZER"); if (u.approval !== "APPROVED") redirect("/organizer")
  const existing = await db.event.findFirst({ where: { id, organizerId: u.id } })
  if (!existing || existing.payStatus === "PAID") {
    redirect("/organizer?tab=events") // Already paid, prevent repeated payment
  }
  const ref = typeof formDataOrRef === "string" && formDataOrRef.trim()
    ? formDataOrRef.trim()
    : formDataOrRef instanceof FormData
    ? String(formDataOrRef.get("reference") || "").trim() || generateUTR()
    : generateUTR()

  const r = await db.event.updateMany({ where: { id, organizerId: u.id, payStatus: "UNPAID", status: { in: ["DRAFT", "PENDING"] } }, data: { status: "PENDING", payStatus: "PAID", paidAt: new Date() } })
  if (r.count) {
    const admin = await db.user.findFirst({ where: { role: "ADMIN" } })
    const totalAmount = existing.crewTotal + existing.commission

    // Safe transaction logging
    await db.transaction.create({
      data: {
        type: "ORGANIZER_EVENT_PAYMENT",
        amount: totalAmount,
        currency: "INR",
        fromUserId: u.id,
        toUserId: admin?.id,
        eventId: id,
        reference: ref,
        paymentMethod: "UPI",
        upiNumber: admin?.upiNumber || ADMIN_UPI_NUMBER,
        upiId: admin?.upiId || ADMIN_UPI_ID,
        status: "SUCCESS",
        note: `Organizer ${u.orgName || u.name} paid for event "${existing.title}"`
      }
    })

    // Delete any other duplicate unpaid drafts with the same title to avoid repeated payments
    await db.event.deleteMany({
      where: {
        organizerId: u.id,
        status: "DRAFT",
        payStatus: "UNPAID",
        title: existing.title,
        id: { not: id }
      }
    })
    await log(u.id, `paid:${id}:${ref}`)
    // Notify admin that event payment was funded and is ready for approval
    await notifyAdmins({
      title: `💳 Event Payment Completed: ${existing.title}`,
      message: `Organizer "${u.orgName || u.name}" paid ₹${totalAmount} via UPI to Admin (${ADMIN_UPI_NUMBER}, UTR: ${ref}). Ready for your approval.`,
      link: `/admin/events?s=PENDING`,
      eventId: id,
    }).catch(console.error)

    await dispatchNearbyEventNotifications(id).catch(console.error)
  }
  revalidatePath("/organizer"); redirect("/organizer?tab=events")
}
export async function discardDraft(id: string, back?: string) {
  const u = await need("ORGANIZER"); await db.event.deleteMany({ where: { id, organizerId: u.id, status: "DRAFT", payStatus: "UNPAID" } })
  revalidatePath("/organizer")
  redirect(typeof back === "string" ? back : "/organizer?tab=create")
}
// bank details: account number is encrypted, only the last 4 digits are kept in plain text
export async function saveBank(f: FormData) {
  const u = await me(); if (!u || u.role === "ADMIN") redirect("/login")
  const back = u.role === "ORGANIZER" ? "/organizer/profile" : "/volunteer/profile"
  const holder = s(f, "bankHolder"), bank = s(f, "bankName"), ifsc = s(f, "bankIfsc").toUpperCase().replace(/\s/g, ""), acct = s(f, "bankAccount").replace(/\s/g, ""), upi = s(f, "upiId").toLowerCase(), upiNum = s(f, "upiNumber").replace(/[\s-]/g, "")
  if (acct && !/^\d{9,18}$/.test(acct)) redirect(`${back}?bank=acct`)
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) redirect(`${back}?bank=ifsc`)
  if (upi && !/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(upi)) redirect(`${back}?bank=upi`)
  if (upiNum && !/^\d{8,12}$/.test(upiNum)) redirect(`${back}?bank=upinum`)
  const hasAcct = !!(acct || u.bankAccountEnc)
  if ((acct || ifsc || holder || bank) && !(hasAcct && ifsc && holder)) redirect(`${back}?bank=incomplete`)
  if (!hasAcct && !upi && !upiNum) redirect(`${back}?bank=incomplete`)
  const d: any = { bankHolder: holder, bankName: bank, bankIfsc: ifsc, upiId: upi, upiNumber: upiNum }
  if (acct) Object.assign(d, { bankAccountEnc: encrypt(acct), bankLast4: acct.slice(-4) }) // blank account box = keep the saved one
  await db.user.update({ where: { id: u.id }, data: d }); await log(u.id, "bank-details-updated") // never log the numbers
  revalidatePath("/", "layout"); redirect(`${back}?bank=saved`)
}
export async function submitVerification(f: FormData) {
  const u = await need("ORGANIZER"); await db.user.update({ where: { id: u.id }, data: { verifyInfo: s(f, "verifyInfo"), ...(u.approval === "REJECTED" ? { approval: "PENDING" } : {}) } })
  await log(u.id, "verification-submitted"); revalidatePath("/", "layout")
}
export async function cancelEvent(id: string) {
  const u = await need("ORGANIZER"); const e = await db.event.findFirst({ where: { id, organizerId: u.id } }); if (!e) return
  await db.event.update({ where: { id }, data: { status: "CANCELLED", ...(e.status === "PENDING" && e.payStatus === "PAID" ? { payStatus: "REFUNDED" } : {}) } }); revalidatePath("/organizer")
}

export async function apply(roleId: string, eventId: string) {
  const u = await need("VOLUNTEER"); if (u.termsVersion !== TERMS_VERSION) redirect("/terms")
  const r = await db.eventRole.findUnique({ where: { id: roleId }, include: { event: true, applications: true } })
  const mine = r?.applications.find(a => a.userId === u.id)
  const open = r && r.event.status === "PUBLISHED" && r.event.endsAt > new Date() && u.approval === "APPROVED" && (!mine || mine.status === "CANCELLED") && r.applications.filter(a => a.status === "PENDING" || a.status === "ACCEPTED").length < r.slots
  if (open) await db.application.upsert({ where: { roleId_userId: { roleId, userId: u.id } }, create: { roleId, userId: u.id }, update: { status: "PENDING" } })
  revalidatePath("/", "layout"); redirect(`/volunteer/events/${eventId}`)
}
export async function cancelApplication(id: string) {
  const u = await need("VOLUNTEER"); await db.application.updateMany({ where: { id, userId: u.id, status: "PENDING" }, data: { status: "CANCELLED" } }); revalidatePath("/", "layout")
}
async function ownApp(id: string) {
  const u = await need("ORGANIZER")
  return db.application.findFirst({ where: { id, role: { event: { organizerId: u.id } } }, include: { role: { include: { event: true } } } })
}
// the admin accepts volunteers for an event; accepted volunteers then show up on the organizer's dashboard
export async function decide(id: string, status: "ACCEPTED" | "REJECTED") {
  const a = await need("ADMIN"); const x = await db.application.findUnique({ where: { id }, include: { role: true } }); if (!x || x.status !== "PENDING") return
  if (status === "ACCEPTED" && (await db.application.count({ where: { roleId: x.roleId, status: "ACCEPTED" } })) >= x.role.slots) return
  await db.application.update({ where: { id }, data: { status } }); await log(a.id, `${status}:application:${id}`);

  // When admin accepts a volunteer, check if the event's required volunteer slots are now 100% completed!
  if (status === "ACCEPTED") {
    try {
      const ev = await db.event.findUnique({
        where: { id: x.role.eventId },
        include: { roles: { include: { applications: { where: { status: "ACCEPTED" } } } } }
      })
      if (ev) {
        const totalSlots = ev.roles.reduce((sum, r) => sum + r.slots, 0)
        const totalAccepted = ev.roles.reduce((sum, r) => sum + r.applications.length, 0)
        if (totalSlots > 0 && totalAccepted >= totalSlots) {
          // Check if already notified for requirements completion
          const alreadyNotified = await db.notification.findFirst({
            where: {
              userId: ev.organizerId,
              eventId: ev.id,
              title: { contains: "Requirements Completed" }
            }
          })
          if (!alreadyNotified) {
            await db.notification.create({
              data: {
                userId: ev.organizerId,
                eventId: ev.id,
                title: `🎉 Volunteer Requirements Completed: ${ev.title}`,
                message: `All ${totalSlots} required volunteer slots for "${ev.title}" have been successfully filled! You can now view your crew and download the volunteer roster spreadsheet.`,
                link: `/organizer?tab=manage&event=${ev.id}`,
              }
            })
          }
        }
      }
    } catch (err) {
      console.error("[DecideNotificationError]", err)
    }
  }

  revalidatePath("/", "layout")
}
export async function rate(id: string, f: FormData) {
  const a = await ownApp(id); if (a) await db.application.update({ where: { id }, data: { rating: Math.min(5, Math.max(1, +s(f, "rating") || 5)) } }); revalidatePath("/organizer")
}
// attendance is marked by the organizer only; volunteers see it read-only
export async function clock(id: string, kind: "checkIn" | "checkOut") {
  const a = await ownApp(id); if (!a || a.status !== "ACCEPTED" || a.role.event.status !== "PUBLISHED" || a.refunded || a.absent || a[kind] || (kind === "checkOut" && !a.checkIn)) return
  await db.application.update({ where: { id }, data: kind === "checkIn" ? { checkIn: new Date() } : { checkOut: new Date() } }); revalidatePath("/", "layout")
}

// organizer marks a volunteer absent (event must have started, no check in yet). Can be undone until the absence is counted after the event.
export async function markAbsent(id: string, on: boolean) {
  const a = await ownApp(id); if (!a || a.status !== "ACCEPTED" || a.role.event.status !== "PUBLISHED" || a.absentCounted || a.refunded || a.paid) return
  if (on && (a.checkIn || a.absent || a.role.event.startsAt > new Date())) return
  if (!on && !a.absent) return
  await db.application.update({ where: { id }, data: { absent: on } }); revalidatePath("/", "layout")
}

export async function userAct(id: string, kind: "APPROVED" | "REJECTED" | "SUSPEND" | "REINSTATE") {
  const a = await need("ADMIN"); const t = await db.user.findUnique({ where: { id } }); if (!t || t.role === "ADMIN") return
  const data: any = kind === "APPROVED" ? { approval: "APPROVED", verified: t.role === "ORGANIZER" } : kind === "REJECTED" ? { approval: "REJECTED", verified: false } : { suspended: kind === "SUSPEND", ...(kind === "REINSTATE" ? { absences: 0 } : {}) }
  await db.user.update({ where: { id }, data }); await log(a.id, `${kind}:${t.email}`); revalidatePath("/admin", "layout")
}
export async function eventAct(id: string, kind: "APPROVE" | "REJECT") {
  const a = await need("ADMIN"); const e = await db.event.findUnique({ where: { id } }); if (!e || e.status !== "PENDING") return
  if (kind === "APPROVE") {
    if (e.payStatus !== "PAID") return;
    await db.event.update({ where: { id }, data: { status: "PUBLISHED" } })
    await dispatchNearbyEventNotifications(e.id).catch(console.error)
  }
  else await db.event.update({ where: { id }, data: { status: "REJECTED", payStatus: e.payStatus === "PAID" ? "REFUNDED" : e.payStatus } })
  await log(a.id, `${kind}:${e.title}`); revalidatePath("/", "layout")
}
const payable = (id: string) => db.event.findUnique({ where: { id }, include: { roles: { include: { applications: { include: { user: true } } } } } })
const open = (e: any) => !!e && e.payStatus === "PAID" && e.status === "PUBLISHED" && e.endsAt <= new Date()
// who is owed money: accepted + checked in AND checked out + paid role + bank details saved + not paid yet. Absent volunteers are never in this list.
const owed = (e: any) => accepted(e).filter(({ a, r }) => payState(a, r, true) === "DUE")
// admin pays every eligible volunteer of an ended event (each gets the pay of their own role)
export async function payoutAll(eventId: string) {
  const a = await need("ADMIN"); const e = await payable(eventId); if (!e || !open(e)) return
  let n = 0, sum = 0
  for (const { a: x, r } of owed(e)) {
    const utr = generateUTR()
    const res = await db.application.updateMany({ where: { id: x.id, paid: false }, data: { paid: true, payout: r.pay, paidAt: new Date() } });
    if (res.count) {
      n++; sum += r.pay

      // Safe transaction record
      await db.transaction.create({
        data: {
          type: "VOLUNTEER_PAYOUT",
          amount: r.pay,
          currency: "INR",
          fromUserId: a.id,
          toUserId: x.userId,
          eventId: e.id,
          applicationId: x.id,
          reference: utr,
          paymentMethod: "UPI",
          upiNumber: x.user?.upiNumber || "",
          upiId: x.user?.upiId || "",
          status: "SUCCESS",
          note: `Bulk payout for role "${r.title}" in event "${e.title}"`
        }
      })

      await notifyUser({
        userId: x.userId,
        eventId: e.id,
        title: `💰 Payment Received: ₹${r.pay}`,
        message: `Your payout of ₹${r.pay} for role "${r.title}" in event "${e.title}" has been successfully transferred via UPI (UTR: ${utr})!`,
        link: `/volunteer/payments`,
      }).catch(console.error)
    }
  }
  if (n) await log(a.id, `payout-all:${e.title}:${n} volunteers:${sum}`)
  revalidatePath("/", "layout")
}
export async function payoutOne(appId: string) {
  const a = await need("ADMIN"); const x = await db.application.findUnique({ where: { id: appId }, include: { role: true, user: true } }); if (!x) return
  const e = await payable(x.role.eventId); if (!e || !open(e)) return
  const row = owed(e).find(y => y.a.id === appId); if (!row) return
  const utr = generateUTR()
  const res = await db.application.updateMany({ where: { id: appId, paid: false }, data: { paid: true, payout: row.r.pay, paidAt: new Date() } })
  if (res.count) {
    // Safe transaction record
    await db.transaction.create({
      data: {
        type: "VOLUNTEER_PAYOUT",
        amount: row.r.pay,
        currency: "INR",
        fromUserId: a.id,
        toUserId: row.a.userId,
        eventId: e.id,
        applicationId: appId,
        reference: utr,
        paymentMethod: "UPI",
        upiNumber: row.a.user.upiNumber || "",
        upiId: row.a.user.upiId || "",
        status: "SUCCESS",
        note: `Payout for role "${row.r.title}" in event "${e.title}"`
      }
    })

    await log(a.id, `payout:${e.title}:${row.r.pay}:${utr}`)
    await notifyUser({
      userId: row.a.userId,
      eventId: e.id,
      title: `💰 Payment Received: ₹${row.r.pay}`,
      message: `Your payout of ₹${row.r.pay} for role "${row.r.title}" in event "${e.title}" has been successfully transferred via UPI (UTR: ${utr})!`,
      link: `/volunteer/payments`,
    }).catch(console.error)
  }
  revalidatePath("/", "layout")
}

// Volunteer requests payment/inquiry from Admin if payout has not arrived
export async function requestPayment(appId: string) {
  const u = await need("VOLUNTEER")
  const app = await db.application.findFirst({
    where: { id: appId, userId: u.id },
    include: { role: { include: { event: true } } },
  })
  if (!app || app.paid || app.role.pay <= 0) return

  await db.application.update({
    where: { id: appId },
    data: { paymentRequestedAt: new Date() },
  })

  // Send high-priority notification to Admin
  await notifyAdmins({
    title: `⚠️ Payment Request from ${u.name}`,
    message: `Volunteer ${u.name} requested payout for event "${app.role.event.title}" (Role: ${app.role.title}, Pay: ₹${app.role.pay}).`,
    link: `/admin/payouts?id=${app.role.eventId}`,
    eventId: app.role.eventId,
  }).catch(console.error)

  await log(u.id, `payment-requested:${app.role.event.title}:${app.role.pay}`)
  revalidatePath("/volunteer/payments")
  revalidatePath("/admin/payouts")
  revalidatePath("/", "layout")
}
// ---- refunds: crew money that was never used goes back to the organizer (the platform fee is not refunded)
const refundable = (s: string, r: any) => (s === "ABSENT" || s === "NO_CHECKOUT") && r.pay > 0
// refund one absent volunteer's pay
export async function refundOne(appId: string) {
  const a = await need("ADMIN"); const x = await db.application.findUnique({ where: { id: appId }, include: { role: true } }); if (!x) return
  const e = await payable(x.role.eventId); if (!e || !open(e)) return
  const row = accepted(e).find(y => y.a.id === appId); if (!row || !refundable(payState(row.a, row.r, true), row.r)) return
  const res = await db.application.updateMany({ where: { id: appId, refunded: false, paid: false }, data: { refunded: true } })
  if (res.count) { await db.event.update({ where: { id: e.id }, data: { refunded: { increment: row.r.pay }, refundedAt: new Date() } }); await log(a.id, `refund:${e.title}:${row.r.pay}`) }
  revalidatePath("/", "layout")
}
// refund everything unused for the event: absent volunteers + unfilled slots
export async function refundAll(eventId: string) {
  const a = await need("ADMIN"); const e = await payable(eventId); if (!e || !open(e)) return
  const amt = unusedOf(e); if (amt <= 0) return
  const ids = accepted(e).filter(({ a: x, r }) => refundable(payState(x, r, true), r)).map(y => y.a.id)
  if (ids.length) await db.application.updateMany({ where: { id: { in: ids }, refunded: false, paid: false }, data: { refunded: true } })
  await db.event.update({ where: { id: e.id }, data: { refunded: { increment: amt }, refundedAt: new Date() } }); await log(a.id, `refund-all:${e.title}:${amt}`)
  revalidatePath("/", "layout")
}

// Live tracking: Update volunteer's real-time GPS location
export async function updateVolunteerLocation(lat: number, lng: number) {
  const u = await me()
  if (!u) return { success: false, error: "Not authenticated" }
  await db.user.update({
    where: { id: u.id },
    data: { latitude: lat, longitude: lng, lastLocationAt: new Date() }
  })
  revalidatePath("/volunteer/events")
  return { success: true }
}

// In-app notifications
export async function getMyNotifications() {
  const u = await me()
  if (!u) return []
  return db.notification.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: 30
  })
}

export async function markNotificationRead(id: string) {
  const u = await me()
  if (!u) return
  await db.notification.updateMany({
    where: { id, userId: u.id },
    data: { isRead: true }
  })
  revalidatePath("/", "layout")
}

export async function markAllNotificationsRead() {
  const u = await me()
  if (!u) return
  await db.notification.updateMany({
    where: { userId: u.id, isRead: false },
    data: { isRead: true }
  })
  revalidatePath("/", "layout")
}

