import { describe, expect, it } from 'vitest';
import { PokemonTypeName } from '../models/pokemon.model';
import { calculateEffectiveness, groupEffectiveness, TypeChart } from './type-effectiveness';

/**
 * Tabel tiruan seadanya - hanya berisi type yang dipakai di test ini.
 *
 * Kenapa tidak memakai data asli dari PokeAPI? Karena test harus menguji SATU
 * hal: rumus perkalian. Kalau datanya diambil dari jaringan, test jadi lambat,
 * bisa gagal karena internet, dan kalau merah kita tidak tahu apakah rumusnya
 * yang salah atau API-nya yang berubah.
 */
function buatTabel(
  isi: Partial<Record<PokemonTypeName, Partial<TypeChart[PokemonTypeName]>>>,
): TypeChart {
  const kosong = { doubleFrom: [], halfFrom: [], noFrom: [] };
  const semua = [
    'normal',
    'fire',
    'water',
    'electric',
    'grass',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
    'dark',
    'steel',
    'fairy',
  ] as PokemonTypeName[];
  return Object.fromEntries(semua.map((t) => [t, { ...kosong, ...(isi[t] ?? {}) }])) as TypeChart;
}

describe('calculateEffectiveness', () => {
  it('mengembalikan pengali 1 untuk type yang tidak punya hubungan khusus', () => {
    const chart = buatTabel({});
    const hasil = calculateEffectiveness(['normal'], chart);

    expect(hasil).toHaveLength(18);
    expect(hasil.every((h) => h.multiplier === 1)).toBe(true);
  });

  it('memakai kelemahan dan ketahanan dari satu type', () => {
    const chart = buatTabel({
      fire: { doubleFrom: ['water', 'ground'], halfFrom: ['grass'] },
    });
    const hasil = calculateEffectiveness(['fire'], chart);
    const cari = (t: PokemonTypeName) => hasil.find((h) => h.type === t)!.multiplier;

    expect(cari('water')).toBe(2);
    expect(cari('ground')).toBe(2);
    expect(cari('grass')).toBe(0.5);
    expect(cari('normal')).toBe(1);
  });

  it('MENGALIKAN pengali dari kedua type - ini inti perhitungannya', () => {
    // Charizard = fire + flying. Rock kuat melawan keduanya, jadi 2 x 2 = 4.
    const chart = buatTabel({
      fire: { doubleFrom: ['rock'] },
      flying: { doubleFrom: ['rock'] },
    });
    const hasil = calculateEffectiveness(['fire', 'flying'], chart);

    expect(hasil.find((h) => h.type === 'rock')!.multiplier).toBe(4);
  });

  it('kelemahan dan ketahanan yang berlawanan saling meniadakan', () => {
    const chart = buatTabel({
      fire: { doubleFrom: ['ground'] },
      flying: { noFrom: [], halfFrom: ['ground'] },
    });
    const hasil = calculateEffectiveness(['fire', 'flying'], chart);

    expect(hasil.find((h) => h.type === 'ground')!.multiplier).toBe(1);
  });

  it('kekebalan mengalahkan segalanya, karena dikalikan nol', () => {
    // Steel lemah terhadap ground (2x), tapi Flying KEBAL ground (0x).
    // Skarmory = steel + flying, jadi hasilnya harus 0, bukan 2.
    const chart = buatTabel({
      steel: { doubleFrom: ['ground'] },
      flying: { noFrom: ['ground'] },
    });
    const hasil = calculateEffectiveness(['steel', 'flying'], chart);

    expect(hasil.find((h) => h.type === 'ground')!.multiplier).toBe(0);
  });

  it('mengurutkan dari pengali terbesar ke terkecil', () => {
    const chart = buatTabel({
      water: { doubleFrom: ['grass'], halfFrom: ['fire'], noFrom: ['normal'] },
    });
    const hasil = calculateEffectiveness(['water'], chart);

    expect(hasil[0].multiplier).toBe(2);
    expect(hasil.at(-1)!.multiplier).toBe(0);
    // Terurut menurun dari awal sampai akhir.
    for (let i = 1; i < hasil.length; i++) {
      expect(hasil[i - 1].multiplier).toBeGreaterThanOrEqual(hasil[i].multiplier);
    }
  });

  it('tidak error kalau daftar type kosong', () => {
    const hasil = calculateEffectiveness([], buatTabel({}));
    expect(hasil.every((h) => h.multiplier === 1)).toBe(true);
  });
});

describe('groupEffectiveness', () => {
  const chart = buatTabel({
    fire: { doubleFrom: ['rock', 'water'], halfFrom: ['grass'] },
    flying: { doubleFrom: ['rock'], noFrom: ['ground'], halfFrom: ['grass'] },
  });

  it('membuang pengali 1x karena tidak membawa informasi', () => {
    const kelompok = groupEffectiveness(['fire', 'flying'], chart);
    const semuaItem = kelompok.flatMap((k) => k.items);

    expect(semuaItem.every((i) => i.multiplier !== 1)).toBe(true);
  });

  it('membuang kelompok yang kosong', () => {
    const kelompok = groupEffectiveness(['fire', 'flying'], chart);
    expect(kelompok.every((k) => k.items.length > 0)).toBe(true);
  });

  it('menempatkan tiap pengali di kelompok yang benar', () => {
    const kelompok = groupEffectiveness(['fire', 'flying'], chart);
    const cari = (label: string) =>
      kelompok.find((k) => k.label === label)?.items.map((i) => i.type) ?? [];

    expect(cari('Sangat lemah')).toEqual(['rock']); // 2 x 2 = 4
    expect(cari('Lemah')).toEqual(['water']); // 2 x 1 = 2
    expect(cari('Sangat tahan')).toEqual(['grass']); // 0.5 x 0.5 = 0.25
    expect(cari('Kebal')).toEqual(['ground']); // apa pun x 0 = 0
  });
});
