# Worklog — Multi-Agent Shared Log

---
Task ID: 1
Agent: Main Agent (Z.ai)
Task: Eksekusi lengkap Smart Pemira (E-Voting Poltek CWE) berdasarkan PRD.md + DESIGN.md + PROMPT.md yang diunggah user ke /home/z/my-project/upload/

Work Log:
- Memuat skill fullstack-dev; inisialisasi environment (init-fullstack.sh) — Next.js 16 App Router + Tailwind 4 + Prisma 6 (SQLite) + shadcn/ui.
- Membaca ketiga file spesifikasi dari /home/z/my-project/upload/ (PRD.md, DESIGN.md, PROMPT.md).
- Merancang skema Prisma Zero-Knowledge: StudyProgram, Tps (chainSalt + lastChainHash), Voter (pendingTokenHash, tanpa FK ke ballot), VotingToken (token_hash SHA-256, TTL, TANPA voter_id — Hukum 1), BallotBox (UUID acak, timestamp jitter, ballotHash berantai — Hukum 1 & 2), Candidate, AuditLog (append-only), ElectionIncident, ElectionSetting (votingOpen, emergencyFreeze, plenoUnlocked — Hukum 5). db:push sukses.
- Lib kriptografi: token-generator (CSPRNG 6 char, alfabet tanpa 0/O/1/I, hash SHA-256, timing-safe compare), ballot-hash-chain (SHA-256 chaining per TPS + verifier), time-jitter (±60s).
- Service: ballot-service (submitBallots transaksi atomik 6 langkah sesuai Hukum 2; issueToken dengan pencabutan token lama FR-04.3; expireStaleTokens), tally-service (Hukum 3: calon tunggal >50% TERPILIH / ≤50% MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA; 7.3: STATUS_SERI_PENDING_PLENO; atribusi kotak kosong ke prodi kandidat tunggal).
- Seed: 4 prodi berwarna (BKS terracotta, TPHP ochre, LOGISTIK cobalt, TRPL plum), TPS 01, 13 kandidat (3 Presma, 2 DPM, BKS calon tunggal + entitas Kotak Kosong, 2+2+2 Hima lain), 44 pemilih, 27 suara pra-cast berantai hash, audit log awal, tiket sengketa contoh.
- 12 API routes: /api/public/portal, /api/ppur/voters, /api/ppur/issue-token, /api/kiosk/validate (server-side prodi filter — Hukum 4), /api/kiosk/submit, /api/tally (423 Locked — Hukum 5), /api/tally/unlock (Pleno Unlocking FR-06.3), /api/monitor/live, /api/monitor/incidents, /api/admin/overview, /api/admin/settings (Emergency Freeze FR-01.2), /api/admin/dpt-import (anti-duplikat FR-02.2).
- Design system di globals.css: token Neo-Editorial Botanical lengkap (--sp-*, ballot colors, tactile shadows), override token shadcn ke palet hangat (#F6F4EE kanvas, #1B7F4E primary), .theme-pleno-dark (Obsidian Forest) MENIMPA SEMUA token termasuk --sp-*; utilitas .tactile-card/.tactile-btn/.bento-card/.nice-scroll/pulse/anim; print styles Berita Acara.
- Layout: font Bricolage Grotesque (--font-display) + Geist + Geist Mono, metadata Smart Pemira, lang="id".
- Frontend SPA (src/app/page.tsx + 5 komponen): shell navigasi 5 terminal (light/dark adaptif), PublicPortal (hero + kartu kandidat per kategori berwarna), KioskTerminal (gate 6 kotak + keypad virtual + keyboard fisik, wizard 3 surat suara dengan banner warna dinamis, skenario 50:50 calon tunggal vs kotak kosong, review + ubah pilihan, submit terkunci, sukses + auto-reset 3 detik, countdown TTL terracotta <2 menit), PpurDesk (split bento 60:40, search autofocus, pill tabs, slip token 48px mono marigold + countdown + cetak), KpumDashboard (KPI, toggle voting/freeze, Pleno Unlock dengan confirm(), import DPT CSV, tabel DPT, Berita Acara Model C-KWE + panel TTD + pseudo-QR seal + print), PanwasluMonitor (dark, 4 KPI bento, turnout bar, chart kedatangan/jam, audit log feed, vault 423 pre-unlock + hasil post-unlock, formulir sengketa).
- Debug: (1) icon lucide `Drop` tidak ada → diganti `Droplets`; (2) hash chain invalid karena jitter timestamp mengubah urutan createdAt vs urutan rantai → diberlakukan floor timestamp monotonic di ballot-service & seed; (3) `.theme-pleno-dark` tidak menimpa token --sp-* sehingga kartu putih di monitor gelap → token pleno variant ditambahkan + paksa recompile CSS.

Stage Summary:
- E2E API test (scripts/e2e-test.ts): 20/20 assertion LULUS — termasuk format token, server-side prodi filter (tidak ada kebocoran), skenario kotak kosong, single-use token ditolak (400/409), tally 423 sebelum pleno, hash chain valid 30 blok, outcome MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA (25% ≤ 50%) sesuai Pasal 9 ayat (4) UUD IKM.
- Verifikasi agent-browser: 16 screenshot, seluruh 5 modul dirender sempurna; alur lengkap PPUR→Kiosk→Review→Submit→Pleno Unlock→Tally→Berita Acara→Sengketa berfungsi; lint bersih; dev.log tanpa error runtime.
- Database di-reset ke kondisi demo segar (pemungutan aktif, 44 DPT, 9 sudah memilih, pleno terkunci).
- Artefak: prisma/schema.prisma, src/lib/{crypto,constants,db}, src/app/api/** (12 route), src/components/{kiosk,ppur,kpum,pleno,public-portal}, src/app/{page,layout,globals.css}, scripts/{seed.ts,e2e-test.ts}.

---
Task ID: 2 (Resumed Session)
Agent: Main Agent (Z.ai)
Task: Melanjutkan eksekusi setelah sesi terputus ("lanjutkan") — verifikasi ulang seluruh sistem Smart Pemira pasca-restart sandbox.

Work Log:
- Muat ulang skill fullstack-dev; init-fullstack.sh berhasil (dev server restart otomatis).
- Baca ulang ketiga spesifikasi (PRD.md 454 baris, DESIGN.md 352 baris, PROMPT.md 121 baris) via split chunks.
- Audit kondisi file: seluruh artefak sesi sebelumnya UTUH (schema, 12 API routes, 5 komponen portal, libs kripto, seed, e2e test).
- Health check: GET / 200 (32ms), /api/public/portal OK (44 DPT, 9 voted), /api/tally 423 Locked, hash chain valid 27 blok, dev.log tanpa error.
- bun run lint: BERSIH tanpa warning/error.
- E2E re-run (scripts/e2e-test.ts): 22/22 assertion LULUS — token format tanpa char ambigu, server-side prodi filter (Hukum 4), skenario kotak kosong BKS (Hukum 3), transaksi atomik submit (Hukum 2), single-use token ditolak 409, tally 423 sebelum pleno (Hukum 5), Pleno Unlock → tally terbuka, outcome BKS MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA (50% ≤ 50%, Pasal 9 ayat 4 UUD IKM).
- Verifikasi Agent Browser end-to-end (14 screenshot verify-01..14): Portal Publik render Warm Oat Milk + Tropic Green; PPUR split 60:40 (pilih pemilih → TERBITKAN TOKEN → slip NNZQ3J mono 48px marigold, countdown 09:58, status DALAM ANTREAN); Kiosk (keypad virtual 36 tombol, masuk bilik, Surat Suara 1 Presma banner green + timer pill, Surat Suara 2 DPM banner jade, Surat Suara 3 Hima BKS banner terracotta + skenario calon tunggal 50:50 KOTAK KOSONG, review 3 kartu + Ubah Pilihan + callout Zero-Knowledge, submit, sukses + auto-reset + reminder celup tinta); KPUM (KPI live 44/10/1/30, status pills, Pleno Unlock via confirm dialog → PLENO TERBUKA, Berita Acara Model C-KWE + segel); Panwaslu dark Obsidian Forest (4 KPI bento: DPT 44, Turnout 22.7% progress bar, Token Aktif, Hash Chain VALID 30 blok + SHA-256 VERIFIED, grafik kedatangan/jam, kotak suara digital dengan badge PEMENANG_SEMENTARA & MANDAT → MUSMAH, audit log append-only berwarna). Console browser BERSIH, zero error.
- Reset database via bun scripts/seed.ts ke kondisi demo segar: votingOpen=true, plenoUnlocked=false, 44 DPT, 9 sudah memilih (20.5%), tally 423.

Stage Summary:
- Sistem Smart Pemira LENGKAP, TERVERIFIKASI penuh (API + browser), dan siap demo dalam kondisi awal yang bersih.
- Kelima Hukum Arsitektur PROMPT.md tervalidasi otomatis; seluruh FR kunci (FR-01.2, FR-04, FR-05, FR-06.3, FR-07, FR-08) berfungsi; design system Neo-Editorial Botanical + Tactile Neo-Brutalism + Pleno Dark terimplementasi sesuai DESIGN.md.

---
Task ID: 3
Agent: Main Agent (Z.ai)
Task: Implementasi RBAC penuh (PRD Bab 3 — Matriks Hak Akses) atas pertanyaan user "nah itu untuk RBAC nya gimana?"

Work Log:
- Diagnosa: implementasi awal = mode simulator terbuka (5 terminal tanpa login; API tanpa guard). Sesuai PRD, perlu RBAC 7 peran → diimplementasikan 5 peran operator: ITPO (Super Admin), KPUM, PPUR, PANWASLU, SAKSI (+ Pemilih via token kiosk, + Publik tanpa sesi).
- Schema: model Operator (username unique, passwordHash scrypt, role, fullName, tpsId terikat FR-04.1, isActive) + ElectionSetting.sessionSecret (HMAC). db push sukses.
- src/lib/server/auth.ts: scrypt N=16384 + salt, HMAC-SHA256 cookie httpOnly (TTL 8 jam shift), timingSafeEqual, getSession(), requireRole() yang mengembalikan 401 (UNAUTHENTICATED) / 403 (FORBIDDEN + peran yang dibutuhkan).
- API baru: POST /api/auth/login (audit OPERATOR_LOGIN + lastLoginAt), /api/auth/logout, GET /api/auth/me.
- Guard terpasang: /api/ppur/* → PPUR|ITPO; /api/admin/* → KPUM|ITPO; /api/monitor/live → PANWASLU|SAKSI|KPUM|ITPO; /api/monitor/incidents POST → PANWASLU|ITPO (GET semua peran pengawasan); /api/tally/unlock → KPUM SAJA (ITPO pun 403 — pemisahan kewenangan FR-06.3). Kiosk & Portal Publik tetap terbuka (kiosk = token pemilih, Hukum 1).
- Seed: 5 akun operator (itpo/itpo123, kpum/kpum123, ppur/ppur123, panwaslu/panwaslu123, saksi01/saksi123) + audit RBAC_PROVISIONED + sessionSecret acak per seed.
- Frontend: komponen LoginGate (Tactile Neo-Brutalism, chip peran yang diizinkan, matriks akun demo klik-untuk-isi, catatan pemisahan kewenangan; varian dark untuk Panwaslu); shell page.tsx kini sesi-aware — badge sesi + KELUAR di navbar, titik kunci kuning pada tab yang butuh login, gate per terminal, chip "SESI AKTIF" di header halaman.
- UI kewenangan: tombol Pleno Unlock disabled + peringatan merah bila sesi bukan KPUM; form sengketa Panwaslu dim + catatan pemantau bila sesi bukan PANWASLU/ITPO.
- Debug: Prisma client lama di-cache Next.js → db.operator undefined → fix: kill semua proses next + rm -rf .next + restart dev.sh. dev.log bersih setelahnya.
- E2E test diperluas (scripts/e2e-test.ts): 30/30 LULUS — 10 asersi RBAC (401 anonim, password salah 401, cross-role 403: KPUM→PPUR module, ITPO→unlock, SAKSI→incidents; SAKSI→monitor 200; login semua peran OK) + 20 asersi alur inti (semua lulus).
- Browser verification (6 screenshot rbac-01..06): gerbang login PPUR render sempurna; login PPUR → badge sesi + desk; PPUR buka Dashboard KPUM → digate; login KPUM → unlock button aktif; Panwaslu via KPUM → form insiden read-only + audit log mencatat OPERATOR_LOGIN/RBAC_PROVISIONED; logout → badge MODE PUBLIK; Kiosk tetap dapat diakses tanpa sesi. Console bersih.
- Reset demo state: voting aktif, pleno terkunci, 44 DPT, 9 sudah memilih, 5 akun operator siap.

Stage Summary:
- RBAC 5 peran + matriks kewenangan terimplementasi penuh di API (401/403) dan UI (gate, badge, disable per kewenangan); kredensial demo dipublikasikan di kartu login untuk kemudahan demo.

---
Task ID: 3 (Login-First RBAC Restructure)
Agent: main (Z.ai)
Task: Permintaan user — "yang pertama login page dulu, baru bisa akses isinya sesuai RBAC"

Work Log:
- Membuat src/components/auth/login-screen.tsx: layar login full-screen sebagai gerbang tunggal (panel brand espresso + panel form oat milk, peta terminal & kewenangan, matriks akun demo klik-untuk-isi, chip keamanan)
- Merestrukturasi src/app/page.tsx: alur login-first — belum login → LoginScreen; sudah login → auto-landing ke terminal sesuai peran (ROLE_HOME) + navigasi difilter per peran (MODULE_ROLES); hapus LoginGate per-modul, ganti kartu AccessDenied 403
- Menghapus src/components/auth/login-gate.tsx (tidak lagi dipakai)
- Lint bersih; E2E suite 22 asersi lulus semua
- Verifikasi browser 9 screenshot: login page, landing KPUM/PPUR/SAKSI/PANWASLU/ITPO, filter tab per peran, logout kembali ke login
- Verifikasi server-side via curl: 401 tanpa sesi (ppur/voters, admin/overview, ppur/issue-token), 403 SAKSI→admin/settings, 403 ITPO→tally/unlock (Pleno Unlock khusus KPUM, FR-06.3)
- Reset DB ke kondisi demo segar (44 DPT, 9 voted, pleno terkunci)

Stage Summary:
- Sistem kini berpola LOGIN-FIRST: / selalu dimulai dari halaman login; konten hanya muncul setelah sesi operator valid
- Routing RBAC: ITPO→Publik(5 tab), KPUM→Dashboard KPUM, PPUR→Meja PPUR, PANWASLU/SAKSI→Monitor Panwaslu; tab modul lain disembunyikan bila tak berwenang
- Dua lapis penegakan: UI filter navigasi + requireRole server-side (401/403) tetap dijaga

---
Task ID: 4 (Fitur Ganti Password + Log Aktivitas Login)
Agent: main (Z.ai)
Task: Permintaan user — tambah fitur ganti password dan log aktivitas login

Work Log:
- API POST /api/auth/change-password: requireRole semua peran, verifikasi password lama (scrypt timing-safe), validasi min 8 karakter + konfirmasi + tolak sandi sama, hash baru, audit OPERATOR_PASSWORD_CHANGED / OPERATOR_PASSWORD_CHANGE_FAILED, sesi diakhiri (cookie dibersihkan → wajib login ulang)
- API GET /api/auth/login-log: requireRole PANWASLU/ITPO/KPUM (SAKSI 403), 60 event otentikasi terbaru dari AuditLog
- Route login: log OPERATOR_LOGIN_FAILED (username dicoba + IP) saat kredensial salah; detail OPERATOR_LOGIN kini memuat IP asal
- Route logout: log OPERATOR_LOGOUT sebelum sesi dihapus
- Komponen ChangePasswordDialog: form 3 kolom dengan validasi live, state sukses → kembali ke halaman login; dipasang di navbar (tombol SANDI) untuk semua peran
- PanwasluMonitor: kartu "Log Aktivitas Login — Operator" (badge berwarna: LOGIN OK/HIJAU, LOGIN GAGAL/MERAH, LOGOUT/ABU, SANDI DIGANTI/KUNING, SANDI DITOLAK/MERAH) hanya untuk PANWASLU/ITPO/KPUM; usePolling diperluas opsi enabled
- Verifikasi curl: 401 tanpa sesi, 403 SAKSI, 400 sandi lama salah/pendek, 200 ganti sukses → sesi mati → sandi lama ditolak → sandi baru diterima
- Verifikasi browser: kartu log tampil utk PANWASLU, dialog SANDI berfungsi, auto-logout ke login page, login sandi baru OK, SAKSI tidak melihat kartu
- E2E suite lulus penuh (setelah seed memulihkan password default); DB di-reset ke demo segar

Stage Summary:
- Fitur ganti password aman: verifikasi sandi lama + audit + terminasi sesi otomatis
- Log aktivitas login append-only dapat diaudit Panwaslu/ITPO/KPUM; SAKSI diblokir 403 (server) dan kartu disembunyikan (UI)
- Kredensial demo kembali ke default seed (ppur123, panwaslu123, dst.)

---
Task ID: 5 (Eksekusi 6 Rekomendasi Upgrade: #1 #2 #6 #8 #9 #10)
Agent: main (Z.ai)
Task: Eksekusi rekomendasi prioritas pilihan user — rate limiting, manajemen operator, digital receipt, realtime SSE, BA bertanda tangan + QR, load test/monitoring/CI

Work Log:
- #1 Rate limiting: lib/server/rate-limit.ts (login throttle 5 gagal → lock 15 mnt eskalatif ×2 maks 24 jam per username+IP; fixed-window umum); diterapkan di login/kiosk validate/kiosk submit/change-password/receipt/verify-ba + audit OPERATOR_ACCOUNT_LOCKED + header Retry-After; security headers di next.config (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS)
- #2 Manajemen operator: kolom Operator.mustChangePassword (db push); API GET/POST /api/admin/operators + PATCH /[id] + POST /[id]/reset-password (ITPO-only, guard anti-lockout akun sendiri, sandi sementara tampil sekali); UI tab "Manajemen Operator" (khusus ITPO) dengan tabel + dialog buat akun + dialog sandi sementara; login membawa flag mustChangePassword → dialog ganti sandi mode wajib (tak bisa ditutup) terbuka otomatis
- #6 Digital receipt: lib/crypto/receipt.ts (12 hex pertama ballotHash → XXXX-XXXX-XXXX); submitBallots mengembalikan receiptCode + tpsName; API GET /api/public/receipt (prefix search hash, blok seq, rate-limited); kiosk layar sukses menampilkan kartu struk; portal publik kartu "Cek Struk Suara"
- #8 Realtime SSE: lib/server/bus.ts (EventEmitter global); API /api/realtime/monitor (snapshot monitor+tally+loginLog dikirim saat berubah tiap 4 dtk, event auth di-push seketika, keepalive 20 dtk, cleanup abort); hook use-sse.ts dengan reconnect; monitor-service.ts payload builder bersama; PanwasluMonitor: badge REALTIME SSE/POLLING + banner alarm "N percobaan login gagal 5 mnt" + kartu log login kini realtime; polling tinggal fallback
- #9 Berita Acara: API GET /api/kpum/berita-acara (signature SHA-256 deterministik atas kanonikal rekap + chain head, signatories KPUM+Panwaslu); API publik /api/public/verify-ba (hitung ulang + banding); halaman publik /verify?sig=…; tab BA KPUM: QR asli (lib qrcode) encode URL verifikasi + blok tanda tangan + tombol salin tautan; portal publik kartu verifikasi BA
- #10 Load test + monitoring + CI: API /api/health (db counts, uptime, mem); scripts/load-test.ts (4 fase, ringkasan p50/p95/p99); temuan nyata: SQLite lock kontensi saat tulis paralel → fase alur suara diserialisasi (catatan → Postgres #4); .github/workflows/ci.yml (bun, prisma, seed, lint, tsc, health-wait, 2 suite E2E)
- Verifikasi: lint bersih; E2E fitur baru scripts/e2e-features-test.ts 37/37 lulus; E2E lama 22 asersi tetap lulus (jalan sekali per seed — pemilih yang sudah memilih tak bisa terbit token ulang); load test 4/4 fase lulus (400 baca publik p50 267ms; 90 login; 12 alur suara; 36 verifikasi struk); browser 10 screenshot: panel operator, dialog buat akun, kartu verifikasi portal, struk terverifikasi, SSE badge + kartu log realtime, alert login gagal seketika, QR BA + TTD elektronik, halaman /verify SAH, layar sukses kiosk dengan struk 9FC3-D6B5-927C
- Bug diperbaiki saat verifikasi: duplikasi const data di PanwasluMonitor; akses logData.data (bentuk merged SSE/polling beda); Retry-After hilang di cabang justLocked; filter voter E2E (tab→filter=BELUM_MEMILIH); idempotensi akun uji e2e_ppur
- Database di-reset ke demo segar (44 DPT, 9 voted, pleno terkunci, password default)

Stage Summary:
- 6 rekomendasi terimplementasi penuh + terverifikasi berlapis (API E2E 37 asersi + E2E lama + load test + browser)
- Keamanan: brute force terhalang lockout eskalatif; siklus hidup akun lengkap di tangan ITPO; struk memberi E2E verifiability tanpa bocor identitas; BA anti-pemalsuan dengan verifikasi publik via QR; monitoring/CI siap
- Catatan desain: SSE dipilih utk realtime (1 origin, auth cookie, tanpa port baru); SQLite serial write → PostgreSQL tetap rekomendasi #4 utk produksi

---
Task ID: 6 (Fix Preview "Refused to Connect")
Agent: main (Z.ai)
Task: Laporan user — "kok gini sandboxnya?" (panel preview menampilkan refused to connect)

Work Log:
- Diagnosa: server hidup & HTTP 200, tapi response memuat X-Frame-Options: DENY (di luar dari Rekomendasi #1) → iframe lintas origin di panel preview chat ditolak browser
- next.config.ts: kebijakan frame kini sadar-lingkungan — dev/preview (NODE_ENV=development) TANPA header frame agar preview bisa embed; produksi (next build/start) X-Frame-Options: DENY + CSP frame-ancestors 'none' (lebih ketat dari sebelumnya)
- e2e-features-test.ts: asersi header diganti sadar-mode (produksi wajib DENY, preview wajib mengizinkan embed)
- Restart dev server; curl -I konfirmasi X-Frame-Options hilang di dev; health OK
- Verifikasi penuh: lint bersih; E2E inti lulus; reseed; E2E fitur 37/37 lulus (termasuk asersi frame baru); reseed demo segar (44 DPT, 9 voted, pleno terkunci, chain head fdfba1db…)

Stage Summary:
- Panel preview kini dapat menampilkan aplikasi; proteksi anti-clickjacking tetap aktif otomatis pada deployment produksi

---
Task ID: 7 (Pemira 100% Online — Portal Pemilih BYOD + Re-vote Estonia)
Agent: main (Z.ai)
Task: Diskusi desain dengan user → keputusan final → eksekusi penuh "Pemira Online"

Keputusan user (via AskUserQuestion):
- Model 100% online BYOD: mahasiswa milih dari HP sendiri via /pemilih, token dari pos bantuan PPUR (tanpa TPS fisik, kiosk dihapus)
- Hash chain per prodi (5 rantai virtual, bukan satu TPS)
- Re-vote model Estonia: suara terakhir menang + Kunci Suaraku (finalisasi sukarela)
- Urutan surat suara: DPM → BEM → HIMA
- DPT: NIM + Prodi (prodi = kunci filter surat suara HIMA)
- 5 prodi (koreksi user): TPTP/TPHP/MANLOG/BD/TRPL — TPTP menggantikan BKS (mewarisi Terracotta), BD warna baru Deep Teal #0F766E
- Demo: tiap prodi punya kandidat Hima; TPTP calon tunggal (Hukum 3 tetap terdemo)
- Skala riil 500–2000 → catatan PostgreSQL (#4) untuk produksi

Work Log:
- Schema: VotingToken +lockedAt/+revoteCount (status REVOKED), BallotBox +tokenId/+voteVersion; Tps direpurposasi jadi 5 rantai per prodi; db push sukses
- ballot-service: mesin re-vote (voteVersion = revoteCount+1, voter hanya disentuh di vote pertama), lockBallot (Kunci Suaraku), revokeTokenByCode + resetVoterRights (anti-paksaan lapis 3 via slip lama — tanpa jembatan identitas→token)
- tally-service: latest-ballot-wins (blok versi maks per token, REVOKED dikecualikan), integritas 5 rantai, atribusi kotak kosong HIMA PERSIS per prodi via rantai, urutan rekap DPM→BEM→HIMA, revoteStats
- monitor-service: integritas multi-rantai + revoteStats + chains list
- API: /api/pemilih/{validate,submit,lock} (kiosk dihapus), /api/ppur/revoke, struk publik + voteStatus AKTIF/DIGANTI/DICABUT, kanonikal BA bersama (lib/server/ba-canonical.ts: 5 head rantai + revote) dipakai BA KPUM & /verify
- Frontend: komponen pemilih/pemilih-portal.tsx (mobile-first, QR auto-isi ?token=, banner mode ganti suara, layar sukses + Kunci/Ganti, tanpa auto-reset), /pemilih page, PPUR desk = pos bantuan (QR di slip + kasus khusus cabut token), shell tanpa tab kiosk + footer link portal, monitor: strip 5 rantai + kartu re-vote, KPUM chains, portal publik urutan DPM→BEM + CTA /pemilih, /verify menampilkan 5 head + statistik re-vote
- Seed: 5 prodi, 44 pemilih ber-NIM (5 rantai), 15 kandidat, 9 pra-cast + 1 demo re-vote (TRPL v2), rantai per prodi jujur
- tsc src 0 error (bus.ts AuthEventType diperluas, CandidateView +category, ProdiInfo +colorName?); tsconfig exclude scripts+examples (skrip jalan via tsx)
- Verifikasi: smoke curl 10 langkah ✓; E2E inti dirombak → 46 asersi lulus (re-vote bukan 409, versi 2, lock 403, struk v1 DIGANTI/v2 AKTIF, latest-wins TRPL paslon2=0, 5 rantai valid, TPTP MANDAT_KEMBALI 33.33%); E2E fitur 37/37 lulus; browser 12 screenshot (portal mobile, slip QR, bilik DPM/BEM/HIMA, review, sukses v1, revote v2, terkunci final, monitor 5 rantai + re-vote stats); console bersih; lint bersih; DB di-reset demo segar

Stage Summary:
- Pemira kini 100% online sesuai visi user: pintu suara tunggal /pemilih dari device sendiri, 5 rantai hash per prodi, re-vote Estonia + 3 lapis anti-paksaan (kunci sukarela / override TPS dihapus → kunci + cabut-pulihkan), struk menampilkan status versi suara
- Hukum 1-5 tetap terjaga: token tetap tanpa identitas (tokenId = kredensial anonim), rantai append-only, pleno lock, calon tunggal 50:50

---
Task ID: 8 (Fitur Segel & Reset Pemira — Siklus Hidup Periode)
Agent: main (Z.ai)
Task: Permintaan user — "aku mau ada fitur untuk aku bisa lakukan lagi ulang pemiranya, karena setelah buka kotak suara itu udah permanen ga bisa pemira ulang lagi"

Work Log:
- Desain "SEGEL & RESET": append-only TIDAK dilanggar — kotak suara tidak dibuka balik; seluruh lembar periode lama DISEGEL ke arsip resmi lalu sistem membuka lembar baru dengan rantai hash genesis segar (analogi: arsip pemira tahun lalu dikunci, kotak baru utk periode berikutnya)
- Schema: model ElectionArchive (archiveCode ARS-YYYY-NNNN, periodLabel, mode, sealedBy, summaryJson/canonical/signature, snapshot auditLog+incidents+candidates+chainHeads, dptCount/votedCount/ballotCount); ElectionSetting +periodLabel/+periodStartedAt; db push sukses
- lib/db/reset-service.ts: getResetStatus (periode aktif, hitungan, 5 rantai+blok, daftar arsip), collectSealPayload (tally penuh + kanonikal BA C-KWE + tanda tangan SHA-256 — identik dgn BA publik), sealAndReset SATU TRANSAKSI ATOMIK: create arsip ⇔ deleteMany ballot/token ⇔ (DEMO: reset status voter | NEW_PERIOD: delete voter+candidate) ⇔ delete insiden+auditLog ⇔ re-genesis 5 rantai (chainSalt baru, head "") ⇔ setting lembar baru (votingOpen=false, pleno false, sessionSecret DIROTASI, periodLabel baru) ⇔ audit PERIOD_RESET
- Dua mode: DEMO = Gelombang Ulang (DPT & kandidat dipertahankan, status pemilih kembali BELUM_MEMILIH); NEW_PERIOD = Periode Baru Total (DPT+kandidat+sengketa dikosongkan, snapshot tersimpan di arsip utk referensi pemulihan)
- API ITPO-only: GET/POST /api/itpo/reset (guard berlapis: ITPO 403 utk lainnya → rate limit EKSEKUSI 5/10 mnt di akhir validasi → wajib plenoUnlocked else 409 PLENO_LOCKED → frasa "RESET PEMIRA" → sandi ITPO scrypt; semua percobaan gagal diaudit ELECTION_RESET_FAILED), POST /preview (pratinjau arsip diunduh SEBELUM eksekusi), GET /archives/[id] (unduhan attachment JSON)
- UI election-reset-panel.tsx di tab Manajemen Operator (ITPO): kartu Zona Administrasi (status periode, tahapan, isi lembar, 5 rantai, daftar arsip + tombol unduh), tombol disabled+penjelasan saat pleno terkunci; wizard 3 langkah: (1) mode radio + label periode baru (pre-fill otomatis) + catatan BA + unduh pratinjau, (2) daftar konsekuensi + ketik frasa + checkbox tanggung jawab, (3) sandi ITPO → SEGEL & RESET PERMANEN; layar sukses: kode arsip + unduh final + catatan sesi hangus; fix race revokeObjectURL (setTimeout 1.5s)
- Seed: electionArchive.deleteMany() ditambahkan; ElectionSetting membawa periodLabel "Pemira Poltek CWE 2026" + periodStartedAt
- Verifikasi: tsc bersih, lint bersih; E2E BARU scripts/e2e-reset-test.ts 46/46 LULUS (RBAC 401/403, validasi 400/403, PLENO_LOCKED 409, pratinjau kanonikal+signature, reset DEMO 200 ARS-2026-0001, rotasi sesi 401+relogin SEMUA peran, status lembar baru genesis kosong, unduhan arsip + hitung-ulang signature SHA-256 cocok, PERIOD_RESET di monitor Panwaslu, siklus ulang penuh: open voting→issue token→submit v1→rantai TPTP 3 blok, reset NEW_PERIOD ARS-2026-0002 dpt/candidate 0, 2 arsip utuh terbaca); E2E inti lulus; E2E fitur 37/37 (di seed segar); debug: rate-limit slot terpakai lintas run test (restart dev server sebelum run; limit memang benar utk produksi), helper api() baca text dulu, sesi hangus setiap reset → re-login di test
- Browser 4 screenshot: panel pleno-terkunci, wizard langkah 1 (mode+unduh pratinjau+checkmark), langkah 2 (frasa, LANJUT disabled sebelum valid), langkah 3 (sandi, tombol merah disabled); console bersih; DB di-reset demo segar

Stage Summary:
- Fitur "Segel & Reset Pemira" lengkap: pemira kini bisa diulang kapan pun SETELAH pleno tanpa melanggar append-only — arsip resmi bertanda tangan selalu dibuat ATOMIK bersama pembersihan, 5 rantai re-genesis, semua sesi lama hangus, semuanya teraudit
- Mode DEMO untuk simulasi ulang dgn data sama; mode NEW_PERIOD untuk siklus pemira sungguhan (DPT via Import, kandidat di-input ulang)

---
Task ID: 9 (Foto Kandidat AI + Struktur 2 Kandidat per Organisasi)
Agent: main (Z.ai)
Task: Permintaan user — "rapihin semua calon pemimpin, buat gambarnya (palsu), masing-masing organisasi 2 kandidat, tiap kandidat ada foto ketua & wakil ketua, khusus DPM: Ketua Umum, Ketua 1, Ketua 2"

Work Log:
- Schema Candidate: +secondViceName (Ketua 2 khusus DPM), +photoLeaderUrl/+photoViceUrl/+photoSecondViceUrl (foto per peran); db push sukses
- 30 foto AI palsu digenerate via z-ai-web-dev-sdk (scripts/generate-candidate-photos.ts, potret formal 864x1152 konsisten: batik/almamater/blazer, ±separuh hijab) → public/candidates/*.png; rate limit 429 ditangani backoff 20s×attempt + timeout wrapper 150s (proses background dibunuh sandbox → dijalankan foreground batch 3x, idempoten via skip file existing)
- Seed: DPM 2 kandidat × 3 peran (Ketua Umum/Ketua 1/Ketua 2), BEM 2 kandidat (Presma/Wakil Presma — sebelumnya 3 → dihapus no.3), HIMA 5 prodi × 2 kandidat (Ketua/Wakil); KOTAK KOSONG TPTP dihapus (semua org kini 2 kandidat — Hukum 3 tetap ada di kode, tak terdemo di seed); TPTP no.2 baru (Fajar Arya Wibowo + Putri Maharani Ayu); total 14 kandidat
- API: /pemilih/validate + /public/portal + /admin/overview mengirim secondViceName & 3 URL foto; validate kini juga mengirim category (bug fix: UI bilik tidak mengenali DPM → label salah)
- UI pemilih-portal: komponen MemberPhoto (potret 3:4 + lencana peran + nama), kartu bilik grid 3 kolom utk DPM / 2 kolom lainnya, avatar review pakai foto + baris Ketua 2; UI public-portal: CandidateCard menampilkan foto per peran; KPUM dashboard + nama Ketua 2
- Tally/reset-service: CandidateResult +secondViceName (rekap DPM lengkap); types.ts disinkronkan
- E2E inti dirombak: asersi calon tunggal TPTP diganti (2 kandidat per org, foto terisi, DPM bawa Ketua 2+foto); TPTP rekap 2 kandidat tanpa kotak kosong
- Verifikasi: E2E inti LULUS penuh (46 asersi termasuk foto & struktur baru); E2E fitur 37/37; lint bersih; tsc bersih; dev.log bersih
- Browser 10 screenshot (foto-01..14): portal publik DPM 3 foto + BEM 2 foto + HIMA 2 foto, bilik mobile & desktop (DPM 3 foto terbaca jelas di 390px), review 3 nama DPM, submit sukses struk 9194-A051-A42C; console bersih
- Bonus rapih: label login-screen "Kiosk Bilik Suara" → "Portal Pemilih Online (/pemilih)" (sisa nomenklatur era kiosk)
- DB di-reset ke demo segar: 14 kandidat (semua berfoto), 44 DPT, 9 voted, pleno terkunci, 1 demo re-vote

Stage Summary:
- Seluruh kandidat kini berfoto AI (30 foto, gaya potret formal konsisten), struktur 2 kandidat per organisasi, DPM memakai struktur 3 peran Ketua Umum/Ketua 1/Ketua 2 — tampil di portal publik, bilik suara, review, dashboard KPUM, dan rekap tally
- Skenario calon tunggal/Kotak Kosong tidak lagi ada di seed demo (logika Hukum 3 tetap utuh di kode bila sewaktu-waktu hanya 1 kandidat)

---
Task ID: 10 (Opsi SUARA KOSONG Universal — Semua Surat Suara)
Agent: main (Z.ai)
Task: Permintaan user — "di opsi terakhir semua calon ormawa itu dibuat suara kosong, yang artinya ga mau memilih satupun dari paslon yang ada, lalu sesuaikan lainnya"

Work Log:
- Desain: Suara Kosong = pilihan EKSPLISIT di posisi TERAKHIR setiap surat suara (DPM, BEM/PRESMA, HIMA prodi) — pemilih boleh tidak mendukung paslon manapun; tercatat via BallotBox.isEmptyBox=true + candidateId=null (repr lama "Kotak Kosong" HIMA digeneralisasi; TANPA perubahan schema)
- Semantik rekap: Suara Kosong adalah SUARA SAH — masuk totalValidVotes & denominator persentase; TIDAK mungkin jadi pemenang (pemenang & status seri hanya di antara kandidat riil); catatan otomatis di outcomeDetail bila Suara Kosong > kandidat teratas
- ballot-service: BallotSelections ketiga kategori kini string|null (null = Suara Kosong); validasi kandidat hanya utk pilihan non-null; entries dibangun dari null-check
- API submit: null diterima utk presma/dpm/hima (wajib eksplisit ada di payload — 400 bila undefined); validate: singleCandidateScenario/isEmptyBoxScenario DIHAPUS, HIMA difilter isEmptyBox:false
- tally-service: baris sintetis "Suara Kosong" (number 0, isEmptyBox) SELALU ditambahkan di AKHIR results tiap kategori; Hukum 3 & 7.3 dihitung hanya antar kandidat riil
- UI pemilih-portal: komponen SuaraKosongCard (border putus-putus netral #3F4743, ikon CircleSlash, badge ✓ PILIHAN ANDA) dirender setelah semua kartu paslon; wizard grid terpadu (hapus cabang calon tunggal); badge header "OPSI TERAKHIR: SUARA KOSONG"; review menampilkan "SUARA KOSONG — TIDAK MEMILIH PASLON MANAPUN"; submit map "EMPTY"→null utk ketiga kategori; cabang mati isEmptyBox di BallotCandidateCard dibersihkan
- Monitor Panwaslu: baris kosong label italic "Suara Kosong" (bukan "00 — …(Kotak Kosong)"); portal publik: kartu info "Hak Memilih Suara Kosong" (dashed); dashboard KPUM: catatan FR-03 diperbarui
- Seed: 3 demo suara kosong pra-cast — TPTP#1 (DPM kosong), TPHP#2 (BEM kosong), BD#2 (HIMA kosong); castVote menerima pick null per kategori; log ringkasan +suaraKosong
- E2E inti: §4b BARU (submit DPM=null via token TPHP) + asersi §11: posisi terakhir, DPM kosong=2, BEM=1, TPTP=1, BD=1, totalValid konsisten
- Verifikasi: tsc 0 error; lint bersih; E2E inti LULUS penuh (termasuk 6 asersi Suara Kosong); E2E fitur 37/37; E2E reset LULUS semua; browser 9 screenshot (bilik DPM+BEM+HIMA dgn kartu kosong, selected state, review kosong, sukses struk E193-018F-FF1D, monitor DPM 5/3/2-Kosong & BD Kosong 50%, kartu info publik); console bersih
- DB di-reset demo segar: 44 DPT, 9 voted, 30 blok (3 suara kosong), pleno terkunci, 1 demo re-vote

Stage Summary:
- Setiap surat suara (DPM/BEM/HIMA) kini punya opsi SUARA KOSONG resmi di posisi paling bawah — suara sah tercatat di rantai hash, dihitung dalam rekap Pleno, tidak bisa memenangkan pemilihan; seluruh alur (bilik → review → struk → monitor → BA kanonikal) konsisten dan tervalidasi penuh

---
Task ID: 11 (Monitor Panwaslu & Pleno — Samakan Tema Terang)
Agent: main (Z.ai)
Task: Permintaan user — "untuk page monitor panwaslu & pleno itu samain aja temanya dengan page lain, jangan gelap gtu, jelek banget trus ga konsisten juga"

Work Log:
- globals.css: blok token .theme-pleno-dark ("Obsidian Forest", ±50 baris) DIHAPUS total, termasuk override .theme-pleno-dark .bento-card & .nice-scroll + komentar pleno-tokens-v2 — kini seluruh app 1 tema (Neo-Editorial Botanical terang)
- page.tsx: flag dark: boolean pada MODULES dihapus; 14 conditional `current.dark ? … : …` (bg shell, header, tab nav, session badge, tombol SANDI/KELUAR, footer, AccessDenied) disederhanakan ke cabang terang; const current & prop dark AccessDenied dihapus
- panwaslu-monitor.tsx: ~60 hardcoded warna gelap dikonversi 1:1 ke palet botanical (mengikuti kosakata KPUM dashboard): F4F1EA→141E19, 9EB0A7→4A5851 (label kecil→7A8881), 64786F→7A8881, C9D4CE→4A5851, 1D2E27→EAE6DF, 0D1512/15221D→F6F4EE/putih, 263B33→D8D3C8, 39564A→C9C3B6, 28A769→1B7F4E, 163325→DCFCE7+0F5132, 2A1B18→FDE8E5+842029, 3A3113→FEF5D6+8A5200, F5C431→B45309 (ikon/aksen) & 8A5200 (teks), FF8A7A/E8B4AC→842029; container dark canvas diganti div polos (padding via main shell, konsisten modul lain); tombol kirim sengketa memakai gaya tactile (border ink + shadow 3px + hover translate); vault locked: dashed C9C3B6 + lingkaran FEF5D6 shadow tactile; bar Suara Kosong #7A8881
- Verifikasi: tsc 0 error; eslint . bersih; browser test login PANWASLU — monitor terang penuh (badge/KPI/rantai/grafik/log/sengketa), console & page errors nihil
- Uji Pleno Unlock sesungguhnya utk panel hasil terbuka: login KPUM → POST /api/tally/unlock (window.confirm di-auto-dismiss Playwright, jadi via fetch sesi) → screenshot hasil terbuka (DPM 77.8% pemenang sementara, PRESMA, HIMA TPTP/TPHP STATUS_SERI_PENDING_PLENO, baris Suara Kosong italic, PLENO UNLOCK badge amber) — semua konsisten tema terang
- DB di-restore demo segar via npx tsx scripts/seed.ts: 14 kandidat, 44 DPT, 30 blok, 3 suara kosong, 9 voted, pleno TERKUNCI kembali, 1 demo re-vote; screenshot final PANWASLU pada state segar dikonfirmasi
- Catatan: login-screen (panel kiri gelap) & loading splash adalah aksen branding split-panel, sengaja dipertahankan (user hanya komplain modul monitor); DESIGN.md Bab 3.2 (dark PLENO variant) kini usang secara desain — tidak diubah karena dokumen spesifikasi historis

Stage Summary:
- Monitor Panwaslu & Pleno kini memakai tema terang Neo-Editorial Botanical yang identik dengan seluruh modul lain — mode gelap dihapus total dari kode (globals.css, shell, monitor); tidak ada perubahan logika/logika data sama sekali (pure restyle), seluruh state demo segar terjaga
