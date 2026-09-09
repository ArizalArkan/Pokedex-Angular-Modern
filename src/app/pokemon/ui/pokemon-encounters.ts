import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PokemonApi } from '../data-access/pokemon-api';

/**
 * Daftar lokasi tempat pokémon bisa ditemukan.
 *
 * Komponen terpisah, dan itu disengaja.
 *
 * @defer menunda pembuatan KOMPONEN, bukan sekadar menyembunyikan elemen.
 * Kalau resource-nya ditaruh di kelas halaman detail, request-nya tetap
 * ditembak saat halaman dibuka, meski bagian ini masih jauh di bawah layar.
 * Dengan memindahkannya ke komponen sendiri lalu membungkus komponen itu
 * dengan @defer, request baru berjalan saat user benar-benar menggulir ke sini.
 */
@Component({
  selector: 'app-pokemon-encounters',
  template: `
    @if (encounters.isLoading()) {
      <div class="h-24 animate-pulse rounded-xl bg-white/5" aria-hidden="true"></div>
      <p class="sr-only" role="status">Memuat lokasi…</p>
    } @else if (encounters.error()) {
      <p class="m-0 text-muted">Gagal memuat lokasi.</p>
    } @else if (encounters.value(); as lokasi) {
      @if (lokasi.length === 0) {
        <p class="m-0 text-muted">
          Tidak bisa ditemukan liar di alam — biasanya hanya lewat evolusi, hadiah, atau kejadian
          khusus.
        </p>
      } @else {
        <p class="mt-0 mb-4 text-sm text-muted">{{ lokasi.length }} lokasi</p>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          @for (tempat of lokasi; track tempat.location) {
            <li
              class="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-white/5 px-4 py-3"
            >
              <span class="font-semibold">{{ tempat.location }}</span>
              <span class="text-sm text-muted">
                Lv {{ tempat.minLevel }}
                @if (tempat.maxLevel !== tempat.minLevel) {
                  –{{ tempat.maxLevel }}
                }
              </span>
              @if (tempat.chance > 0) {
                <span class="text-sm text-muted">peluang {{ tempat.chance }}%</span>
              }
              <span class="w-full text-xs text-muted">{{ tempat.versions.join(', ') }}</span>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class PokemonEncounters {
  private readonly api = inject(PokemonApi);

  readonly pokemonId = input.required<number>();

  protected readonly encounters = rxResource({
    params: () => this.pokemonId(),
    stream: ({ params }) => this.api.loadEncounters(params),
  });
}
