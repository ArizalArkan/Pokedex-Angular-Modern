import { PokemonTypeName } from '../models/pokemon.model';

/**
 * Warna latar per type.
 *
 * Ini BUKAN warna type resmi Pokémon. Warna resmi itu terang (grass = #7AC74C),
 * dan teks putih di atasnya hanya punya rasio kontras ~2:1 — gagal WCAG AA
 * yang mensyaratkan minimal 4.5:1 untuk teks normal.
 *
 * Angka di bawah adalah warna resmi yang sudah digelapkan sampai setiap warna
 * mencapai minimal 4.6:1 terhadap teks putih. Itu sebabnya kartunya terlihat
 * kalem, bukan ngejreng.
 *
 * `Record<PokemonTypeName, string>` memaksa ke-18 type terisi.
 * Coba hapus satu baris dan jalankan `npm run build` — TypeScript akan menolak.
 */
export const TYPE_COLORS: Record<PokemonTypeName, string> = {
  normal: '#777757',
  fire: '#b05f24',
  water: '#4f73c0',
  electric: '#887218',
  grass: '#4f8131',
  ice: '#557c7a',
  fighting: '#c22e28',
  poison: '#a33ea1',
  ground: '#88733d',
  flying: '#7b68b1',
  psychic: '#c7446c',
  bug: '#6e7a11',
  rock: '#837427',
  ghost: '#735797',
  dragon: '#6f35fc',
  dark: '#705746',
  steel: '#737382',
  fairy: '#9e6280',
};

/**
 * Daftar ke-18 type, dipakai untuk (a) menembak endpoint /type/{nama}
 * dan (b) mengisi pilihan di dropdown filter.
 *
 * Object.keys() mengembalikan string[], bukan PokemonTypeName[] — TypeScript
 * tidak bisa menjamin isi objek saat runtime. Assertion di bawah aman DI SINI
 * karena TYPE_COLORS sudah bertipe Record<PokemonTypeName, string>, jadi
 * kuncinya dijamin lengkap dan tepat oleh compiler.
 */
export const ALL_TYPES = Object.keys(TYPE_COLORS) as PokemonTypeName[];

/** Label yang enak dibaca: 'grass' → 'Grass'. */
export function formatTypeName(type: PokemonTypeName): string {
  return type[0].toUpperCase() + type.slice(1);
}

/**
 * Latar kartu/header dari daftar type: satu type jadi warna solid,
 * dua type jadi gradient.
 *
 * Dipakai kartu daftar DAN header halaman detail. Ditaruh di sini, bukan
 * disalin dua kali, supaya kalau arah gradient-nya diubah, dua-duanya ikut.
 */
export function typeGradient(types: PokemonTypeName[]): string {
  const [first, second] = types.map((type) => TYPE_COLORS[type]);
  return second ? `linear-gradient(120deg, ${first} 0%, ${second} 100%)` : first;
}
