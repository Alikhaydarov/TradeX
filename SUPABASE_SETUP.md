# TradeX Supabase sozlamasi

## 1. Bepul loyiha

1. [Supabase Dashboard](https://supabase.com/dashboard) orqali bepul loyiha yarating.
2. Project Connect oynasidan `Project URL` va `Publishable key` ni oling.
3. `.env.example` nusxasidan `.env.local` yarating va qiymatlarni kiriting.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

## 2. Database

Supabase SQL Editor ichida `supabase/migrations/001_tradex.sql` faylini to'liq ishga tushiring.

Bu migration quyidagilarni yaratadi:

- `profiles`
- `posts`
- `groups`
- `group_messages`
- RLS xavfsizlik siyosatlari
- yangi Google user uchun avtomatik profil
- post va chat uchun Realtime publication

## 3. Google OAuth

1. Google Cloud Console ichida OAuth Web Client yarating.
2. Google client redirect URI sifatida Supabase Dashboard ko'rsatgan callback URL'ni kiriting:
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Client ID va Client Secret qiymatlarini Supabase:
   `Authentication > Providers > Google` bo'limiga kiriting.
4. Supabase `Authentication > URL Configuration` ichida quyidagilarni allow list'ga qo'shing:
   - `http://localhost:3000/auth/callback`
   - production domeningizdagi `/auth/callback`

## 4. Ishga tushirish

```bash
npm run dev
```

Supabase kalitlari bo'lmasa ilova demo rejimda `localStorage` orqali ishlaydi.

