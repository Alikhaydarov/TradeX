# TradeX Supabase sozlamasi

## 1. Bepul loyiha

1. [Supabase Dashboard](https://supabase.com/dashboard) orqali bepul loyiha yarating.
2. Project Connect oynasidan `Project URL` va `Publishable key` ni oling.
3. `.env.example` nusxasidan `.env.local` yarating va qiymatlarni kiriting.

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY`ni Supabase Dashboard → Project Settings → API
bo'limidan oling (bu maxfiy kalit, `.env.local`dan tashqariga hech qachon
chiqmasligi kerak). Faqat mobil push notification'larni boshqa userlarga
yuborish uchun serverda ishlatiladi (`src/lib/server/push.ts`).

## 2. Database

Supabase SQL Editor ichida migrationlarni tartib bilan ishga tushiring:

1. `supabase/migrations/001_tradex.sql`
2. `supabase/migrations/002_product_features.sql`
3. ... qolgan migrationlar tartib raqami bo'yicha
4. `supabase/migrations/009_push_notifications.sql` — mobil push notification
   uchun `push_tokens` jadvali.

Bu migrationlar profil, post, guruh chatlari, like/bookmark, trading jurnal,
backtest natijalari va RLS xavfsizlik siyosatlarini yaratadi.

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

Frontend Supabase bilan bevosita bog'lanmaydi. Google OAuth va barcha database
amallari bir xil domendagi Node.js `/api/*` route'lari orqali bajariladi.
