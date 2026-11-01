# CrewHub
Next.js 14 (App Router, server actions) + Prisma + SQLite (swap provider to postgresql for production).
```
npm install       # also runs `prisma generate`
npm run setup     # resets the database (db push --force-reset) and seeds demo data
npm run dev       # http://localhost:3000
```
Seed logins (password `password123`): admin@eventlink.test, org@eventlink.test, vol@eventlink.test
Also seeded: priya@, karthik@, sneha@, ravi@ (approved volunteers), divya@ (awaiting approval), rahul@ (suspended), nimbus@ (organizer awaiting approval), all `@eventlink.test`.

## Setup note (new)
`.env` must contain `BANK_SECRET` (long random text). It encrypts saved bank account numbers. Do not lose it and do not commit `.env`.

## How the money flow works now
1. Organizer fills the Create Event form and clicks **Continue to payment**. The event is only a hidden DRAFT at this point.
2. The checkout page shows crew pay + platform fee (`COMMISSION_PERCENT`, default 15%). Example: 5 people x Rs.100 = Rs.500, fee Rs.75, total Rs.575. The event is created only when the organizer pays this.
3. Admin sees the paid event, approves it, and it goes live.
4. Volunteers apply. The admin accepts them. Accepted volunteers show up on the organizer's dashboard (Manage Events) for attendance.
5. The organizer marks check in and check out. Volunteers and admin both see these times.
6. After the event ends the admin pays from Payouts. Only volunteers with BOTH check in and check out are paid, each the pay of their role, and only if they saved bank details. Absent volunteers get nothing. Money for absentees and unfilled slots is shown as "Unused crew funds" in Admin > Payments.

## Refunds and CSV
- Admin > Payouts > View attendance: each absent volunteer (or one without check-out) has a **Refund** button, and the event has **Refund unused to organizer** (absent + unfilled slots). The platform fee is never refunded. The organizer sees the refund in History.
- **Download CSV** (per event, or all events) is built fresh from the database each time. It lists every volunteer who is ready to be paid: IDs, name, event, role, check in/out, bank details, amount, total. It holds full account numbers, is admin only, and every download is written to the audit log.

## Bank details
Volunteers and organizers add them in Profile. The account number is encrypted (AES-256-GCM) before saving, only the last 4 digits are visible to the user, and only the admin can open the full details (Payouts, and the Volunteers / Organizers detail pages).

Payment is simulated inside `payEvent` in `app/actions.ts`. Before going live, verify the Razorpay payment signature there.

## Absence rule and Payments tab (new)
- Organizer > Manage Events: each accepted volunteer has **Check in**, **Absent** (event started, not checked in) and **Undo absent** (until the absence is counted).
- Anyone who does not complete BOTH check in and check out is marked **absent automatically** 2 hours after the event ends (`GRACE_MS` in `lib/money.ts`).
- Every absence is added to the volunteer's count. At **5 absences** (`MAX_ABSENCES`) the account is suspended automatically and upcoming applications are cancelled. Admin > Volunteers > Reinstate resets the count to 0.
- Organizer > **Payments**: payment done, payment pending (with Pay now) and refunds by admin. Organizer > History shows pay details only for completed events.
- Database changed (`User.absences`, `Application.absent`, `Application.absentCounted`): run `npx prisma db push` (keeps data) or `npm run setup` (resets + reseeds).

## Volunteer terms
Every volunteer must tick the declaration on `/terms` after logging in, before using the volunteer area or applying to any event. The wording is in `lib/terms.ts`; change `TERMS_VERSION` there to make everyone agree again. The admin sees the acceptance date on the volunteer's detail page. Needs `npx prisma db push` (new fields `termsVersion`, `termsAcceptedAt`).
