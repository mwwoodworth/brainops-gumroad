# 🏗️ SaaS ERP Starter Kit (Enterprise Edition)
### Production-Grade Architecture for Next.js & Supabase

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- Supabase Project (Free tier works)
- PostgreSQL client (optional, for checking schema)

### 2. Database Setup
This kit relies on specific database schemas and RLS (Row Level Security) policies to handle multi-tenancy securely.

1.  Go to your Supabase Dashboard > SQL Editor.
2.  Open `schema.sql` from this folder.
3.  Copy and paste the SQL content into the editor.
4.  Run the script. This will:
    *   Create `companies`, `contacts`, `projects`, `invoices`, `work_orders` tables.
    *   Set up **Row Level Security (RLS)** so users can ONLY see data belonging to their `organization_id`.
    *   Create storage buckets for file uploads.

### 3. Application Integration
The code provided in `src/` is a **module extraction** from a live ERP system handling millions in transaction volume.

*   **`src/app/api/auth/`**: Contains the secure registration and session management endpoints.
*   **`src/lib/`**: Contains the core utility libraries, including the Supabase client wrapper that handles session cookies automatically.
*   **`src/middleware.ts`**: The Next.js middleware that protects your routes and manages session refreshing.

#### Integration Steps:
1.  Copy `src/` into your Next.js project root.
2.  Install dependencies:
    ```bash
    npm install @supabase/supabase-js @supabase/auth-helpers-nextjs zod date-fns
    ```
3.  Add your environment variables to `.env.local`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```

### 4. Understanding the Architecture
Read `SaaS-ERP-Starter-Guide.md` for a deep dive into the "Service Layer Pattern"—the secret to keeping your code clean as you scale from 100 to 10,000 users.

---

## 🔒 Security Note
This starter kit uses **RLS (Row Level Security)**. This means security is enforced at the *database engine level*. Even if your API code has a bug, a user cannot query data they don't own. **Do not disable RLS.**

---

## 🆘 Support
Need help deploying? Contact **support@brainops.io**.
