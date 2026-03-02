# FLASH E-commerce (Next.js + Medusa)

Premium anime-inspired streetwear storefront powered by Medusa JS.

## Tech Stack
-   **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion
-   **Backend:** Medusa JS
-   **State Management:** Zustand
-   **Authentication:** Medusa Auth
-   **Media:** Cloudinary
-   **Payments:** Razorpay

## Getting Started

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Set up environment variables in `.env.local`:
    ```
    NEXT_PUBLIC_MEDUSA_BACKEND_URL=your_medusa_url
    MEDUSA_BRIDGE_SECRET=your_bridge_secret
    ```
4.  Run the development server: `npm run dev`.

## Deployment
The storefront can be deployed to Vercel or any Node.js hosting. Ensure both the frontend and the Medusa backend are reachable.
