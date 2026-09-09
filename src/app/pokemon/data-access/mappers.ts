import {
  PokeApiEncounter,
  PokeApiEvolutionNode,
  PokeApiListResponse,
  PokeApiPokemonDetail,
  PokeApiSpecies,
  PokeApiTypeResponse,
  PokeApiEvolutionChain,
} from '../models/pokeapi.model';
import {
  EncounterLocation,
  EvolutionStage,
  PokedexData,
  Pokemon,
  PokemonDetail,
  PokemonStat,
  PokemonTypeName,
  PokemonVariety,
} from '../models/pokemon.model';
import { TypeChart, TypeRelations } from '../util/type-effectiveness';
import { describeEvolution } from '../util/evolution-condition';
import { generationOf, MAX_POKEDEX_ID } from '../util/generations';
import { artworkUrl } from '../util/images';
import { SPECIAL_FORM_KINDS, SPECIAL_FORMS, SpecialFormKind } from '../util/special-forms';

/**
 * Perbatasan antara "dunia PokeAPI" dan "dunia aplikasi kita".
 *
 * Semua isi file ini adalah fungsi MURNI: tidak ada HTTP, tidak ada signal,
 * tidak ada dependency injection. Input sama selalu menghasilkan output sama.
 *
 * Kenapa dipisah dari pokemon-api.ts? Karena dua hal ini berubah karena alasan
 * berbeda. Service berubah kalau CARA mengambil data berubah (endpoint,
 * paralel/berurutan, caching). File ini berubah kalau BENTUK data berubah.
 *
 * Efek sampingnya menyenangkan: fungsi-fungsi di sini bisa diuji tanpa
 * memalsukan HttpClient sama sekali - persis seperti util/type-effectiveness.ts
 * yang sudah punya 7 test.
 */

// --- Perbatasan antara "dunia PokeAPI" dan "dunia aplikasi kita" ------------

/** Mengambil id dari URL seperti ".../pokemon/25/" → 25. */
function idFromUrl(url: string): number {
  return Number(url.split('/').filter(Boolean).pop());
}

/** "mr-mime" → "Mr Mime" */
function formatName(apiName: string): string {
  return apiName
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildPokedex(
  list: PokeApiListResponse,
  typeGroups: PokeApiTypeResponse[],
): PokedexData {
  // Langkah 1: balik arah datanya.
  // API memberi "type → daftar pokémon". Kita butuh "pokémon → daftar type".
  // Map dipakai (bukan objek biasa) karena kuncinya angka dan lookup-nya O(1).
  //
  // Berbeda dari versi sebelumnya, di sini id > 1025 TIDAK dibuang - justru
  // dari situlah data Mega berasal.
  const typesById = new Map<number, { slot: number; type: PokemonTypeName }[]>();

  // Langkah 2: sekalian rakit tabel kekuatan type dari response yang sama.
  const typeChart = {} as TypeChart;

  for (const group of typeGroups) {
    const relations: TypeRelations = {
      doubleFrom: group.damage_relations.double_damage_from.map((t) => t.name),
      halfFrom: group.damage_relations.half_damage_from.map((t) => t.name),
      noFrom: group.damage_relations.no_damage_from.map((t) => t.name),
    };
    typeChart[group.name] = relations;

    for (const entry of group.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      const existing = typesById.get(id);
      if (existing) {
        existing.push({ slot: entry.slot, type: group.name });
      } else {
        typesById.set(id, [{ slot: entry.slot, type: group.name }]);
      }
    }
  }

  // Langkah 3: gabungkan daftar nama dengan peta type di atas.
  const semua = list.results
    .map((entry) => {
      const id = idFromUrl(entry.url);
      return {
        id,
        name: formatName(entry.name),
        types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
        generation: generationOf(id),
        imageUrl: artworkUrl(id),
        // Dihitung sekali di sini, bukan berulang kali saat mengetik di search.
        searchKey: entry.name.replace(/-/g, ' ').toLowerCase(),
        rawName: entry.name,
      };
    })
    // Jaring pengaman: entry tanpa type sama sekali akan tampil tanpa warna
    // latar. Lebih baik disembunyikan daripada tampil rusak.
    .filter((p) => p.types.length > 0);

  return {
    pokemons: semua
      .filter((p) => p.id <= MAX_POKEDEX_ID)
      .map(({ rawName, ...pokemon }) => pokemon satisfies Pokemon),
    forms: Object.fromEntries(
      SPECIAL_FORM_KINDS.map((kind) => [
        kind,
        semua
          .filter((p) => SPECIAL_FORMS[kind].pattern.test(p.rawName))
          .map(({ rawName, ...pokemon }) => pokemon satisfies Pokemon),
      ]),
    ) as Record<SpecialFormKind, Pokemon[]>,
    typeChart,
  };
}

/** "special-attack" → "Sp. Attack", "hp" → "HP". */
function formatStatLabel(name: string): string {
  if (name === 'hp') return 'HP';
  return name
    .replace('special-', 'sp-')
    .split('-')
    .map((word) => (word === 'sp' ? 'Sp.' : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Meratakan pohon evolusi jadi daftar datar.
 *
 * Fungsi ini memanggil DIRINYA SENDIRI (rekursi) karena bentuk datanya memang
 * pohon: tiap tahap bisa punya beberapa cabang. Eevee membuktikannya dengan
 * delapan cabang sekaligus.
 *
 * `depth` disimpan supaya template tahu tahap ke berapa suatu pokémon berada.
 */
function flattenEvolution(node: PokeApiEvolutionNode, depth = 0): EvolutionStage[] {
  const id = idFromUrl(node.species.url);
  const current: EvolutionStage = {
    id,
    name: formatName(node.species.name),
    imageUrl: artworkUrl(id),
    depth,
    // Syarat disimpan pada tahap TUJUAN, bukan tahap asal - karena "Level 16"
    // menjelaskan bagaimana kita sampai ke Bayleef, bukan bagaimana keluar
    // dari Chikorita.
    condition: describeEvolution(node.evolution_details),
  };
  // flatMap meratakan array-dalam-array yang dihasilkan tiap cabang.
  return [current, ...node.evolves_to.flatMap((child) => flattenEvolution(child, depth + 1))];
}

export function toPokemonDetail(
  pokemon: PokeApiPokemonDetail,
  species: PokeApiSpecies,
  chain: PokeApiEvolutionChain,
): PokemonDetail {
  // PokeAPI mengembalikan teks dalam banyak bahasa dalam satu array.
  const englishFlavor = species.flavor_text_entries.find((e) => e.language.name === 'en');
  const englishGenus = species.genera.find((g) => g.language.name === 'en');

  const stats: PokemonStat[] = pokemon.stats.map((entry) => ({
    label: formatStatLabel(entry.stat.name),
    value: entry.base_stat,
  }));

  return {
    id: pokemon.id,
    name: formatName(pokemon.name),
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    imageUrl: artworkUrl(pokemon.id),
    genus: englishGenus?.genus ?? '',
    // Teks flavor PokeAPI mengandung newline dan karakter form-feed (\f)
    // peninggalan format kartrid game aslinya. Harus dibersihkan.
    description: (englishFlavor?.flavor_text ?? '').replace(/\s+/g, ' ').trim(),
    heightM: pokemon.height / 10,
    weightKg: pokemon.weight / 10,
    abilities: pokemon.abilities.map((a) => ({
      name: formatName(a.ability.name),
      hidden: a.is_hidden,
    })),
    stats,
    cryUrl: pokemon.cries.latest ?? pokemon.cries.legacy,
    evolution: flattenEvolution(chain.chain),
    varieties: species.varieties.map((variety): PokemonVariety => {
      const varietyId = idFromUrl(variety.pokemon.url);
      return {
        id: varietyId,
        name: formatName(variety.pokemon.name),
        imageUrl: artworkUrl(varietyId),
        isDefault: variety.is_default,
      };
    }),
  };
}

export function toEncounterLocation(encounter: PokeApiEncounter): EncounterLocation {
  // Satu lokasi bisa muncul di banyak versi game, masing-masing dengan level
  // dan peluang berbeda. Kita ringkas jadi rentang level dan peluang terbaik.
  const semuaDetail = encounter.version_details.flatMap((v) => v.encounter_details);
  const levels = semuaDetail.map((d) => [d.min_level, d.max_level]).flat();

  return {
    location: formatName(encounter.location_area.name),
    versions: encounter.version_details.map((v) => formatName(v.version.name)),
    minLevel: levels.length ? Math.min(...levels) : 0,
    maxLevel: levels.length ? Math.max(...levels) : 0,
    chance: Math.max(0, ...encounter.version_details.map((v) => v.max_chance)),
  };
}
