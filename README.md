# ليلة من نور — Wedding Invitation

A responsive Arabic RTL wedding invitation and admin dashboard built with React, Vite, Tailwind CSS, and Supabase.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`. It contains the supplied `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; replace them when using a different Supabase project.
3. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the admin/storage setup and adds any missing wedding-detail columns to an existing table.
4. Start the app with `npm run dev`.

The public invitation is served at `/`; the admin dashboard is at `/admin` (also `/dashboard`).

## Supabase behavior

- The public page reads the `wedding_details` row with `id = 1` once when it mounts, bypasses HTTP caches, and listens for live row changes.
- Admin credentials use Supabase Auth. The first authenticated account claims administrator access through an atomic `claim_first_admin()` database function; subsequent visitors see the login form.
- Images and audio upload directly to the public `wedding-assets` Storage bucket. The database stores only their public URLs.
- The full-site background URL is stored in `site_background_image_url`; categorized gallery entries are stored as public-URL/category pairs in `gallery_items`. Existing `gallery_urls` entries migrate into the photoshoot partition.
- The admin can update wedding details using an upsert to the single `id = 1` row.
- Public visitors can read wedding details and uploaded assets. Only authenticated users in `admin_users` can update wedding details or upload/delete assets.

For public first-admin signup, disable email confirmation in Supabase Auth, or leave it enabled and follow the verification link before logging in to claim the first admin account.
