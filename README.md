# Furnish

A furniture e-commerce web app with a built-in 3D room planner. Browse products, visualise them in your room before buying, and manage everything through an admin dashboard.

---

## Project Overview

Furnish lets shoppers browse a catalogue of furniture, filter by category, add items to a persistent cart, and arrange pieces in a real-time 3D room planner — all in one place. An admin dashboard lets authorised users manage products and categories without touching the database directly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `better-sqlite3` |
| ORM | Prisma 7 (driver adapter) |
| Auth | JWT cookies via `jose`, passwords hashed with `bcryptjs` |
| 3D rendering | Three.js + React Three Fiber + Drei |
| State management | Zustand (cart, persisted to localStorage) |
| Runtime | Node.js |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

1. Clone the repository and install dependencies:
```bash
git clone <repo-url>
cd furnish
npm install
```

2. Create a `.env` file in the root of the project:
```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET=furnish_local_secret_key_123
```

> This file is not included in the repository for security reasons. You must create it manually before running any Prisma commands.

3. Generate the Prisma client:
```bash
npx prisma generate
```

4. Push the schema to create the SQLite database:
```bash
npx prisma db push
```

### Seed the Database

Populate the database with two demo users, 8 products, and 7 categories:
```bash
npx prisma db seed
```

### Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Login Credentials

These accounts are created by the seed script.

| Role | Email | Password |
|---|---|---|
| Admin | admin@furnish.com | admin123 |
| User | john@furnish.com | user123 |

The admin account has access to the dashboard at `/admin`. Regular user accounts can browse, use the planner, and manage their cart.

---

## Features

### Shopping
- Browse the full product catalogue with category filtering and sort options (name, price)
- Product cards with hover-reveal "Add to Cart" button
- Persistent cart stored in localStorage — survives page refreshes
- Cart page with quantity controls, line totals, and order summary

### 3D Room Planner
- Set custom room dimensions before starting
- Drag furniture from the sidebar onto the canvas
- Switch between a top-down 2D view and a perspective 3D view with a smooth camera transition
- Drag placed furniture to reposition it — pieces snap back if they would overlap
- Rotate pieces through 0°, 90°, 180°, and 270°
- Select a placed piece to switch between its available colour or material variants
- AABB collision detection prevents furniture pieces from overlapping
- Save room designs to the database — designs auto-save as you make changes
- Load, rename, and delete saved designs from the design selection screen
- "Add All to Cart" adds every placed item to the cart in one click

### Auth
- Sign up and log in with email and password
- JWT stored as an HTTP-only cookie
- Protected routes redirect unauthenticated users

### Admin Dashboard
- Full CRUD for products: create, edit, and delete with inline validation
- Manage product variants (colour/material options with per-variant images and 3D models)
- Full CRUD for categories with image and slug management
- Stats overview: total products, categories, and registered users

### General
- Responsive layout — collapses to a mobile-friendly view with a hamburger nav
- Skeleton loading states across all data-fetching pages
- Inline error messages on all forms
- Empty states with contextual prompts on every list view