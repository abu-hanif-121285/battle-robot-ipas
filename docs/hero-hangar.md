# Hero Hangar — Robot Legends

Halaman `/` dan `/heroes` menampilkan koleksi 10 hero. Menu asli tetap tersedia di `/lobby`.

## Penggunaan

- Filter role atau ketik nama hero pada pencarian. Tombol `/` memfokuskan pencarian.
- Pilih kartu untuk melihat artwork dan identitas unit. Pilihan disimpan ke LocalStorage.
- **Detail Hero** menampilkan statistik dan empat skill berdasarkan data pertempuran.
- **Preview 3D** menampilkan model tempur yang dapat diputar dengan drag atau tombol panah. Roda mouse mengatur zoom, dan tombol pose memperlihatkan artikulasi model.
- **Mainkan Hero** membuka pilihan tingkat kesulitan, kemudian **Masuk Arena** memulai Practice vs AI 5v5.

## Desain karakter

Palet dan perlengkapan mengikuti referensi: Titan biru/putih berperisai, Blaze merah dengan dua bilah plasma, Volt kuning dengan rail-cannon, Nexa putih-toska dengan proyektor medis, Photon ungu dengan orb, Goliath oranye dengan tinju berat, Frost biru-es berlapis kristal, Shadow gelap dengan katana violet, Aegis putih-emas berperisai, serta Thunder biru-emas dengan gauntlet listrik.

Artwork promosi dan model 3D adalah aset berbeda. Artwork WebP dipakai untuk kartu dan potret. Viewer WebGL dan arena memakai **factory model berartikulasi yang sama**, dengan warna hero yang konsisten di kedua tim. Cincin di kaki dan indikator HP membedakan tim.

## Struktur

- `src/game/visuals.ts`: satu sumber data palet, identitas unit, dan perlengkapan.
- `src/game/mecha.ts`: bagian mekanis dari loft, pelat bevel, piston, sendi, visor, dan perlengkapan. Geometri statis digabung per sendi dengan tiga material bersama.
- `src/components/hangar/`: antarmuka koleksi, viewer WebGL yang dimuat saat diperlukan, filter, detail, dan konfigurasi pertandingan.
- `public/images/heroes/`: artwork asli yang dibuat untuk proyek, disajikan dari server lokal.
- `public/fonts/`: Barlow dan Barlow Condensed (SIL Open Font License).

Jalankan `npx tsx scripts/hero-visuals.test.mts` untuk memeriksa seluruh potret, data perlengkapan, artikulasi, batas geometri dan jumlah batch untuk kedua tim.
