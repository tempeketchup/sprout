SPESIFIKASI TEKNIS: Sprout

Tagline: Micro-tasking on-chain social app.
== IDENTITAS BARU ==

    Nama: Sprout

    Vibe: Fun, simple, minimalis, dan didominasi warna Greenish (Emerald/Mint).

    Konsep: Bukan lagi sekadar makanan, tapi platform sosial untuk tugas apa pun (tanya-jawab, tantangan desain, info cepat, atau sekadar tweet berbayar).

== STRUKTUR UI (3-COLUMN LAYOUT) ==

Aplikasi ini menggunakan tata letak tiga kolom yang efisien untuk navigasi cepat:

1. Navbar (Top/Floating)

   Feed/Timeline: Navigasi ke halaman utama.

   Create Post (+): Tombol mencolok untuk buat tantangan baru.

   Profile: Akses ke pengaturan akun dan binding media sosial.

2. Timeline Page (Halaman Utama)

Di bagian atas terdapat Search Bar untuk mencari konten atau riwayat post lama.

    Kolom Kiri (Post Stack): * Daftar header postingan (mirip inbox Gmail).

        Hanya menampilkan Judul + Status (Active/Closed) + Sisa Hadiah.

        Memudahkan pengguna untuk memantau banyak tantangan sekaligus tanpa scrolling jauh.

    Kolom Tengah (Main Feed/FYP): * Scroll vertikal seperti Twitter/X.

        Postingan terbaru muncul paling atas.

        Konten fleksibel: Bisa berupa teks saja (seperti tweet) atau dengan gambar.

        Setiap post punya tombol "Join/Reply".

    Kolom Kanan (Leaderboard):

        Top Earners: Daftar pengguna yang paling banyak memenangkan bounty.

        Metrik: Berdasarkan total token CNPY yang berhasil dikumpulkan dari kiriman yang disetujui.

== MODEL DATA (UPDATED) ==
TypeScript

Post {
id string
creator address
content string -- Teks utama (bisa panjang/pendek)
image_url string? -- Opsional (IPFS)
prize_total uint64
prize_left uint64
deadline int64
status string -- "active" | "closed"
}

User {
wallet_address string -- Primary Key (MetaMask)
twitter_handle string? -- Binding
discord_id string? -- Binding
total_earned uint64 -- Untuk Leaderboard
}

== FITUR PROFIL & BINDING ==

Halaman profil dirancang sebagai "Identitas Web3". Pengguna bisa menghubungkan:

    MetaMask: Wallet utama untuk menerima/mengunci hadiah.

    Twitter & Discord: Untuk verifikasi sosial (Social Proof), sehingga kreator tahu siapa yang mereka beri hadiah.

== ALUR PENGGUNA (SIMPLE FLOW) ==

    Search & Explore: Pengguna mencari topik di search bar. Hasil pencarian menampilkan postingan lama yang sudah closed (sebagai referensi) atau yang masih active.

    Engagement: Peserta membalas postingan di kolom tengah. Jika hanya butuh jawaban teks, mereka cukup mengetik. Jika butuh bukti gambar, mereka upload ke IPFS.

    Reward: Kreator melihat daftar jawaban di detail post, memilih yang terbaik, dan klik "Send Prize".

== TEKNOLOGI & TEMA VISUAL ==

    Frontend: Next.js 14 (App Router).

    Styling: Tailwind CSS.

    Palet Warna: * Primary: bg-emerald-500 (Fun Green).

        Background: bg-green-50 (Very light green/white vibe).

        Accent: text-forest-900 untuk teks yang kuat.

    Blockchain: Canopy Network (Go Template) untuk escrow token.

    Storage: IPFS (Pinata) khusus untuk post yang menyertakan gambar.
