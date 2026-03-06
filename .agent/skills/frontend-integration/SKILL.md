---
name: Advanced Medusa Frontend Integration & Next.js Architecture
description: Pro-level directives for AI Agents building highly scalable Medusa Storefronts. Enforces strict SDK compliance, Next.js Server Action patterns, aggressive caching, and advanced session management.
---

# 🚀 Advanced Medusa Frontend Integration Guide
*Directives for AI Agents to execute pro-level Medusa Storefront development.*

This document dictates the architectural and behavioral rules required to build a performant, secure, and highly scalable Medusa JS storefront using Next.js (App Router) and the `@medusajs/js-sdk`.

---

## 🛑 1. The Golden Rule: SDK Supremacy (CRITICAL)

You must act as a precise executor of the official **Medusa JS SDK**. Regular `fetch()` calls to backend `/store` or `/admin` endpoints are strictly prohibited.

### Why SDK over `fetch`?
1. **Header Injection:** SDK automatically applies `x-publishable-api-key` for store requests and `Authorization: Bearer <token>` for admin/customer sessions.
2. **Network Resilience:** Handles serialization, parsing, and query parameter formatting consistently out of the box.
3. **Type Safety:** Maintains strict contracts between storefront and backend.

### Allowed Interaction Patterns:
*   **Built-in API Routes:** `medusaClient.store.product.list()`, `medusaClient.auth.login()`.
*   **Custom API Routes (Module extensions):** `medusaClient.client.fetch("/store/my-custom-route", { method: "POST", body: { ... } })`
    *   *Note: Pass plain objects to `body`. NEVER use `JSON.stringify()`.*

---

## ⚡ 2. Next.js App Router & Server Actions Architecture

Storefronts must leverage Next.js App Router paradigms for maximum performance and security.

### Server Actions (Mutations)
*   **Rule:** Sensitive mutations (Login, Register, Checkout, Order Creation) MUST happen inside Next.js Server Actions (`use server`).
*   **Auth State Mismatch Prevention:** Never leak tokens to the client unnecessarily. Server actions must extract tokens via the SDK, store them securely via Next.js `cookies()`, and trigger `revalidatePath()`.
*   **Token Injection:** For authenticated server-side requests within an action, you MUST manually inject the token into the SDK instance:
    ```typescript
    // Inside a server action
    const cookieStore = await cookies();
    const token = cookieStore.get('medusa_token')?.value;
    
    // Create a scoped instance or update client before request
    const scopedClient = medusaClient; 
    scopedClient.client.setToken(token); // Crucial for authenticated fetches
    
    const { customer } = await scopedClient.store.customer.retrieve(undefined, {
      headers: { Authorization: `Bearer ${token}` }
    });
    ```

### Server Components (Data Fetching)
*   **Rule:** For SEO-critical or static data (Products, Categories, Collections), fetch directly inside Server Components using the SDK.
*   **Caching Strategy:** Wrap SDK calls in Next.js `unstable_cache` if the data does not change frequently, or rely on React Query for dynamic client-side hydration.

---

## 🧠 3. Advanced State Management & Hydration

State management must bridge the gap between Medusa's backend truth and instantaneous frontend UI updates.

### Zustang + React Query (The Hybrid Approach)
1.  **Zustand for UI State:** Use Zustand strictly for synchronous UI state (e.g., `isCartDrawerOpen`, optimistic quantities, `activeVariant`).
2.  **React Query for Server State:** Use `@tanstack/react-query` to wrap SDK fetchers for polling, caching, and background refetching of cart or product data.

### Optimistic UI Updates (Required)
When modifying cart items, the AI must implement optimistic UI updates before the SDK network request resolves.
*   **Example Pattern:**
    1. User clicks "+1 Quantity".
    2. Zustand immediately updates local cart quantity (instant feedback).
    3. `debouncedUpdateQuantity` fires the SDK mutation (`medusaClient.store.cart.updateLineItem`).
    4. On success: Replace state with actual Medusa response.
    5. On error: Revert state and trigger `toast.error()`.

---

## 🔐 4. Session & Cart Synchronization

Medusa decouples Carts and Customer Sessions initially. Managing this lifecycle is critical.

### The Cart Lifecycle
*   **Creation:** Carts should be created anonymously via `medusaClient.store.cart.create()` and stored in `localStorage` (via Zustand persist) or cookies.
*   **Authentication Handoff:** When a user logs in, the active anonymous `cartId` must be linked to the newly authenticated customer by updating the cart's email and customer ID.

### Handling Invalid Configurations
*   **Stale Cart Recovery:** If a cart fetch returns `404 Not Found` (meaning it was completed or expired on backend), the UI must instantly clear the localized `cartId` and silently generate a new one.

---

## 🛒 5. Flawless Checkout Engineering

Checkout is the highest-risk surface area. The AI must enforce transactional integrity.

### Partial State & Metadata
*   **Custom Data:** Use the `metadata` property on carts or orders extensively to store UI-specific selections (e.g., `payment_type: 'PARTIAL_COD'`, `gift_message: '...'`).
*   **Cart Completion:** `medusaClient.store.cart.complete()` is the atomic center of checkout. Do not assume an order is generated until this returns `type === "order"`.

### Payment Gateway Handshake (e.g., Razorpay/Stripe)
1.  **Initiate Session:** Frontend calls Next.js `/api` route.
2.  **Server Verify:** API route verifies cart amounts using the SDK.
3.  **Payment Processing:** Client interfaces with Payment Gateway widget.
4.  **Verification:** Backend API route verifies Gateway signature webhook, then executes `cart.complete()` in Medusa.
5.  **Reconciliation Front-End:** Frontend polls for order completion state or redirects to Success page.

---

## 🛠️ 6. Error Handling & Defensive Coding

*   **SDK Error Parsing:** Medusa API errors can be nested. Always parse SDK errors defensively before sending to the client UI.
    ```typescript
    catch (error: any) {
       const userMsg = error.response?.data?.message || error.message || "An unexpected error occurred.";
       toast.error(userMsg);
    }
    ```
*   **Idempotency Checks:** For payment webhooks or checkout completions, gracefully handle cases where `cart.completed_at` is already true. Never throw a raw 500 error if an order is already successfully placed.

---

## ✅ Pro-Checklist for AI Execution
Before committing any frontend feature, the AI must verify:
- [ ] Are all API interactions routed through `medusaClient`? 
- [ ] Are mutations that handle PII or Tokens shielded within Server Actions?
- [ ] Have I attached `.catch()` blocks to all SDK fetches for UI error handling?
- [ ] Did I avoid `JSON.stringify()` in `client.fetch()` bodies?
- [ ] Is my UI optimistic, providing immediate feedback before waiting for Medusa's response?
