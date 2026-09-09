/**
 * Generation TIDAK perlu diambil dari API.
 *
 * PokeAPI punya endpoint /generation, tapi memakainya berarti 9 request
 * tambahan untuk informasi yang sebenarnya deterministik: nomor Pokédex
 * nasional dialokasikan berurutan per generasi. Gen 1 = 1..151, selamanya.
 *
 * Ini contoh keputusan yang sering muncul di kerjaan nyata: data yang stabil
 * dan tidak pernah berubah lebih baik jadi konstanta daripada request jaringan.
 * Konsekuensinya: kalau Gen 10 rilis, file ini harus diedit manual.
 * Itu trade-off yang sadar, bukan kelalaian.
 */
export interface Generation {
  readonly id: number;
  readonly label: string;
  readonly from: number;
  readonly to: number;
}

export const GENERATIONS: readonly Generation[] = [
  { id: 1, label: 'Generation I', from: 1, to: 151 },
  { id: 2, label: 'Generation II', from: 152, to: 251 },
  { id: 3, label: 'Generation III', from: 252, to: 386 },
  { id: 4, label: 'Generation IV', from: 387, to: 493 },
  { id: 5, label: 'Generation V', from: 494, to: 649 },
  { id: 6, label: 'Generation VI', from: 650, to: 721 },
  { id: 7, label: 'Generation VII', from: 722, to: 809 },
  { id: 8, label: 'Generation VIII', from: 810, to: 905 },
  { id: 9, label: 'Generation IX', from: 906, to: 1025 },
];

/** Nomor Pokédex tertinggi yang kita kenali. Entry di atas ini adalah form khusus. */
export const MAX_POKEDEX_ID = 1025;

/** Mengembalikan nomor generasi dari nomor Pokédex, atau 0 kalau di luar jangkauan. */
export function generationOf(id: number): number {
  return GENERATIONS.find((gen) => id >= gen.from && id <= gen.to)?.id ?? 0;
}
