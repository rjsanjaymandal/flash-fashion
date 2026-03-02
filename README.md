# FLASH E-commerce (Next.js + Medusa)

Premium anime-inspired streetwear storefront powered by Medusa JS v2.x.
This repository has been fully stabilized and decoupled from legacy Supabase infrastructures.

## Tech Stack
-   **Frontend:** Next.js 16 (Turbopack, App Router), Tailwind CSS, Framer Motion
-   **Backend:** Medusa JS v2.x
-   **Database & Cache:** PostgreSQL 15 & Redis (Local Docker setup)
-   **State Management:** Zustand, NUQS
-   **Authentication & Data:** Medusa APIs
-   **Media:** Cloudinary
-   **Payments:** Razorpay

## Prerequisites
- Node.js (v18+)
- Docker Desktop (for local DBs)

## Getting Started

### 1. Database Setup (Docker)
We use Docker to run the necessary PostgreSQL and Redis instances locally.

1. Navigate to the Medusa backend directory:
   ```bash
   cd medusa-backend
   ```
2. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```
*(This starts `medusa_db` on port `5432` and `medusa_redis` on `6379` according to the `docker-compose.yml` file)*

### 2. Run the Medusa Backend
Keep your terminal in the `medusa-backend` directory and ensure dependencies are installed.

1. Install backend dependencies (if you haven't yet):
   ```bash
   npm install
   ```
2. Start the Medusa development server:
   ```bash
   npm run dev
   ```
The backend APIs and admin dashboard will run on `http://localhost:9000`.

### 3. Run the Next.js Storefront
In a new terminal window, navigate back to the root directory `flash fashion`.

1. Install frontend dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local` (ensure your API keys map to Medusa & Razorpay). No Supabase variables are required.
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
The storefront will run on `http://localhost:3000`.

## Scripts

- `npm run dev` - Starts the Next.js development server
- `npm run build` - Creates an optimized production build
- `npm run lint` - Runs ESLint to catch syntax/style errors

## Deployment
The storefront is fully decoupled and can be deployed to Vercel or any Node.js hosting. Ensure both the frontend and the Medusa backend are reachable online. The Medusa Backend requires a managed PostgreSQL database and Redis instance in production environments (like Render or Railway).
