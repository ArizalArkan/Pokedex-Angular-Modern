import { PokemonTypeName } from '../models/pokemon.model';

/** Type apa saja yang kuat/lemah SAAT MENYERANG satu type tertentu. */
export interface TypeRelations {
  /** Menyerang type ini dengan salah satu dari sini → kerusakan 2x. */
  doubleFrom: PokemonTypeName[];
  /** → kerusakan 0,5x. */
  halfFrom: PokemonTypeName[];
  /** → tidak melukai sama sekali. */
  noFrom: PokemonTypeName[];
}

export type TypeChart = Record<PokemonTypeName, TypeRelations>;

export interface Effectiveness {
  type: PokemonTypeName;
  /** 0, 0.25, 0.5, 1, 2, atau 4. */
  multiplier: number;
}

export const ALL_TYPE_NAMES: PokemonTypeName[] = [
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
];

/**
 * Menghitung seberapa besar kerusakan tiap type serangan terhadap pokémon
 * dengan susunan type tertentu.
 *
 * Aturannya cuma satu kalimat: pengali dari tiap type DIKALIKAN, bukan
 * dijumlahkan atau diambil yang terbesar.
 *
 *   Charizard (fire + flying) diserang Rock
 *     fire  lemah Rock  → 2
 *     flying lemah Rock → 2
 *     hasil: 2 x 2      = 4x
 *
 *   Skarmory (steel + flying) diserang Ground
 *     steel  lemah Ground → 2
 *     flying KEBAL Ground → 0
 *     hasil: 2 x 0        = 0x   ← kekebalan selalu menang, karena nol
 *
 * Fungsi ini sengaja MURNI: tidak memanggil jaringan, tidak menyentuh signal,
 * tidak punya state. Input sama selalu menghasilkan output sama. Itu yang
 * membuatnya bisa diuji tanpa Angular, tanpa browser, dalam hitungan milidetik.
 */
export function calculateEffectiveness(
  defenderTypes: PokemonTypeName[],
  chart: TypeChart,
): Effectiveness[] {
  return ALL_TYPE_NAMES.map((attacker) => {
    let multiplier = 1;

    for (const defender of defenderTypes) {
      const relations = chart[defender];
      if (!relations) continue;

      if (relations.noFrom.includes(attacker)) multiplier *= 0;
      else if (relations.doubleFrom.includes(attacker)) multiplier *= 2;
      else if (relations.halfFrom.includes(attacker)) multiplier *= 0.5;
    }

    return { type: attacker, multiplier };
  }).sort((a, b) => b.multiplier - a.multiplier);
}

export interface EffectivenessGroup {
  label: string;
  items: Effectiveness[];
}

/**
 * Mengelompokkan hasil perhitungan jadi kategori yang enak dibaca.
 *
 * Pengali 1x sengaja dibuang: itu keadaan normal, dan menampilkannya cuma
 * menambah sepuluh lencana tanpa informasi. Kelompok kosong juga dibuang,
 * supaya template tidak perlu mengeceknya satu per satu.
 *
 * Dipisahkan dari komponen supaya bisa diuji tanpa Angular sama sekali.
 */
export function groupEffectiveness(
  defenderTypes: PokemonTypeName[],
  chart: TypeChart,
): EffectivenessGroup[] {
  const hasil = calculateEffectiveness(defenderTypes, chart);
  const ambil = (cocok: (m: number) => boolean) => hasil.filter((item) => cocok(item.multiplier));

  return [
    { label: 'Sangat lemah', items: ambil((m) => m >= 4) },
    { label: 'Lemah', items: ambil((m) => m === 2) },
    { label: 'Tahan', items: ambil((m) => m === 0.5) },
    { label: 'Sangat tahan', items: ambil((m) => m > 0 && m <= 0.25) },
    { label: 'Kebal', items: ambil((m) => m === 0) },
  ].filter((kelompok) => kelompok.items.length > 0);
}
