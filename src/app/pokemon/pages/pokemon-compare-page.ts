import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, required, schema } from '@angular/forms/signals';
import { of } from 'rxjs';
import { PokemonApi } from '../data-access/pokemon-api';
import { PokemonStore } from '../data-access/pokemon-store';
import { PokemonDetail } from '../models/pokemon.model';
import { TYPE_COLORS } from '../util/types';
import { ComparePanel } from '../ui/compare-panel';

interface CompareModel {
  a: string;
  b: string;
}

/** Aturan validasi, ditulis terpisah dari komponen supaya bisa dites sendiri. */
const compareSchema = schema<CompareModel>((path) => {
  required(path.a, { message: 'Pilih pokémon pertama' });
  required(path.b, { message: 'Pilih pokémon kedua' });
});

@Component({
  selector: 'app-pokemon-compare-page',
  imports: [FormField, ComparePanel],
  template: `
    <main class="mx-auto max-w-[900px] px-6 pt-8 pb-16">
      <h1 class="m-0 mb-6 text-4xl font-bold">Bandingkan</h1>

      <div class="flex flex-wrap gap-4">
        <!--
          Isi <app-compare-panel> ini bukan input, melainkan MARKUP yang
          disisipkan ke dalam panel lewat <ng-content>. Panel-nya sendiri tidak
          tahu apa-apa soal dropdown - dia cuma menyediakan tempat.
        -->
        <app-compare-panel [pokemon]="detailA.value()" [loading]="detailA.isLoading()">
          <label class="block">
            <span class="text-sm opacity-80">Pokémon pertama</span>
            <!-- [formField] menghubungkan <select> ke satu field di form.
                 Nilai, status disentuh, dan error diurus oleh Signal Forms. -->
            <select
              class="mt-1 w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 font-[inherit] text-white"
              [formField]="pickers.a"
            >
              <option value="">— pilih —</option>
              @for (p of options(); track p.id) {
                <option [value]="p.id">#{{ p.id }} {{ p.name }}</option>
              }
            </select>
          </label>
        </app-compare-panel>

        <app-compare-panel [pokemon]="detailB.value()" [loading]="detailB.isLoading()">
          <label class="block">
            <span class="text-sm opacity-80">Pokémon kedua</span>
            <select
              class="mt-1 w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 font-[inherit] text-white"
              [formField]="pickers.b"
            >
              <option value="">— pilih —</option>
              @for (p of options(); track p.id) {
                <option [value]="p.id">#{{ p.id }} {{ p.name }}</option>
              }
            </select>
          </label>
        </app-compare-panel>
      </div>

      @if (sameChoice()) {
        <p class="mt-4 rounded-lg bg-[#2a1515] px-4 py-3 text-sm" role="alert">
          Kedua sisi menunjuk pokémon yang sama. Pilih yang berbeda supaya ada yang dibandingkan.
        </p>
      }

      @if (detailA.value(); as a) {
        @if (detailB.value(); as b) {
          <section class="mt-6 rounded-[18px] bg-surface p-6">
            <h2 class="m-0 mb-5 text-lg font-semibold">Perbandingan base stat</h2>

            <ul class="m-0 flex list-none flex-col gap-4 p-0">
              @for (statA of a.stats; track statA.label; let i = $index) {
                <!--
                  @let membuat variabel lokal di template.

                  Tanpa ini, b.stats[i].value harus diulang lima kali di bawah -
                  di lebar bar, di warna, di angka, dan di dua perbandingan.
                  Dengan @let, dihitung sekali dan dibaca dengan nama yang jelas.
                -->
                @let statB = b.stats[i];
                @let menangA = statA.value > statB.value;
                @let menangB = statB.value > statA.value;

                <li class="grid grid-cols-[1fr_190px_1fr] items-center gap-3">
                  <!-- Bar kiri tumbuh ke kiri, jadi keduanya bertemu di tengah. -->
                  <span class="flex justify-end">
                    <span
                      class="h-3 rounded-full"
                      [style.width.%]="barWidth(statA.value)"
                      [style.background]="colorA()"
                      [style.opacity]="menangA ? 1 : 0.45"
                      aria-hidden="true"
                    ></span>
                  </span>

                  <span class="text-center text-sm whitespace-nowrap">
                    <span [class.font-bold]="menangA">{{ statA.value }}</span>
                    <span class="mx-2 text-muted">{{ statA.label }}</span>
                    <span [class.font-bold]="menangB">{{ statB.value }}</span>
                  </span>

                  <span class="flex justify-start">
                    <span
                      class="h-3 rounded-full"
                      [style.width.%]="barWidth(statB.value)"
                      [style.background]="colorB()"
                      [style.opacity]="menangB ? 1 : 0.45"
                      aria-hidden="true"
                    ></span>
                  </span>
                </li>
              }
            </ul>

            <p class="mt-5 mb-0 text-center text-sm text-muted">
              Total {{ total(a) }} berbanding {{ total(b) }} —
              @if (total(a) === total(b)) {
                seri
              } @else {
                {{ total(a) > total(b) ? a.name : b.name }} unggul
              }
            </p>
          </section>
        }
      }
    </main>
  `,
})
export class PokemonComparePage {
  private readonly api = inject(PokemonApi);
  private readonly store = inject(PokemonStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Nilai awal dibaca SEKALI dari snapshot, bukan lewat input() yang reaktif.
   *
   * Itu disengaja. Kalau URL menjadi input reaktif DAN form menulis balik ke
   * URL, keduanya saling memicu: URL → form → URL → form. Dengan membaca sekali
   * di awal lalu hanya menulis ke satu arah, putarannya terputus.
   */
  private readonly model = signal<CompareModel>({
    a: this.route.snapshot.queryParamMap.get('a') ?? '',
    b: this.route.snapshot.queryParamMap.get('b') ?? '',
  });

  /**
   * form() membungkus signal model jadi "field tree" - satu objek yang punya
   * cabang untuk tiap properti (pickers.a, pickers.b). Tiap cabang menyimpan
   * nilainya sendiri plus status: sudah disentuh, valid, error apa.
   *
   * Bandingkan dengan Reactive Forms lama: di sana tipe nilainya sering hilang
   * (FormGroup mengembalikan any) dan pembacaan nilai butuh .value atau
   * berlangganan valueChanges. Di sini semuanya signal dan bertipe penuh.
   */
  protected readonly pickers = form(this.model, compareSchema);

  protected readonly options = computed(() => this.store.pokemons());

  private readonly idA = computed(() => Number(this.model().a) || 0);
  private readonly idB = computed(() => Number(this.model().b) || 0);

  protected readonly sameChoice = computed(() => this.idA() > 0 && this.idA() === this.idB());

  protected readonly detailA = rxResource({
    params: () => this.idA(),
    stream: ({ params }) => (params ? this.api.loadDetail(params) : of(undefined)),
  });

  protected readonly detailB = rxResource({
    params: () => this.idB(),
    stream: ({ params }) => (params ? this.api.loadDetail(params) : of(undefined)),
  });

  protected readonly colorA = computed(
    () => TYPE_COLORS[this.detailA.value()?.types[0] ?? 'normal'],
  );
  protected readonly colorB = computed(
    () => TYPE_COLORS[this.detailB.value()?.types[0] ?? 'normal'],
  );

  constructor() {
    // Satu arah: form → URL. URL tidak pernah menulis balik ke form.
    effect(() => {
      const { a, b } = this.model();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { a: a || null, b: b || null },
        replaceUrl: true,
      });
    });
  }

  protected barWidth(value: number): number {
    return Math.min(100, (value / 180) * 100);
  }

  protected total(detail: PokemonDetail): number {
    return detail.stats.reduce((sum, stat) => sum + stat.value, 0);
  }
}
