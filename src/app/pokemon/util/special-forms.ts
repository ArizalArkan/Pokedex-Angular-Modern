/**
 * Bentuk-bentuk khusus yang punya halaman galerinya sendiri.
 *
 * Semuanya dikenali dari POLA NAMA, dan semuanya sudah ikut terunduh lewat 19
 * request yang sama seperti daftar utama - endpoint /type ternyata memuat
 * bentuk khusus lengkap dengan slot type-nya. Nol request tambahan.
 *
 * Menambah jenis baru (misal bentuk regional Alola/Galar) cukup dengan
 * menambah satu entri di sini plus satu rute. Halaman, kartu, dan filternya
 * dipakai ulang apa adanya.
 */
export type SpecialFormKind = 'mega' | 'gmax';

export interface SpecialFormInfo {
  title: string;
  description: string;
  /** Ikon untuk menu samping. */
  icon: string;
  /** Pola nama di PokeAPI, misal "charizard-mega-x" atau "venusaur-gmax". */
  pattern: RegExp;
}

export const SPECIAL_FORMS: Record<SpecialFormKind, SpecialFormInfo> = {
  mega: {
    title: 'Mega Evolution',
    description:
      'Bentuk sementara yang diperkenalkan di Generasi VI. Type-nya sering berubah dari bentuk aslinya — Mega Charizard X jadi Fire/Dragon, padahal Charizard biasa Fire/Flying.',
    icon: '🔷',
    pattern: /-mega(-|$)/,
  },
  gmax: {
    title: 'Gigantamax',
    description:
      'Bentuk raksasa dari Generasi VIII. Hanya sebagian pokémon yang bisa, dan wujudnya berubah total — bukan sekadar membesar.',
    icon: '🔴',
    pattern: /-gmax$/,
  },
};

export const SPECIAL_FORM_KINDS = Object.keys(SPECIAL_FORMS) as SpecialFormKind[];
