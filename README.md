# Addis Estate — Property & Rent Management

A Property & Rent Management System designed for commercial and office buildings in Addis Ababa, Ethiopia. Recreated from the prototype at `design/addis-estate-ui.html` and connected to a real Node.js/Express + MySQL + Prisma backend.

---

## Tech Stack
- **Frontend**: React (JavaScript) + Vite + Tailwind CSS + React Router (`HashRouter`) + Axios
- **Typography**: IBM Plex Sans (UI), Fraunces (Headings), IBM Plex Mono (Numbers & Currency)
- **Currency**: ETB everywhere with monospace formatting
- **Backend**: Node.js + Express (ES Modules) + Helmet + CORS + Morgan + Zod + Rate Limiting
- **Database & ORM**: MySQL / MariaDB (Port 3307/3306) with Prisma ORM
- **Export Engines**: PDF generation via `pdfkit`, Excel export via `exceljs`, QR code via `qrcode`
- **Payment Gateway**: Chapa (sandbox + live webhook), Telebirr & CBE Birr instant verification stubs

---

## Folder Structure
```
rent_app/
├── client/                     # React + Vite application
│   ├── src/
│   │   ├── components/         # StatusBadge, StatCard, Modal, BuildingSwitcher, FormField
│   │   ├── context/            # AuthContext (role switcher, building scoping), ToastContext
│   │   ├── layouts/            # AdminLayout (dark sidebar), TenantShell (mobile-first)
│   │   ├── pages/              # Dashboard, Properties, BuildingDetail, OfficeDetail,
│   │   │                       # Tenants, Payments, Contracts, Reports, AuditLog, Users,
│   │   │                       # tenant/ (Home, History, Receipts, Profile), PortalResolver, Login
│   │   ├── services/           # Axios instance with JWT interceptor
│   │   ├── utils/              # ETB, fmtDate, fmtDateTime formatters
│   │   ├── App.jsx             # HashRouter routes
│   │   ├── index.css           # Exact prototype CSS variables & dark mode
│   │   └── main.jsx
│   ├── index.html              # Fraunces, IBM Plex Sans, IBM Plex Mono fonts
│   └── package.json
├── server/                     # Express API
│   ├── prisma/
│   │   ├── schema.prisma       # 10 models with relations & indexes
│   │   └── seed.js             # Realistic Ethiopian dataset (ABC & XYZ buildings)
│   ├── src/
│   │   ├── config/             # Prisma singleton, env config
│   │   ├── controllers/        # Auth, Building, Office, Tenant, Contract, Payment, Gateway, Report, Audit, User
│   │   ├── routes/             # Express API routes mounted under /api
│   │   ├── middleware/         # Auth (role guard, building scoping), Multer upload, Validation, Error handlers
│   │   ├── jobs/               # Daily overdue check & 45-day expiring contract alerts
│   │   ├── utils/              # JWT & standardized responses
│   │   ├── app.js              # Express app pipeline & static uploads
│   │   └── server.js           # Server listen & graceful shutdown
│   ├── uploads/                # Statically served uploaded receipts & slips
│   ├── .env                    # Port 5000, MySQL 3307, JWT & Gateway secrets
│   └── package.json
├── design/
│   └── addis-estate-ui.html    # Original design prototype (Source of Truth)
└── README.md
```

---

## Role-Based Access & Multi-Tier Hierarchy

The platform implements a multi-tier SaaS model with dedicated layouts and separated dashboards:

1. **System Owner (`SUPER_ADMIN`)**:
   - The platform super administrator.
   - Access: `/admin/dashboard` via [`SystemAdminLayout`](file:///c:/Users/leale/Desktop/rent_app/client/src/layouts/SystemAdminLayout.jsx).
   - Reviews and **approves or rejects** newly registered Building Owners.
   - Monitors platform-wide health, active landlords, total buildings, and revenue volume.

2. **Building Owner (`OWNER` — The Client / Landlord)**:
   - Registers via the **Get Started** button at `/register`.
   - Registration enters `PENDING` state until approved by the System Owner.
   - Once approved, logs into `/owner/dashboard` via [`OwnerLayout`](file:///c:/Users/leale/Desktop/rent_app/client/src/layouts/OwnerLayout.jsx).
   - Manages their buildings, units/offices, tenants, leases, and reports.
   - Creates and invites **Managers** and **Accountants** under their ownership.

3. **Property Manager / Accountant (`MANAGER`)**:
   - Created under the Building Owner.
   - Scoped strictly to the buildings assigned to them by the Owner.
   - Access: `/manager/dashboard` via [`ManagerLayout`](file:///c:/Users/leale/Desktop/rent_app/client/src/layouts/ManagerLayout.jsx).
   - Handles day-to-day operations: slip verification queue, manual payment recording, floor plan status.

4. **Tenant (`TENANT`)**:
   - Rents an office in the Building Owner's property.
   - Access: `/tenant` via [`TenantShell`](file:///c:/Users/leale/Desktop/rent_app/client/src/layouts/TenantShell.jsx).
   - Mobile-first portal with rent due notices (ETB), Chapa / Telebirr / CBE Birr payments, and bank receipt uploads.

---

## Initializing System Owner Credentials

To initialize the platform **System Owner (Super Admin)** credentials in MySQL:

```bash
cd server
npm run create-system-owner
```

Or pass custom credentials directly:
```bash
npm run create-system-owner -- --email="admin@enkurent.et" --password="SuperAdminPassword123!" --name="EnkuRent Administrator" --phone="0911000000"
```

Once initialized, sign in at `http://localhost:5173/login` to access the **System Admin Portal** (`/admin/dashboard`) and approve incoming Building Owner registrations.

---

## Getting Started

### 1. Database Setup (MySQL)
Ensure MySQL is running (e.g., in XAMPP on port `3307` or `3306`).
In `server/.env`, verify:
```env
PORT=5000
DATABASE_URL="mysql://root:@127.0.0.1:3307/rent_management_db"
JWT_SECRET="super_secret_jwt_key_addis_estate_2026"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
CHAPA_SECRET_KEY="CHASECK_TEST-sample_chapa_secret_key_mock_12345"
CHAPA_WEBHOOK_SECRET="chapa_webhook_secret_key_mock"
UPLOAD_DIR="uploads"
```

To regenerate the schema and seed data anytime:
```bash
cd server
npx prisma generate
node prisma/seed.js
```

### 2. Run the Applications (Separate Terminals)

**Terminal 1 — Backend (Express API):**
```bash
cd server
npm run dev
```
- API Base: `http://localhost:5000`
- Health Check: `http://localhost:5000/api/health`

**Terminal 2 — Frontend (Vite + React):**
```bash
cd client
npm run dev
```
- App URL: `http://localhost:5173` (or `http://localhost:5174`)

---

## Features & Verification

1. **Dashboard Overview**:
   - 8 dynamic stat cards (Total Offices, Occupied, Available, Expected Rent, Collected, Outstanding, Late Payments, Pending Verification).
   - 4-month CSS bar chart comparing expected vs collected revenue.
   - Pending verification table with full **Review Modal** to approve or reject with reasons.
2. **Properties & Floor Plan Grid**:
   - Building cards for ABC Business Center (18 offices, 3 floors) and XYZ Office Building (12 offices, 2 floors).
   - Interactive office grid with status badges (`Paid`, `Pending`, `Overdue`, `Available`, `Maintenance`).
3. **Office Detail & Tenant Portal Access**:
   - 7 tabbed views: Overview, Tenant, Contract, Payments, History, Documents, Audit Log.
   - Real QR Code generation (`/api/offices/:id/qr`) with Download QR, Print QR, and Copy Portal Link.
4. **Tenant Mobile-First Shell**:
   - Max-width 460px mobile view with bottom navigation (Home, History, Receipts, Profile).
   - Instant payment options via Chapa, Telebirr, CBE Birr, and Bank Transfer receipt submission.
5. **Reports & Exports**:
   - Real binary PDF export (`pdfkit`) and Excel spreadsheet export (`exceljs`).
6. **Manager Building Isolation**:
   - Manager Getnet Alemayehu is restricted on both frontend and backend to ABC Business Center.
