/**
 * Ikon sebagai data path SVG, bukan emoji.
 *
 * Kenapa bukan emoji? Tiga alasan nyata:
 *  1. Bentuknya berbeda-beda di tiap sistem operasi — 🔷 di macOS tidak sama
 *     dengan di Windows atau Android, jadi desainmu tidak pernah konsisten.
 *  2. Emoji punya warna sendiri dan tidak bisa mengikuti warna teks, sehingga
 *     tidak bisa ikut berubah saat menu aktif atau disentuh kursor.
 *  3. Ukurannya mengikuti font, bukan kotak yang bisa kita atur presisi.
 *
 * Kenapa hanya string `d`, bukan komponen ikon? Karena satu elemen <path> bisa
 * memuat beberapa sub-path, jadi satu string sudah cukup untuk ikon apa pun.
 * Dirender lewat [attr.d] — bukan innerHTML — jadi tidak ada risiko injeksi.
 *
 * Gaya: garis (stroke) 24x24, mengikuti konvensi Lucide.
 */
export const ICONS = {
  pokeball:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M2 12h6 M16 12h6 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  gem: 'M6 3h12l4 6-10 13L2 9Z M11 3 8 9l4 13 4-13-3-6 M2 9h20',
  expand:
    'M8 3H5a2 2 0 0 0-2 2v3 M21 8V5a2 2 0 0 0-2-2h-3 M16 21h3a2 2 0 0 0 2-2v-3 M3 16v3a2 2 0 0 0 2 2h3',
  scale:
    'M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z M7 21h10 M12 3v18 M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  close: 'M18 6 6 18 M6 6l12 12',
} as const;
