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
NEXT_PUBLIC_SITE_URL=https://inkrail.example.com
```

Không đặt Google Client Secret hoặc Supabase service role dưới `NEXT_PUBLIC_`.

## 2. Google Cloud Console

Vào Google Auth Platform, tạo OAuth Client type `Web application`.

Authorized JavaScript origins:

```text
http://localhost:3000
https://inkrail.example.com
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

Site URL:

```text
http://localhost:3000
```

Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/library
https://inkrail.example.com/auth/callback
https://inkrail.example.com/auth/callback?next=/library
```

Khi deploy domain thật, thay `https://inkrail.example.com` bằng domain production.

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
