import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { PokemonApi } from '../data-access/pokemon-api';
import { PokemonNavigation } from '../data-access/pokemon-navigation';
import { PokemonStore } from '../data-access/pokemon-store';
import { PokemonTypeName } from '../models/pokemon.model';
import { artworkUrl } from '../util/images';
import { groupEffectiveness } from '../util/type-effectiveness';
import { PokemonEncounters } from '../ui/pokemon-encounters';
import { PokemonEvolution } from '../ui/pokemon-evolution';
import { PokemonHero } from '../ui/pokemon-hero';
import { PokemonStats } from '../ui/pokemon-stats';
import { PokemonVarieties } from '../ui/pokemon-varieties';
import { PokemonWeakness } from '../ui/pokemon-weakness';
import { TYPE_COLORS } from '../util/types';

/**
 * Halaman detail: komponen "pintar".
 *
 * Tugasnya cuma tiga: mengambil data, menyusun state, dan menentukan komponen
 * mana yang tampil. Tidak ada satu pun bar, lencana, atau kartu digambar di
 * sini - semuanya diserahkan ke komponen presentasi di ../ui.
 *
 * Sebelum dipecah, file ini 442 baris dan mengurus tujuh hal sekaligus.
 */
@Component({
  selector: 'app-pokemon-detail-page',
  imports: [
    RouterLink,
    PokemonHero,
    PokemonStats,
    PokemonWeakness,
    PokemonEncounters,
    PokemonEvolution,
    PokemonVarieties,
  ],
  template: `
    <main class="mx-auto max-w-[900px] px-6 pt-8 pb-16">
      <!--
        Jalur, filter, DAN label semuanya datang dari alamat pulang yang dicatat
        halaman daftar terakhir. Sebelumnya jalurnya dipatok "/", sehingga user
        yang masuk dari halaman Mega Evolution malah terlempar ke daftar utama.
      -->
      <a
        [routerLink]="returnTo().path"
        [queryParams]="returnTo().query"
        class="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-paper"
      >
        <span aria-hidden="true">←</span> Kembali ke {{ returnTo().label }}
      </a>

      <app-pokemon-hero
        [pokemonId]="numericId()"
        [name]="hero().name"
        [genus]="detail.value()?.genus ?? ''"
        [types]="hero().types"
        [imageUrl]="hero().imageUrl"
        [cryUrl]="detail.value()?.cryUrl ?? null"
      />

      @if (detail.error()) {
        <div class="mt-6 rounded-xl border border-[#7f1d1d] bg-[#2a1515] p-6" role="alert">
          <p class="m-0 mb-4">Gagal memuat detail pokémon #{{ id() }}.</p>
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-[#64748b] bg-surface px-[1.1rem] py-[0.55rem] font-[inherit] hover:bg-[#2a3341]"
            (click)="detail.reload()"
          >
            Coba lagi
          </button>
        </div>
      } @else if (detail.isLoading()) {
        <div class="mt-6 animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div class="h-36 rounded-[18px] bg-surface"></div>
          <div class="mt-6 h-52 rounded-[18px] bg-surface"></div>
        </div>
        <p class="sr-only" role="status">Memuat detail pokémon…</p>
      } @else if (detail.value(); as d) {
        <section class="mt-6 rounded-[18px] bg-surface p-6">
          <h2 class="m-0 mb-3 text-lg font-semibold">Deskripsi</h2>
          <p class="m-0 leading-relaxed text-paper/90">{{ d.description }}</p>

          <dl class="m-0 mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt class="text-sm text-muted">Tinggi</dt>
              <dd class="m-0 text-lg font-semibold">{{ d.heightM }} m</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Berat</dt>
              <dd class="m-0 text-lg font-semibold">{{ d.weightKg }} kg</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Abilities</dt>
              <dd class="m-0 text-lg font-semibold">
                @for (ability of d.abilities; track ability.name) {
                  <span class="mr-2 inline-block">
                    {{ ability.name }}
                    @if (ability.hidden) {
                      <span class="text-sm font-normal text-muted">(hidden)</span>
                    }
                  </span>
                }
              </dd>
            </div>
          </dl>
        </section>

        <section class="mt-6 rounded-[18px] bg-surface p-6">
          <h2 class="m-0 mb-4 text-lg font-semibold">Base stats</h2>
          <app-pokemon-stats [stats]="d.stats" [color]="primaryColor()" />
        </section>

        <section class="mt-6 rounded-[18px] bg-surface p-6">
          <h2 class="m-0 mb-1 text-lg font-semibold">Kelemahan &amp; ketahanan</h2>
          <p class="mt-0 mb-4 text-sm text-muted">
            Dihitung dengan MENGALIKAN pengali dari tiap type. Charizard (Fire + Flying) kena Rock
            2× dari Fire dan 2× dari Flying, jadi 4×.
          </p>
          <app-pokemon-weakness [groups]="weaknessGroups()" />
        </section>

        <section class="mt-6 rounded-[18px] bg-surface p-6">
          <h2 class="m-0 mb-1 text-lg font-semibold">Lokasi ditemukan</h2>
          <p class="mt-0 mb-4 text-sm text-muted">
            Data ini diambil hanya saat bagian ini tergulir ke layar.
          </p>
          @defer (on viewport) {
            <app-pokemon-encounters [pokemonId]="d.id" />
          } @placeholder {
            <div class="h-24 rounded-xl bg-white/5" aria-hidden="true"></div>
          }
        </section>

        @if (d.varieties.length > 1) {
          <section class="mt-6 rounded-[18px] bg-surface p-6">
            <h2 class="m-0 mb-4 text-lg font-semibold">Bentuk lain ({{ d.varieties.length }})</h2>
            @defer (on viewport) {
              <app-pokemon-varieties [varieties]="d.varieties" />
            } @placeholder {
              <div class="flex flex-wrap gap-3" aria-hidden="true">
                @for (item of varietySkeletons; track $index) {
                  <div class="h-28 w-28 animate-pulse rounded-xl bg-white/5"></div>
                }
              </div>
            }
          </section>
        }

        <section class="mt-6 rounded-[18px] bg-surface p-6">
          <h2 class="m-0 mb-4 text-lg font-semibold">Evolusi</h2>
          <app-pokemon-evolution [stages]="d.evolution" [currentId]="d.id" />
        </section>
      }
    </main>
  `,
})
export class PokemonDetailPage {
  private readonly api = inject(PokemonApi);
  private readonly store = inject(PokemonStore);
  private readonly navigation = inject(PokemonNavigation);

  /** Diisi otomatis dari parameter rute :id berkat withComponentInputBinding(). */
  readonly id = input.required<string>();

  /** Halaman daftar terakhir yang ditinggalkan, lengkap dengan filternya. */
  protected readonly returnTo = this.navigation.returnTo;

  protected readonly numericId = computed(() => Number(this.id()));

  protected readonly varietySkeletons = Array.from({ length: 4 });

  /**
   * params membuat resource ini memuat ulang otomatis saat :id berubah -
   * misalnya waktu user mengklik tahap evolusi lain.
   */
  protected readonly detail = rxResource({
    params: () => this.numericId(),
    stream: ({ params }) => this.api.loadDetail(params),
  });

  /**
   * Data secukupnya untuk menggambar header, dari sumber terbaik yang ada:
   *   1. data lengkap, kalau sudah datang
   *   2. data titipan kartu yang diklik - tersedia SEKETIKA
   *   3. hanya nomor dari URL, kalau halaman dibuka langsung
   */
  protected readonly hero = computed(() => {
    const id = this.numericId();

    const loaded = this.detail.value();
    if (loaded) return loaded;

    const clicked = this.navigation.active();
    if (clicked?.id === id) return clicked;

    return { id, name: '', types: [] as PokemonTypeName[], imageUrl: artworkUrl(id) };
  });

  protected readonly primaryColor = computed(
    () => TYPE_COLORS[this.detail.value()?.types[0] ?? 'normal'],
  );

  /** Tabel type diambil dari store - nol request tambahan. */
  protected readonly weaknessGroups = computed(() => {
    const chart = this.store.typeChart();
    const types = this.detail.value()?.types;
    return chart && types ? groupEffectiveness(types, chart) : [];
  });
}
