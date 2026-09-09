import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import {
  PokeApiEvolutionChain,
  PokeApiEncounter,
  PokeApiListResponse,
  PokeApiPokemonDetail,
  PokeApiSpecies,
  PokeApiTypeResponse,
} from '../models/pokeapi.model';
import { EncounterLocation, PokedexData, PokemonDetail } from '../models/pokemon.model';
import { ALL_TYPES } from '../util/types';
import { buildPokedex, toEncounterLocation, toPokemonDetail } from './mappers';

const BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Batas atas saat mengambil daftar. Lebih besar dari 1025 supaya bentuk khusus
 * (Mega, Gigantamax, form regional) ikut terbawa - id mereka di atas 10000,
 * tapi PokeAPI mengurutkannya setelah 1025 dalam daftar yang sama.
 */
const LIST_LIMIT = 1400;

/** Satu-satunya tempat di aplikasi ini yang tahu soal pokeapi.co. */
@Service()
export class PokemonApi {
  private readonly http = inject(HttpClient);

  /**
   * Mengambil seluruh 1025 pokémon lengkap dengan type, generation, dan gambar
   * — dalam 19 request, bukan 1026.
   *
   * Caranya: dua request yang saling melengkapi, dijalankan BARENGAN.
   *
   *   A. GET /pokemon?limit=1025   → 1 request  → id + nama semua pokémon
   *   B. GET /type/{nama} × 18     → 18 request → pokémon mana punya type apa
   *
   * Gambar diturunkan dari id (pola URL sprite-nya konsisten), dan generation
   * diturunkan dari id juga. Keduanya nol request.
   *
   * Perhatikan: di sini TIDAK ADA switchMap. Request A dan B tidak saling
   * bergantung — tidak ada yang butuh hasil yang lain untuk mulai. Jadi cukup
   * forkJoin. switchMap hanya dipakai kalau request kedua BUTUH hasil pertama,
   * seperti versi sebelumnya yang butuh daftar URL detail dulu.
   */
  loadAll(): Observable<PokedexData> {
    return forkJoin({
      list: this.http.get<PokeApiListResponse>(`${BASE_URL}/pokemon`, {
        params: { limit: LIST_LIMIT },
      }),
      // forkJoin juga menerima objek, bukan cuma array. Hasilnya objek dengan
      // kunci yang sama — lebih enak dibaca daripada destructuring array.
      typeGroups: forkJoin(
        ALL_TYPES.map((type) => this.http.get<PokeApiTypeResponse>(`${BASE_URL}/type/${type}`)),
      ),
    }).pipe(map(({ list, typeGroups }) => buildPokedex(list, typeGroups)));
  }

  /**
   * Lokasi tempat pokémon bisa ditemukan di game.
   *
   * Dipisah dari loadDetail() dengan sengaja: halaman detail sudah butuh 3
   * request, dan bagian lokasi letaknya jauh di bawah. Dengan memisahnya,
   * @defer di template bisa menunda request ini sampai user benar-benar
   * menggulir ke sana - banyak pokémon punya puluhan lokasi.
   */
  loadEncounters(id: number): Observable<EncounterLocation[]> {
    return this.http
      .get<PokeApiEncounter[]>(`${BASE_URL}/pokemon/${id}/encounters`)
      .pipe(map((encounters) => encounters.map(toEncounterLocation)));
  }

  /**
   * Mengambil satu pokémon lengkap untuk halaman detail.
   *
   * Tiga request BERURUTAN, dan urutannya terpaksa, bukan pilihan:
   *
   *   1. /pokemon/{id}                 → data dasar + TAUTAN ke species-nya
   *   2. tautan species dari langkah 1 → deskripsi, varian, tautan evolusi
   *   3. tautan evolusi dari langkah 2 → rantai evolusi
   *
   * Versi sebelumnya menembak langkah 1 dan 2 paralel dengan menyusun sendiri
   * URL `/pokemon-species/{id}`. Itu lebih cepat, tapi SALAH untuk bentuk
   * khusus: id Mega Charizard X adalah 10034, dan /pokemon-species/10034
   * menghasilkan 404. Species-nya sebenarnya charizard (id 6) - dan PokeAPI
   * sudah memberi tahu lewat field `species.url`.
   *
   * Pelajarannya umum: ikuti tautan yang diberikan API, jangan menebak URL
   * dari pola id. Kita membayar satu perjalanan jaringan tambahan (~250 ms)
   * untuk itu, dan halaman detail tetap terasa cepat karena header-nya sudah
   * digambar seketika dari data kartu.
   */
  loadDetail(id: number): Observable<PokemonDetail> {
    return this.http
      .get<PokeApiPokemonDetail>(`${BASE_URL}/pokemon/${id}`)
      .pipe(
        switchMap((pokemon) =>
          this.http
            .get<PokeApiSpecies>(pokemon.species.url)
            .pipe(
              switchMap((species) =>
                this.http
                  .get<PokeApiEvolutionChain>(species.evolution_chain.url)
                  .pipe(map((chain) => toPokemonDetail(pokemon, species, chain))),
              ),
            ),
        ),
      );
  }
}
