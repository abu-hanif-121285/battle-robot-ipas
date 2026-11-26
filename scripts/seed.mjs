// Seed: teacher account + 40 verified IPAS Kelas 6 questions + demo class.
// Run: node scripts/seed.mjs
import pg from "pg";
import crypto from "crypto";

const url = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const pool = new pg.Pool({ connectionString: url });

const scrypt = (password, salt) => crypto.scryptSync(password, salt, 64).toString("hex");
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${scrypt(password, salt)}`;
};

const Q = [
  // ── Sistem Pencernaan Manusia ────────────────────────────────────────────
  ["Sistem Pencernaan Manusia", "Organ yang mengubah makanan menjadi bubur halus dan mencernanya dengan asam lambung adalah…", "Usus halus", "Lambung", "Kerongkongan", "Hati", "B", "Lambung mengaduk makanan dengan otot dindingnya dan mencerna dengan asam lambung (HCl) serta enzim pepsin.", "mudah"],
  ["Sistem Pencernaan Manusia", "Tempat utama penyerapan sari-sari makanan ke dalam darah adalah…", "Usus besar", "Lambung", "Usus halus", "Rektum", "C", "Usus halus (khususnya jejunum dan ileum) memiliki vili/jonjot yang memperluas permukaan penyerapan.", "mudah"],
  ["Sistem Pencernaan Manusia", "Enzim ptialin dalam air liur berfungsi mencerna…", "Protein menjadi pepton", "Lemak menjadi asam lemak", "Karbohidrat (amilum) menjadi maltosa", "Vitamin menjadi energi", "C", "Ptialin/saliva amylase memecah amilum (pati) menjadi gula sederhana maltosa di dalam mulut.", "sedang"],
  ["Sistem Pencernaan Manusia", "Organ yang menghasilkan empedu untuk mengemulsikan lemak adalah…", "Kantong empedu", "Pankreas", "Hati", "Lambung", "C", "Hati (liver) memproduksi empedu; kantong empedu hanya menyimpannya. Empedu memecah lemak menjadi butiran kecil.", "sedang"],
  ["Sistem Pencernaan Manusia", "Gerakan mendorong makanan di sepanjang kerongkongan disebut gerakan…", "Peristaltik", "Segmentasi", "Kontraksi sadar", "Difusi", "A", "Peristaltik adalah gelombang kontraksi otot polos yang mendorong makanan dari kerongkongan hingga usus.", "mudah"],
  ["Sistem Pencernaan Manusia", "Sisa air dan mineral dari sisa makanan diserap kembali di…", "Usus halus", "Usus besar", "Lambung", "Kerongkongan", "B", "Usus besar menyerap air dan mineral; sisanya dipadatkan menjadi feses sebelum dikeluarkan.", "mudah"],
  ["Sistem Pencernaan Manusia", "Urutan saluran pencernaan manusia yang benar adalah…", "Mulut → lambung → kerongkongan → usus → anus", "Mulut → kerongkongan → lambung → usus halus → usus besar → rektum → anus", "Mulut → usus → lambung → kerongkongan → anus", "Mulut → kerongkongan → usus halus → lambung → anus", "B", "Makanan dikunyah di mulut, lewat kerongkongan (faring–esofagus) ke lambung, lalu usus halus, usus besar, rektum, dan anus.", "sedang"],
  ["Sistem Pencernaan Manusia", "Enzim pepsin di lambung berfungsi memecah…", "Karbohidrat menjadi glukosa", "Protein menjadi pepton", "Lemak menjadi gliserol", "Vitamin C menjadi energi", "B", "Pepsin (diaktifkan oleh HCl dari pepsinogen) menghidrolisis protein menjadi peptida/pepton.", "sulit"],
  ["Sistem Pencernaan Manusia", "Fungsi gigi geraham (molar) dalam proses pencernaan adalah…", "Memotong makanan", "Mengoyak makanan", "Mengunyah dan menghancurkan makanan", "Merobek daging", "C", "Geraham memiliki permukaan lebar bergerigi untuk menghancurkan makanan menjadi lembut.", "mudah"],
  ["Sistem Pencernaan Manusia", "Makanan sebaiknya dikunyah hingga lembut karena…", "Agar tidak tersedak saja", "Memperluas permukaan makanan sehingga enzim pencernaan bekerja lebih efektif", "Agar cepat sampai ke usus", "Agar nutrisi hilang lebih sedikit", "B", "Pengunyahan memperbesar luas permukaan makanan sehingga enzim dapat mencerna lebih cepat dan sempurna.", "sedang"],
  // ── Sistem Pernapasan Manusia ────────────────────────────────────────────
  ["Sistem Pernapasan Manusia", "Tempat terjadinya pertukaran oksigen dan karbon dioksida adalah…", "Bronkus", "Trakea", "Alveolus", "Laring", "C", "Alveolus adalah kantong udara kecil di ujung bronkiolus; dindingnya sangat tipis dan dikelilingi pembuluh kapiler.", "mudah"],
  ["Sistem Pernapasan Manusia", "Saat menarik napas (inspirasi), diafragma…", "Mendatar dan turun ke bawah", "Melengkung ke atas", "Diam tanpa bergerak", "Bergetar cepat", "A", "Diafragma berkontraksi menjadi datar sehingga rongga dada membesar dan udara masuk ke paru-paru.", "sedang"],
  ["Sistem Pernapasan Manusia", "Saluran yang menghubungkan laring (tenggorokan) dengan paru-paru adalah…", "Kerongkongan", "Trakea (batang tenggorokan)", "Faring", "Bronkiolus", "B", "Trakea adalah pipa udara yang bercabang menjadi bronkus kiri dan kanan menuju paru-paru.", "mudah"],
  ["Sistem Pernapasan Manusia", "Gas yang dikeluarkan tubuh saat bernapas adalah…", "Oksigen", "Nitrogen", "Karbon dioksida dan uap air", "Hidrogen", "C", "Udara ekspirasi mengandung CO2 dan uap air hasil metabolisme seluler.", "mudah"],
  ["Sistem Pernapasan Manusia", "Volume udara pernapasan biasa (udara tidal) orang dewasa sekitar…", "50 mL", "500 mL", "5.000 mL", "10.000 mL", "B", "Volume tidal ±500 mL adalah udara yang masuk-keluar dalam satu kali bernapas biasa.", "sedang"],
  ["Sistem Pernapasan Manusia", "Fungsi rambut hidung dan lendir adalah…", "Menghangatkan makanan", "Menyaring debu dan kuman serta melembapkan udara", "Menghasilkan suara", "Menyimpan oksigen", "B", "Rambut hidung menyaring partikel besar; lendir menangkap debu halus dan kuman sebelum udara masuk paru-paru.", "mudah"],
  ["Sistem Pernapasan Manusia", "Saat inspirasi (menarik napas), rongga dada…", "Menyempit", "Membesar karena diafragma mendatar dan tulang rusuk terangkat", "Tidak berubah", "Tertekan oleh hati", "B", "Kontraksi diafragma dan kontraksi otot antar tulang rusuk memperbesar volume rongga dada.", "sedang"],
  ["Sistem Pernapasan Manusia", "Peradangan pada bronkus yang menyebabkan batuk berdahak disebut…", "Asma", "Bronkitis", "Pneumonia", "Tuberkulosis", "B", "Bronkitis adalah inflamasi pada dinding bronkus, umumnya akibat infeksi virus/bakteri atau polusi.", "sedang"],
  ["Sistem Pernapasan Manusia", "Struktur yang menutup faring saat menelan agar makanan tidak masuk ke saluran napas adalah…", "Uvula", "Epiglotis", "Laring", "Trakea", "B", "Epiglotis adalah daun tulang rawan yang menutup laring (glotis) ketika menelan berlangsung.", "sulit"],
  ["Sistem Pernapasan Manusia", "Fungsi utama paru-paru adalah…", "Memompa darah ke seluruh tubuh", "Pertukaran gas oksigen dan karbon dioksida", "Mencerna makanan", "Menyaring racun dari darah", "B", "Paru-paru adalah organ pernapasan tempat O2 diikat hemoglobin dan CO2 dilepas ke udara.", "mudah"],
  // ── Sistem Tata Surya ────────────────────────────────────────────────────
  ["Sistem Tata Surya", "Planet terdekat dengan Matahari adalah…", "Venus", "Bumi", "Merkurius", "Mars", "C", "Urutan planet dari Matahari: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, Neptunus.", "mudah"],
  ["Sistem Tata Surya", "Planet yang dijuluki Planet Merah adalah…", "Jupiter", "Mars", "Venus", "Merkurius", "B", "Mars tampak merah karena permukaannya kaya debu besi oksida (karat).", "mudah"],
  ["Sistem Tata Surya", "Gerakan Bumi mengelilingi Matahari disebut…", "Rotasi", "Revolusi", "Orbit bulan", "Presisi", "B", "Revolusi Bumi (±365,25 hari) mengelilingi Matahari menjadi dasar perhitungan satu tahun.", "mudah"],
  ["Sistem Tata Surya", "Pergantian siang dan malam disebabkan oleh…", "Revolusi Bumi", "Rotasi Bumi pada porosnya", "Rotasi Bulan", "Kecondongan orbit", "B", "Rotasi Bumi (±24 jam) membuat sisi yang menghadap Matahari mengalami siang.", "mudah"],
  ["Sistem Tata Surya", "Planet terbesar dalam tata surya adalah…", "Saturnus", "Bumi", "Jupiter", "Uranus", "C", "Jupiter adalah raksasa gas dengan diameter ±139.000 km, lebih dari 11 kali diameter Bumi.", "mudah"],
  ["Sistem Tata Surya", "Benda langit yang memancarkan cahayanya sendiri adalah…", "Bulan", "Planet", "Komet", "Matahari (bintang)", "D", "Bintang adalah bola gas pijar yang membangkitkan energi melalui fusi nuklir; Matahari adalah bintang terdekat kita.", "mudah"],
  ["Sistem Tata Surya", "Peristiwa yang terjadi saat Bulan berada di antara Bumi dan Matahari adalah…", "Gerhana Matahari", "Gerhana Bulan", "Supermoon", "Hujan meteor", "A", "Gerhana Matahari terjadi ketika Bulan menghalangi cahaya Matahari sehingga bayang-bayang Bulan jatuh ke Bumi.", "sedang"],
  ["Sistem Tata Surya", "Planet yang terkenal memiliki cincin besar dari es dan batuan adalah…", "Jupiter", "Saturnus", "Uranus", "Neptunus", "B", "Saturnus memiliki sistem cincin paling spektakuler yang tersusun dari miliaran bongkahan es.", "mudah"],
  ["Sistem Tata Surya", "Revolusi Bumi menyebabkan…", "Siang dan malam", "Pergantian musim", "Pasang surut air laut", "Angin muson", "B", "Karena sumbu Bumi miring ±23,5°, revolusi mengelilingi Matahari menyebabkan pergantian musim.", "sedang"],
  ["Sistem Tata Surya", "Planet tempat tinggal makhluk hidup adalah…", "Mars", "Venus", "Bumi", "Jupiter", "C", "Bumi memiliki air cair, atmosfer yang tepat, dan jarak ideal dari Matahari (zona layak huni).", "mudah"],
  // ── Jejak Sang Pahlawan ──────────────────────────────────────────────────
  ["Jejak Sang Pahlawan", "Teks Proklamasi Kemerdekaan Indonesia dibacakan oleh…", "Mohammad Hatta", "Sutan Syahrir", "Ir. Soekarno", "Ahmad Soebardjo", "C", "Ir. Soekarno membacakan Proklamasi pada 17 Agustus 1945 di Jalan Pegangsaan Timur 56, Jakarta.", "mudah"],
  ["Jejak Sang Pahlawan", "Hari lahirnya Pancasila diperingati setiap tanggal…", "17 Agustus", "1 Juni", "28 Oktober", "10 November", "B", "Pada 1 Juni 1945 Ir. Soekarno menyampaikan pidato tentang dasar negara dalam sidang BPUPKI.", "sedang"],
  ["Jejak Sang Pahlawan", "Tokoh yang menjahit bendera Sang Saka Merah Putih adalah…", "R.A. Kartini", "Fatmawati", "Cut Nyak Dien", "Maria Walanda Maramis", "B", "Fatmawati (istri Soekarno) menjahit bendera pertama yang dikibarkan saat Proklamasi 17 Agustus 1945.", "sedang"],
  ["Jejak Sang Pahlawan", "Pahlawan perempuan asal Aceh yang memimpin perlawanan melawan Belanda adalah…", "R.A. Kartini", "Fatmawati", "Cut Nyak Dien", "Dewi Sartika", "C", "Cut Nyak Dien memimpin gerilya Perang Aceh bersama Teuku Umar melawan penjajahan Belanda.", "mudah"],
  ["Jejak Sang Pahlawan", "Kapitan Pattimura adalah pahlawan nasional dari daerah…", "Maluku (Pulau Saparua)", "Jawa Tengah", "Sumatra Utara", "Bali", "A", "Thomas Matulessy (Pattimura) memimpin perlawanan rakyat Maluku terhadap Belanda pada 1817.", "sedang"],
  ["Jejak Sang Pahlawan", "Pangeran Diponegoro memimpin perang melawan Belanda di…", "Maluku", "Aceh", "Yogyakarta / Jawa Tengah", "Sulawesi Selatan", "C", "Perang Diponegoro (1825–1830) adalah perang terbesar melawan Belanda di Pulau Jawa abad ke-19.", "mudah"],
  ["Jejak Sang Pahlawan", "Sumpah Pemuda 28 Oktober 1928 berisi ikrar…", "Satu tanah air, satu bangsa, satu bahasa: Indonesia", "Satu agama, satu bangsa, satu negara", "Merdeka atau mati", "Pancasila sebagai dasar negara", "A", "Kongres Pemuda II menghasilkan ikrar satu tanah air, satu bangsa, dan satu bahasa Indonesia.", "sedang"],
  ["Jejak Sang Pahlawan", "R.A. Kartini dikenal sebagai pejuang…", "Kemerdekaan melalui perang", "Pendidikan dan emansipasi perempuan", "Buruh tani", "Perdagangan nasional", "B", "Kartini menulis 'Habis Gelap Terbitlah Terang' dan memperjuangkan pendidikan bagi perempuan.", "mudah"],
  ["Jejak Sang Pahlawan", "Pahlawan nasional dari Papua yang ikut merumuskan penggabungan Papua ke Indonesia adalah…", "Frans Kaisiepo", "Sisingamangaraja XII", "Teuku Umar", "Sultan Hasanuddin", "A", "Frans Kaisiepo adalah pahlawan nasional dari Biak, Papua, pejuang integrasi Papua ke NKRI.", "sulit"],
  ["Jejak Sang Pahlawan", "Tokoh perumus teks Proklamasi yang mendampingi Ir. Soekarno adalah…", "Sutan Syahrir", "Mohammad Hatta", "Tan Malaka", "Sjahrir Sutan Takdir Alisjahbana", "B", "Mohammad Hatta merumuskan naskah Proklamasi bersama Soekarno dan menandatanganinya.", "mudah"],
];

async function main() {
  const client = await pool.connect();
  try {
    console.log("🌱 Seeding Robot Legends database…");

    // ── users ──
    const teacherHash = hashPassword("guru123");
    const studentHash = hashPassword("siswa123");
    await client.query(
      `INSERT INTO users (username, password_hash, role, display_name, class_name)
       VALUES ($1, $2, 'teacher', 'Guru IPAS — Pak Wiyanto', NULL)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'teacher', display_name = EXCLUDED.display_name`,
      ["guru@robotlegends.id", teacherHash]
    );
    await client.query(
      `INSERT INTO users (username, password_hash, role, display_name, class_name)
       VALUES ($1, $2, 'student', 'RoboLearner', '6A — Melati')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      ["robolearner", studentHash]
    );

    // ── questions (only if bank is empty, keep teacher edits) ──
    const { rows } = await client.query("SELECT count(*)::int AS c FROM questions");
    if (rows[0].c === 0) {
      for (const [materi, pertanyaan, A, B, C, D, kunci, pembahasan, difficulty] of Q) {
        await client.query(
          `INSERT INTO questions (materi, pertanyaan, option_a, option_b, option_c, option_d, kunci, pembahasan, difficulty, demo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE)`,
          [materi, pertanyaan, A, B, C, D, kunci, pembahasan, difficulty]
        );
      }
      console.log(`   ✓ ${Q.length} soal IPAS Kelas 6 tersimpan (ditandai sebagai bank demo, bisa diedit guru).`);
    } else {
      console.log(`   • Bank soal sudah berisi ${rows[0].c} soal — tidak menimpa.`);
    }

    // ── demo class ──
    const cls = await client.query("SELECT id FROM classes WHERE name = $1", ["6A — Melati"]);
    if (cls.rows.length === 0) {
      const c = await client.query(
        `INSERT INTO classes (name, teacher_username) VALUES ($1, $2) RETURNING id`,
        ["6A — Melati", "guru@robotlegends.id"]
      );
      const classId = c.rows[0].id;
      const demoStudents = ["Aisyah Putri", "Bima Sakti", "Citra Kirana", "Dimas Prakoso", "Elsa Maharani", "Fajar Nugroho", "Gita Savitri", "Hafiz Ramadhan"];
      for (let i = 0; i < demoStudents.length; i++) {
        await client.query(
          `INSERT INTO students (class_id, nis, name) VALUES ($1, $2, $3)`,
          [classId, String(24001 + i), demoStudents[i]]
        );
      }
      console.log("   ✓ Kelas demo '6A — Melati' + 8 siswa tersimpan.");
    }

    // ── settings ──
    await client.query(
      `INSERT INTO settings (key, value) VALUES ('questions_per_match', '3') ON CONFLICT (key) DO NOTHING`
    );

    console.log("✅ Seed selesai. Akun guru: guru@robotlegends.id / guru123");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
