import { PokemonTypeName } from './pokemon.model';
import { EvolutionDetail } from '../util/evolution-condition';

/**
 * Bentuk MENTAH persis seperti kiriman pokeapi.co.
 *
 * File ini hanya boleh diimpor oleh lapisan data-access (service HTTP dan
 * fungsi pemetaannya). Komponen TIDAK BOLEH menyentuhnya.
 *
 * Kenapa dipisah dari pokemon.model.ts? Karena dua file ini berubah karena
 * alasan yang berbeda: yang ini berubah kalau PokeAPI berubah, yang satunya
 * berubah kalau kebutuhan aplikasi kita berubah. Menyatukan keduanya berarti
 * setiap kali API pihak ketiga bergerak, tipe domain kita ikut goyang.
 *
 * Buktinya sudah kita alami: cara mengambil data pernah diganti total (1026
 * request jadi 19) tanpa satu pun komponen berubah.
 */

/** GET /pokemon?limit=1025 */
export interface PokeApiListResponse {
  count: number;
  results: { name: string; url: string }[];
}

/** GET /type/{name} — hanya field yang kita pakai. */
export interface PokeApiTypeResponse {
  name: PokemonTypeName;
  pokemon: {
    slot: number;
    pokemon: { name: string; url: string };
  }[];
  /**
   * Tabel kekuatan type. Sudah ikut terunduh sejak awal, tapi selama beberapa
   * iterasi kita buang begitu saja - padahal ini yang dibutuhkan kalkulator
   * kelemahan, tanpa satu pun request tambahan.
   */
  damage_relations: {
    double_damage_from: { name: PokemonTypeName }[];
    half_damage_from: { name: PokemonTypeName }[];
    no_damage_from: { name: PokemonTypeName }[];
  };
}

/** GET /pokemon/{id} — hanya field yang dipakai halaman detail. */
export interface PokeApiPokemonDetail {
  id: number;
  name: string;
  /** Desimeter. 4 berarti 0,4 meter. */
  height: number;
  /** Hektogram. 60 berarti 6,0 kilogram. */
  weight: number;
  abilities: { is_hidden: boolean; ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  types: { slot: number; type: { name: PokemonTypeName } }[];
  cries: { latest: string | null; legacy: string | null };
  /**
   * Tautan ke species-nya. WAJIB dipakai, jangan menyusun
   * /pokemon-species/{id} sendiri: untuk bentuk Mega (id 10034) URL tebakan
   * itu 404, sedangkan tautan ini menunjuk ke species yang benar (charizard).
   */
  species: { name: string; url: string };
}

/** GET /pokemon-species/{id} */
export interface PokeApiSpecies {
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  evolution_chain: { url: string };
  /**
   * Bentuk-bentuk alternatif: Mega, Gigantamax, kostum, form regional.
   * Pikachu punya 17. Inilah badge "3 Forms" di desain awal.
   *
   * Id varian non-default selalu di atas 10000 - itu sebabnya kita
   * menyaringnya keluar dari daftar utama, supaya tidak muncul jadi
   * kartu terpisah.
   */
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
}

/**
 * GET /evolution-chain/{id}
 *
 * Perhatikan interface ini menyebut DIRINYA SENDIRI lewat `evolves_to`.
 * Itu disebut tipe rekursif, dan bentuknya memang begitu karena evolusi bisa
 * bercabang: Eevee punya delapan cabang, Wurmple punya dua.
 */
export interface PokeApiEvolutionNode {
  species: { name: string; url: string };
  /** Syarat untuk MENCAPAI tahap ini. Kosong untuk bentuk dasar. */
  evolution_details: EvolutionDetail[];
  evolves_to: PokeApiEvolutionNode[];
}

export interface PokeApiEvolutionChain {
  chain: PokeApiEvolutionNode;
}

/** GET /pokemon/{id}/encounters */
export interface PokeApiEncounter {
  location_area: { name: string };
  version_details: {
    version: { name: string };
    max_chance: number;
    encounter_details: { min_level: number; max_level: number; chance: number }[];
  }[];
}
