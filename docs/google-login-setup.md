# Google Login Setup

InkRail dùng Supabase Auth với PKCE/cookie SSR. Code đăng nhập đã trỏ về route `/auth/callback`, route này gọi `exchangeCodeForSession` để lưu session vào cookie rồi đưa người dùng về `/library`.

## 1. App env

Local `.env.local` cần có tối thiểu:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://wwdkanwtfgzehjdhhwtc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
```

Production/Vercel đổi `NEXT_PUBLIC_SITE_URL` thành domain thật, ví dụ:

```env
NEXT_PUBLIC_SITE_URL=https://mangainkrail.vercel.app
```

Không đặt Google Client Secret hoặc Supabase service role dưới `NEXT_PUBLIC_`.

## 2. Google Cloud Console

Vào Google Auth Platform, tạo OAuth Client type `Web application`.

Authorized JavaScript origins:

```text
http://localhost:3000
https://mangainkrail.vercel.app
```

Authorized redirect URIs phải là callback của Supabase project, không phải `/auth/callback` của app:

```text
https://wwdkanwtfgzehjdhhwtc.supabase.co/auth/v1/callback
```

Scopes tối thiểu:

```text
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

## 3. Supabase Dashboard

Vào `Authentication > Providers > Google` của project `wwdkanwtfgzehjdhhwtc`:

1. Enable Google provider.
2. Paste Google `Client ID` và `Client Secret`.
3. Save.

Vào `Authentication > URL Configuration`:

Site URL (hosted Supabase):

```text
https://mangainkrail.vercel.app
```

Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/library
http://localhost:3100/auth/callback
http://localhost:3100/auth/callback?next=/library
https://mangainkrail.vercel.app/auth/callback
https://mangainkrail.vercel.app/auth/callback?next=/library
```

Khi deploy domain thật, thay `https://mangainkrail.vercel.app` bằng domain production.

## 4. Local smoke test

```bash
npm run dev
```

Mở:

```text
http://localhost:3000/login
```

Bấm `Tiếp tục với Google`. Luồng đúng sẽ là:

1. App gọi `supabase.auth.signInWithOAuth({ provider: "google" })`.
2. Browser chuyển sang Google consent/account chooser.
3. Google quay về Supabase callback.
4. Supabase quay về `http://localhost:3000/auth/callback?next=/library&code=...`.
5. InkRail đổi code lấy session cookie và redirect sang `/library`.
6. Header hiển thị trạng thái đã login; `/profile` đọc được user Google.

## 5. Lỗi thường gặp

- `missing-code`: Google/Supabase callback chưa đúng, hoặc provider trả lỗi trước khi có code.
- `redirect_uri_mismatch`: Google Console thiếu `https://wwdkanwtfgzehjdhhwtc.supabase.co/auth/v1/callback`.
- Login xong Supabase có user nhưng web chưa nhận session: kiểm tra Supabase Redirect URLs có `http://localhost:3000/auth/callback` và app đang chạy cùng origin.
- Production login quay về localhost: đổi Supabase Site URL/Redirect URLs và env deploy sang domain production.

## Production canonical origin

- Vercel project `book` uses `NEXT_PUBLIC_SITE_URL=https://mangainkrail.vercel.app` in Production.
- `mangainkrail.vercel.app` is the verified domain linked to this project.
- Production browser visits on Vercel-generated `book-*-thvapp.vercel.app` hostnames redirect to the canonical origin before login, so PKCE verifier cookies and callback stay on the same domain.
- Do not set the Google Cloud Authorized redirect URI to the Next.js callback. Keep the Supabase callback above.
- Do not try to share auth cookies between different `.vercel.app` hostnames. Users may have to sign in again once on the canonical domain.
- Historical immutable Vercel deployments may not have the redirect or environment settings. Use the project production domain rather than their `Visit` link.
- Verify Google Provider (Client ID/Secret) in the hosted Supabase dashboard; this repository cannot configure the hosted provider automatically.
