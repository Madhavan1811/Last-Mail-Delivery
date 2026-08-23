# Last-Mile Delivery Management & Control Tower Platform

A modern, full-stack last-mile logistics and delivery tracking platform designed to provide real-time visibility across customers, delivery agents, and logistics administrators.

---

## Project Overview

The **Last-Mile Delivery Management Platform** connects customers, field delivery agents, and logistics control managers in one unified ecosystem. 

Key capabilities include:
- **Dynamic Rate Engine**: Calculates shipping charges based on actual vs. volumetric weight, zone distance (Intra-Zone vs. Inter-Zone), service tier (B2C, B2B, Express), fuel surcharges, and COD fees.
- **Intelligent Agent Dispatching**: Automatically assigns orders to field agents based on zone coverage and active load capacity.
- **Real-Time Control Tower**: Admin dashboard featuring live Leaflet route mapping, zone volume heatmaps, real-time alert feeds, and customer pop-out inspection modals.
- **Interconnected Live Tracking**: Field updates made by agents immediately sync across customer order dashboards, tracking timelines, and admin monitors.
- **Immutable Audit Logging**: Every status transition is logged with actor details, timestamps, and notes to satisfy compliance and audit requirements.

---

## Languages, Frameworks & Tools Used

### **Frontend**
- **JavaScript (ES6+)**: Core client application logic.
- **React 18 + Vite**: Fast, modern frontend framework and bundler.
- **React Router v6**: Client-side page navigation and role-based route protection.
- **Vanilla CSS3 (Control Tower Theme)**: Custom dark mode system (`#0d1117` surface palette).
- **Leaflet.js + React-Leaflet**: Interactive map rendering for zone coverage and shipment route vectors.
- **Bootstrap 5 & Bootstrap Icons**: Responsive grid layout system and UI iconography.

### **Backend**
- **Node.js**: Asynchronous JavaScript runtime.
- **Express.js**: RESTful API web application framework.
- **Express Session & Cookie Parser**: Session-based user authentication and security guards.
- **Nodemailer**: Email notification service for shipment status updates.

### **Database & Testing**
- **PostgreSQL / SQLite**: Relational database storing users, zones, rate cards, orders, agents, and audit logs.
- **Vitest**: Unit testing runner validating the pure rate calculation logic.

---

## Key Features

### Admin Control Tower (`/admin`)
- **Live Network Route Map**: Interactive Leaflet map displaying active shipment locations across Indian logistics hubs.
- **Zone Volume Heatmap**: Visual indicators of order distribution and capacity per zone.
- **Real-Time Alert Feed**: Flags failed deliveries, unassigned shipments, and customer reschedule requests.
- **Customer Details Pop-out Modal**: Click any customer name to view their profile, total spent, active shipments, order history, assigned agents, and live tracking links.
- **Smart Agent Assignment**: Supports both 1-click **Auto-Assign** (load-balanced) and manual agent assignment.

### Customer Portal (`/orders` & `/orders/new`)
- **Order Creation & Dynamic Rate Estimator**: Interactive calculator comparing actual weight vs. volumetric dimensions `(L×B×H / 5000)`, with dynamic route map preview.
- **"My Shipments" Dashboard (`/orders`)**: Summary stat cards (Total, Active, Delivered, Action Needed), search by Order ID/address/zone, and status filters.
- **Live Order Tracking (`/orders/:id`)**: Step progress bar timeline (`Created` ➔ `Assigned` ➔ `Picked Up` ➔ `In Transit` ➔ `Out for Delivery` ➔ `Delivered`), Leaflet route map, assigned agent contact card, and timestamped audit logs.
- **Failed Order Rescheduling**: Option for customers to request a new delivery date and note if a delivery fails.

### Delivery Agent Portal (`/agent`)
- **Assigned Shipment List**: Dedicated dashboard for agents showing active vs. completed deliveries.
- **1-Click Status Updates**: Update package state through the delivery lifecycle (`Picked Up`, `In Transit`, `Out for Delivery`, `Delivered`, `Failed`).
- **Failure Reason Logging**: Prompts for mandatory notes when flagging failed attempts.

### Real-Time Status Sync
- Automated 5-second polling synchronization across Admin, Agent, and Customer views ensures live updates without hard browser reloads.

---


## How to Run the Project (Local Development)

### 1. Prerequisites
- **Node.js**: ≥ 18.x
- **npm**: ≥ 9.x
- **PostgreSQL**: ≥ 14.x (Installed and running locally on default port `5432`)

---

### 2. PostgreSQL Installation & Database Setup

> 💡 **Note**: Your local database is already created and seeded! This setup section is provided for evaluators or developers setting up the project from scratch on a new machine.

#### Windows Installation:
1. Download the installer from the [PostgreSQL Official Downloads](https://www.postgresql.org/download/windows/).
2. Follow the setup wizard and note the password entered for the `postgres` superuser.
3. Open **SQL Shell (psql)** or Command Prompt to create the database:
   ```sql
   CREATE DATABASE delivery_tracker;
   ```
4. Run the database migration script (schema + seed data):
   ```bash
   psql -U postgres -d delivery_tracker -f server/migrations/001_schema.sql
   ```

#### macOS (Homebrew):
```bash
brew install postgresql@14
brew services start postgresql@14
createdb delivery_tracker
psql -d delivery_tracker -f server/migrations/001_schema.sql
```

#### Linux (Ubuntu / Debian):
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE delivery_tracker;"
psql -U postgres -d delivery_tracker -f server/migrations/001_schema.sql
```

---

### 3. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/Madhavan1811/Last-Mail-Delivery.git
cd delivery-tracker

# Install dependencies for both server and client
cd server && npm install
cd ../client && npm install
cd ..
```

### 4. Environment Configuration
Create a `.env` file inside the `server/` directory:
```env
PORT=3000
SESSION_SECRET=super_secret_delivery_tracker_key_2026
DATABASE_URL=postgres://postgres:password@localhost:5432/delivery_tracker
EMAIL_USER=demo@delivery.com
EMAIL_PASS=demo_password
```

### 5. Start the Application
From the root project directory, run:
```bash
npm run dev
```
- **Backend Server**: Starts at `http://localhost:3000`
- **Frontend Client**: Starts at `http://localhost:5173`

Open **`http://localhost:5173`** in your browser.

### 5. Run Unit Tests
```bash
cd server && npm test
```

---

## Demo Login Credentials

For testing and demonstration, use the following pre-configured accounts:

| Role | Email | Password | Access / Functionality |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@delivery.com` | `password` | Full Control Tower, Zone management, Rate Cards, Agent assignment, Customer modals |
| **Agent** | `ravi@delivery.com` | `password` | Field Agent view, update assigned delivery statuses |
| **Agent** | `priya@delivery.com` | `password` | Secondary Field Agent view |
| **Customer** | `customer@test.com` | `password` | Place orders, view "My Shipments", track live order route maps |

---

## API Reference Overview

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register customer/agent/admin.
- `POST /api/auth/login` — Login user session.
- `POST /api/auth/logout` — End user session.
- `GET /api/auth/me` — Retrieve current authenticated session.

### Orders (`/api/orders`)
- `POST /api/orders` — Submit new shipment order (triggers rate engine).
- `POST /api/orders/preview-charge` — Preview estimated shipping charge.
- `GET /api/orders` — List orders (filtered by user role).
- `GET /api/orders/:id` — Get single order detail, timeline, and agent info.
- `PATCH /api/orders/:id/assign` — Assign agent to order (Admin only).
- `PATCH /api/orders/:id/status` — Update order status (Agent / Admin).
- `PATCH /api/orders/:id/reschedule` — Customer delivery rescheduling.

### Admin (`/api/admin`)
- `GET, POST /api/admin/zones` — Manage logistics zones.
- `GET, POST /api/admin/rate-cards` — Configure pricing rate cards.
- `GET /api/admin/agents` — View agent fleet status & toggle availability.
