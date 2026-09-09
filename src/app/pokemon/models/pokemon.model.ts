import { TypeChart } from '../util/type-effectiveness';
import { SpecialFormKind } from '../util/special-forms';

/**
 * Bentuk RAPI milik aplikasi kita - inilah yang beredar di seluruh komponen.
 *
 * Tidak ada satu pun tipe di sini yang meniru struktur PokeAPI. Kalau butuh
 * bentuk mentahnya, lihat pokeapi.model.ts; penerjemahannya ada di
 * data-access/mappers.ts.
 */

/** 18 type Pokémon. Union of string literal, bukan `string`. */
export type PokemonTypeName =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

// --- Bentuk mentah dari PokeAPI -------------------------------------------

// --- Bentuk internal kita --------------------------------------------------

export interface Pokemon {
  id: number;
  /** Sudah dirapikan untuk tampil. Contoh: "Mr. Mime" dari "mr-mime". */
  name: string;
  /** Urut sesuai slot. Elemen pertama menentukan warna utama kartu. */
  types: PokemonTypeName[];
  /** 1..9. Diturunkan dari id, bukan dari API. */
  generation: number;
  imageUrl: string;
  /** Nama versi lowercase tanpa tanda baca, disiapkan untuk pencarian. */
  searchKey: string;
}

// --- Halaman detail --------------------------------------------------------

/** Satu tahap evolusi, sudah diratakan jadi daftar untuk ditampilkan. */
export interface EvolutionStage {
  id: number;
  name: string;
  imageUrl: string;
  /** Kedalaman di pohon: 0 = bentuk dasar, 1 = evolusi pertama, dst. */
  depth: number;
  /** Syarat mencapai tahap ini, misal "Level 16". Kosong untuk bentuk dasar. */
  condition: string;
}

// --- Lokasi ditemukan ------------------------------------------------------

export interface EncounterLocation {
  location: string;
  /** Nama versi game tempat ia muncul di lokasi ini. */
  versions: string[];
  minLevel: number;
  maxLevel: number;
  /** Peluang tertinggi di lokasi ini, dalam persen. */
  chance: number;
}

/** Satu bentuk alternatif, misal "Pikachu Gmax". */
export interface PokemonVariety {
  id: number;
  name: string;
  imageUrl: string;
  /** true untuk bentuk normal, yang muncul di daftar utama. */
  isDefault: boolean;
}

export interface PokemonStat {
  /** Sudah dirapikan: "special-attack" → "Sp. Attack". */
  label: string;
  value: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  types: PokemonTypeName[];
  imageUrl: string;
  /** Contoh: "Mouse Pokémon". */
  genus: string;
  description: string;
  /** Dalam meter. */
  heightM: number;
  /** Dalam kilogram. */
  weightKg: number;
  abilities: { name: string; hidden: boolean }[];
  stats: PokemonStat[];
  cryUrl: string | null;
  evolution: EvolutionStage[];
  varieties: PokemonVariety[];
}

/** Semua data pokédex, hasil dari satu putaran 19 request. */
export interface PokedexData {
  /** 1025 pokémon utama. */
  pokemons: Pokemon[];
  /**
   * Bentuk khusus, dikelompokkan per jenis: 97 Mega, 34 Gigantamax.
   * Semuanya dari 19 request yang sama - nol request tambahan.
   */
  forms: Record<SpecialFormKind, Pokemon[]>;
  /** Tabel kekuatan/kelemahan antar type. */
  typeChart: TypeChart;
}
