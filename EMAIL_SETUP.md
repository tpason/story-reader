# Cấu hình Email — Linh Quyển Các (Story Reader)

Tài liệu này mô tả **những gì cần config** để bật mail: xác thực email, quên mật khẩu, và bản tin tuần.

---

## Tóm tắt nhanh

| Môi trường | Cần config tối thiểu |
|------------|----------------------|
| **Dev local** | `MAIL_LOG_ONLY=1` + `NEXT_PUBLIC_SITE_URL` (hoặc mặc định `localhost:3000`) |
| **Production** | `RESEND_API_KEY` + `MAIL_FROM` + `NEXT_PUBLIC_SITE_URL` (HTTPS) + `MAIL_DIGEST_CRON_TOKEN` (nếu bật digest) |
| **Dev có gửi thật** | `SMTP_HOST` + `MAIL_FROM` (hoặc `RESEND_API_KEY`) |

**Thứ tự ưu tiên gửi mail:** Resend → SMTP → `MAIL_LOG_ONLY` (chỉ log) → không gửi (warning trong log).

---

## 1. Biến môi trường

### Bắt buộc / quan trọng

| Biến | Mô tả | Ví dụ |
|------|--------|-------|
| `NEXT_PUBLIC_SITE_URL` | URL công khai của reader — dùng trong link verify/reset/unsubscribe trong email. **Docker: bake lúc build** (`docker-compose` build arg). | `https://linhquyencac.example.com` |
| `MAIL_FROM` | Địa chỉ người gửi (phải khớp domain đã verify trên Resend/SMTP). | `"Linh Quyển Các <noreply@yourdomain.com>"` |

### Gửi mail — chọn một trong các cách

| Biến | Khi nào dùng |
|------|----------------|
| `RESEND_API_KEY` | **Production khuyến nghị** — API Resend |
| `SMTP_HOST` | Dev / fallback khi Resend lỗi hoặc không có API key |
| `SMTP_PORT` | Cổng SMTP (mặc định `587`) |
| `SMTP_USER` / `SMTP_PASS` | Auth SMTP (nếu server yêu cầu) |
| `SMTP_SECURE` | `1` = SSL 465, `0` = STARTTLS 587 |
| `MAIL_LOG_ONLY` | `1` = **không gửi**, chỉ in log `[mail:log-only]` (dev) |

### Bản tin tuần (weekly digest)

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `MAIL_DIGEST_CRON_TOKEN` | Bearer token bảo vệ `POST /api/internal/email/weekly-digest` | *(trống = endpoint trả 503, cron skip)* |
| `EMAIL_DIGEST_INTERVAL_SECONDS` | Chu kỳ cron (giây) | `604800` (7 ngày) |
| `READER_EMAIL_DIGEST_URL` | URL nội bộ cron gọi (Docker) | `http://story-reader:3000/api/internal/email/weekly-digest` |

### Database (đã có sẵn nếu chạy migrate)

| Biến | Mô tả |
|------|--------|
| `STORY_DATABASE_URL` | PostgreSQL — bảng `reader_email_*` nằm cùng DB story |

---

## 2. File cấu hình đặt ở đâu

### Dev local (`story_reader`)

```bash
cp .env.example .env.local
# hoặc dùng root BetterBox-TTS/.env (dev-story-reader.sh có thể load)
```

### Docker production (root `BetterBox-TTS`)

```bash
cp docker/env.example .env
# Sửa .env rồi:
docker compose build story-reader   # NEXT_PUBLIC_SITE_URL bake vào image
docker compose up -d story-reader
```

Mail env được truyền vào container `story-reader` qua `docker-compose.yml`.

---

## 3. Setup theo môi trường

### A. Dev — chỉ test flow (không gửi mail thật)

```env
MAIL_LOG_ONLY=1
NEXT_PUBLIC_SITE_URL=http://localhost:3003
```

1. Chạy reader (`npm run dev:ws` hoặc `dev-story-reader.sh`).
2. Signup → xem terminal: `[mail:log-only]` có `subject`, `to`, `htmlLength`.
3. Link verify nằm trong HTML log (hoặc tạm bật SMTP/Resend để nhận mail thật).

### B. Dev — gửi mail thật qua SMTP (Gmail, Mailgun, …)

```env
MAIL_FROM="Linh Quyển Các <you@gmail.com>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=app-password-here
SMTP_SECURE=0
NEXT_PUBLIC_SITE_URL=http://localhost:3003
```

Không set `RESEND_API_KEY` → dùng SMTP. Không set `MAIL_LOG_ONLY`.

### C. Production — Resend (khuyến nghị)

1. Tạo tài khoản [Resend](https://resend.com).
2. **Domains** → thêm domain → cấu hình DNS (SPF, DKIM theo hướng dẫn Resend).
3. Tạo API key.

```env
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM="Linh Quyển Các <noreply@yourdomain.com>"
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
MAIL_LOG_ONLY=0
```

4. Build lại image reader (vì `NEXT_PUBLIC_SITE_URL`):

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com docker compose build story-reader
docker compose up -d story-reader
```

Resend lỗi → app tự thử SMTP nếu đã cấu hình `SMTP_*`.

### D. Weekly digest cron (Docker)

1. Tạo token ngẫu nhiên (ví dụ):

```bash
openssl rand -base64 32
```

2. Thêm vào root `.env`:

```env
MAIL_DIGEST_CRON_TOKEN=<token-vừa-tạo>
EMAIL_DIGEST_INTERVAL_SECONDS=604800
```

3. Bật service:

```bash
docker compose up -d reader-email-digest
```

Cron gọi `POST /api/internal/email/weekly-digest` với header `Authorization: Bearer <token>`.

**Lưu ý:** User phải **đã verify email** và **bật toggle** trong Động phủ mới nhận digest.

---

## 4. Database migrations

Chạy một lần (nếu chưa):

```bash
cd /path/to/BetterBox-TTS
python story_db/apply_migrations.py
```

Hoặc qua Docker: service `story-db-migrate` khi `docker compose up`.

Migrations liên quan:

- `031_reader_users_email_lower_unique.sql` — unique email không phân biệt hoa thường
- `032_reader_email.sql` — verify tokens, prefs, throttle
- `033_reader_email_hardening.sql` — digest claim, hash unsubscribe

**Gotcha:** `apply_migrations.py` tách SQL theo `;` — comment trong file `031` có thể gây lỗi. Nếu fail, chạy tay:

```bash
psql "$STORY_DATABASE_URL" -f story_db/migrations/031_reader_users_email_lower_unique.sql
psql "$STORY_DATABASE_URL" -f story_db/migrations/032_reader_email.sql
psql "$STORY_DATABASE_URL" -f story_db/migrations/033_reader_email_hardening.sql
```

---

## 5. Luồng mail & điều kiện

| Luồng | Cần config gì | Điều kiện user |
|--------|----------------|----------------|
| Signup → verify email | Transport + `MAIL_FROM` + `NEXT_PUBLIC_SITE_URL` | Email bắt buộc khi nhập môn |
| Gửi lại verify (Động phủ) | Giống trên | Đã login, chưa verify |
| Quên mật khẩu | Giống trên | Email **đã verify** |
| Reset mật khẩu | Link trong mail (`/reset-password?token=`) | Token 1h, one-time |
| Bản tin tuần | + `MAIL_DIGEST_CRON_TOKEN` + `reader-email-digest` | Verified + bật prefs |

**Soft verify:** chưa verify vẫn đọc truyện / login; chỉ chặn forgot-password và opt-in digest.

---

## 6. Checklist trước khi lên production

- [ ] `NEXT_PUBLIC_SITE_URL` = URL HTTPS thật (rebuild Docker image)
- [ ] `RESEND_API_KEY` + domain DNS verified trên Resend
- [ ] `MAIL_FROM` dùng domain đã verify
- [ ] `MAIL_DIGEST_CRON_TOKEN` set (random, không commit)
- [ ] `reader-email-digest` service chạy (nếu cần digest)
- [ ] Migrations 031–033 đã apply
- [ ] Test: signup → nhận mail verify → click link → Động phủ hiện “đã xác thực”
- [ ] Test: forgot password (sau verify)
- [ ] (Tuỳ chọn) `READER_SIGNUP_DISABLED=1` nếu chỉ admin tạo user

---

## 7. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp |
|-------------|-------------------------|
| Signup OK nhưng không có mail | Không có Resend/SMTP và `MAIL_LOG_ONLY` không bật → check log `[mail] No transport configured` |
| Link trong mail sai host | `NEXT_PUBLIC_SITE_URL` sai hoặc chưa rebuild Docker |
| Resend reject | Domain chưa verify / `MAIL_FROM` không khớp domain |
| Forgot password không gửi | Email chưa verify (by design) hoặc throttle — đợi 1 phút |
| Digest không chạy | `MAIL_DIGEST_CRON_TOKEN` trống hoặc service `reader-email-digest` chưa up |
| Digest 401 | Token cron không khớp giữa `.env` và request |

---

## 8. Tham chiếu code

| Thành phần | Path |
|------------|------|
| Transport | `lib/mail/transport.ts` |
| Env helpers | `lib/mail/config.ts` |
| Templates | `emails/*.tsx` |
| Weekly job | `lib/mail/weekly-digest.ts` |
| Cron script | `../docker/scripts/run-email-digest.sh` |
| Env mẫu reader | `.env.example` |
| Env mẫu Docker | `../docker/env.example` |

---

*Cập nhật: 2026-07-16 — theo implement email verify / reset / weekly digest.*
