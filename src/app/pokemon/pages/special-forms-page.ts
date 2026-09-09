import { Component, computed, effect, inject, input } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { PokemonNavigation } from '../data-access/pokemon-navigation';
import { PokemonStore } from '../data-access/pokemon-store';
import { PokemonTypeName } from '../models/pokemon.model';
import { ALL_TYPES, formatTypeName } from '../util/types';
import { SPECIAL_FORMS, SpecialFormKind } from '../util/special-forms';
import { PokemonCard } from '../ui/pokemon-card';
import { MultiSelect, MultiSelectOption } from '../../shared/ui/multi-select';

/**
 * Satu halaman untuk SEMUA jenis bentuk khusus: Mega, Gigantamax, dan apa pun
 * yang ditambahkan nanti.
 *
 * Jenisnya datang dari `data` pada definisi rute:
 *
 *     { path: 'mega', data: { kind: 'mega' }, ... }
 *
 * withComponentInputBinding() memetakan route data ke input komponen, sama
 * seperti ia memetakan parameter rute dan query parameter. Jadi tidak perlu
 * inject ActivatedRoute sama sekali.
 *
 * Alternatifnya adalah menyalin halaman ini untuk tiap jenis. Dua salinan
 * mungkin masih terkelola; lima tidak. Dan setiap perbaikan bug harus
 * dikerjakan berkali-kali.
 */
@Component({
  selector: 'app-special-forms-page',
  imports: [PokemonCard, MultiSelect],
  template: `
    <main class="mx-auto max-w-[1200px] px-6 pt-8 pb-16">
      <h1 class="m-0 text-4xl font-bold">{{ info().title }}</h1>
      <p class="mt-2 mb-6 max-w-[65ch] text-muted">{{ info().description }}</p>

      <div class="flex flex-wrap items-center gap-3 border-b border-[#232c38] pb-5">
        <label>
          <span class="sr-only">Cari {{ info().title }}</span>
          <input
            type="search"
            class="w-[260px] rounded-[10px] border border-[#2c3644] bg-[#1a212b] px-[0.9rem] py-[0.7rem] font-[inherit] text-paper placeholder:text-[#94a3b8]"
            [placeholder]="'Cari ' + info().title + '…'"
            [value]="searchTerm()"
            (input)="updateQuery({ q: searchValue($event) })"
          />
        </label>

        <app-multi-select
          label="Any types"
          [options]="typeOptions"
          [selected]="selectedTypes()"
          (selectedChange)="updateQuery({ type: $event.join(',') })"
        />
      </div>

      @if (store.data.isLoading()) {
        <div
          class="mt-6 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
          aria-hidden="true"
        >
          @for (item of skeletons; track $index) {
            <div
              class="min-h-37 animate-pulse rounded-[14px] bg-surface motion-reduce:animate-none"
            ></div>
          }
        </div>
      } @else {
        <p class="mt-5 mb-4 text-sm text-muted" role="status">
          {{ filtered().length }} dari {{ all().length }} bentuk
        </p>

        @if (filtered().length === 0) {
          <p class="px-4 py-12 text-center text-muted">Tidak ada yang cocok.</p>
        } @else {
          <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            @for (form of filtered(); track form.id; let i = $index) {
              <app-pokemon-card [pokemon]="form" [priority]="i < 6" />
            }
          </div>
        }
      }
    </main>
  `,
})
export class SpecialFormsPage {
  protected readonly store = inject(PokemonStore);

  /** Diisi dari `data: { kind: ... }` pada rute. */
  readonly kind = input.required<SpecialFormKind>();

  protected readonly info = computed(() => SPECIAL_FORMS[this.kind()]);

  protected readonly all = computed(() => this.store.forms()[this.kind()]);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly navigation = inject(PokemonNavigation);

  /**
   * Filter disimpan di URL, sama seperti halaman daftar utama.
   *
   * Tipenya `string | undefined` dan itu disengaja: saat query param-nya tidak
   * ada, Angular mengisi input dengan undefined - nilai default input('') TIDAK
   * dipakai. Menulis tipenya `string` saja akan membuat TypeScript mengira
   * .split() aman, lalu meledak saat runtime dan menghentikan siklus render.
   */
  readonly q = input<string | undefined>('');
  readonly type = input<string | undefined>('');

  protected readonly searchTerm = computed(() => this.q() ?? '');

  protected readonly selectedTypes = computed(() =>
    (this.type() ?? '')
      .split(',')
      // Menyaring isi URL, bukan mempercayainya.
      .filter((name): name is PokemonTypeName => ALL_TYPES.includes(name as PokemonTypeName)),
  );

  constructor() {
    // Mencatat halaman ini sebagai alamat pulang. Tanpa ini, tombol "Kembali"
    // di halaman detail akan membawa user ke daftar utama, bukan ke sini.
    effect(() => {
      const query: Params = {};
      if (this.q()) query['q'] = this.q();
      if (this.type()) query['type'] = this.type();

      this.navigation.returnTo.set({
        path: `/${this.kind()}`,
        query,
        label: this.info().title,
      });
    });
  }

  protected searchValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /** Menulis filter ke URL. replaceUrl supaya mengetik tidak menumpuk riwayat. */
  protected updateQuery(patch: Params): void {
    const cleaned: Params = {};
    for (const [key, value] of Object.entries(patch)) {
      cleaned[key] = value === '' ? null : value;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cleaned,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected readonly typeOptions: MultiSelectOption<PokemonTypeName>[] = ALL_TYPES.map((type) => ({
    value: type,
    label: formatTypeName(type),
  }));

  protected readonly skeletons = Array.from({ length: 9 });

  protected readonly filtered = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const types = this.selectedTypes();

    return this.all().filter((form) => {
      const cocokNama = query === '' || form.searchKey.includes(query);
      const cocokType = types.length === 0 || form.types.some((t) => types.includes(t));
      return cocokNama && cocokType;
    });
  });
}
