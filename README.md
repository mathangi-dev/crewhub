# CrewHub — On-Demand Event Workforce Platform

CrewHub is an event workforce management platform connecting event organizers with qualified temporary staff (crew & volunteers). Built with Next.js 14 (App Router), TypeScript, Prisma ORM, and MySQL 8.

---

## 🚀 Quick Start for Development & Testing

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **MySQL**: 8.0+ running on `localhost:3306` with database `crewhub`

### 2. Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Run migrations
npx prisma migrate dev

# 3. Seed demo accounts & events
npm run db:seed

# 4. Start dev server
npm run dev
```

Visit: **`http://localhost:3000`**

### 3. Run Automated Tests & Type Checks
```bash
# Run unit test suite (Payments, Discipline, Validation, Location)
npm test

# Run TypeScript static analysis
npx tsc --noEmit
```

---

## 🔑 Demo Test Accounts

| Role | Email | Password | Primary Portal |
| :--- | :--- | :--- | :--- |
| **Volunteer (Worker)** | `volunteer@crewhub.demo` | `Volunteer@123` | [`/worker`](http://localhost:3000/worker) |
| **Event Organizer** | `organizer@crewhub.demo` | `Organizer@123` | [`/organizer`](http://localhost:3000/organizer) |
| **Super Admin** | `admin@crewhub.demo` | `Admin@123` | [`/admin`](http://localhost:3000/admin) |

---

## 📋 Comprehensive Testing Guide

For a complete role-by-role test plan, step-by-step test cases, edge cases, responsive testing matrix, and bug reporting templates, see:

👉 **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**

### Key Features Covered in Testing:
1. **Organizer 10% Platform Fee**: Mandatory 10% fee calculated on total worker wage budget prior to publishing.
2. **Direct 1-Click Worker UPI Payouts**: Organizers pay workers directly via UPI (zero wage deductions) and record UTR references.
3. **Event Filter Capsule Bar**: Filter confirmed crew, wage budgets, settled/due amounts, and payment modals by individual events.
4. **24-Hour Payment Deadline**: Automatically started when an organizer marks a worker as **Checked Out**.
5. **Reliability & Discipline Policy**:
   - 3 shift cancellations: Warning notification sent.
   - 5 shift cancellations: Automated volunteer account suspension.
   - Overdue worker payments (> 24 hours): Organizer restricted from publishing new events.
6. **Substitute Crew Management**: Dedicated backup substitute role section with conditional payment rules (paid only if worked).
7. **Super Admin Dashboard**: Real-time platform fee auditing, overdue payment escalation, dispute resolution, and account suspension controls.
8. **Universal Mobile Responsiveness**: Seamless adaptive layouts from 320px mobile displays up to 4K monitors.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript 5.6
- **Database & ORM**: MySQL 8 + Prisma ORM (Decimal precision for financial amounts)
- **Authentication**: JWT in HTTP-only cookies (`jose`), password hashing (`bcryptjs`), rate limiting
- **Styling**: Vanilla CSS with modern custom properties, Joby-style capsule navigation, and responsive media queries
- **Testing**: Vitest 2.1
