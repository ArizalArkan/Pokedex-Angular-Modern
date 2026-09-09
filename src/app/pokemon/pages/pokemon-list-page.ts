import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { PokemonStore } from '../data-access/pokemon-store';
import { PokemonNavigation } from '../data-access/pokemon-navigation';
import { Pokemon, PokemonTypeName } from '../models/pokemon.model';
import { ALL_TYPES, formatTypeName } from '../util/types';
import { GENERATIONS } from '../util/generations';
import { PokemonCard } from '../ui/pokemon-card';
import { MultiSelectOption } from '../../shared/ui/multi-select';
import { PokemonFilters } from '../ui/pokemon-filters';

/** Jumlah kartu yang ditambahkan tiap kali user mendekati bagian bawah. */
const PAGE_SIZE = 15;

@Component({
  selector: 'app-pokemon-list-page',
  imports: [PokemonCard, PokemonFilters],
  template: `
    <main class="mx-auto max-w-[1200px] px-6 pt-8 pb-16">
      <h1 class="m-0 mb-6 text-4xl font-bold">Pokémon Species</h1>

      <app-pokemon-filters
        [searchTerm]="searchTerm()"
        [selectedGenerations]="selectedGenerations()"
        [selectedTypes]="selectedTypes()"
        [generationOptions]="generationOptions"
        [typeOptions]="typeOptions"
        [hasActiveFilters]="hasActiveFilters()"
        (searchChange)="updateQuery({ q: $event })"
        (generationsChange)="updateQuery({ gen: $event.join(',') })"
        (typesChange)="updateQuery({ type: $event.join(',') })"
        (reset)="resetFilters()"
      />

      @if (data.isLoading()) {
        <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4" aria-hidden="true">
          @for (item of skeletons; track $index) {
            <div
              class="min-h-37 animate-pulse rounded-[14px] bg-surface motion-reduce:animate-none"
            ></div>
          }
        </div>
        <p class="sr-only" role="status">Memuat daftar pokémon…</p>
      } @else if (data.error()) {
        <div class="rounded-xl border border-[#7f1d1d] bg-[#2a1515] p-6" role="alert">
          <p class="m-0 mb-4">Gagal memuat data pokémon.</p>
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-[#64748b] bg-surface px-[1.1rem] py-[0.55rem] font-[inherit] text-[color:inherit] hover:bg-[#2a3341]"
            (click)="data.reload()"
          >
            Coba lagi
          </button>
        </div>
      } @else {
        <!-- role="status" membuat perubahan jumlah hasil diumumkan otomatis.
             Tanpa ini, pengguna screen reader mengetik di search dan tidak
             tahu apa-apa berubah. -->
        <p class="mt-5 mb-4 text-sm text-muted" role="status">
          {{ filteredPokemons().length }} dari {{ pokemons().length }} pokémon
        </p>

        @if (filteredPokemons().length === 0) {
          <p class="px-4 py-12 text-center text-muted">
            Tidak ada pokémon yang cocok. Coba longgarkan filternya.
          </p>
        } @else {
          <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            @for (p of visiblePokemons(); track p.id; let i = $index) {
              <app-pokemon-card [pokemon]="p" [priority]="i < 6" />
            }
          </div>

          @if (hasMore()) {
            <!--
              "Sentinel": kotak kosong di bawah grid. Kita tidak mendengarkan
              event scroll sama sekali - kita cuma minta browser mengabari kita
              saat kotak ini masuk jangkauan layar.

              Kenapa bukan (window:scroll)? Karena scroll menembak puluhan kali
              per detik dan memaksa kita menghitung posisi sendiri.
              IntersectionObserver dihitung browser di luar main thread, dan
              hanya memanggil kita saat statusnya benar-benar berubah.
            -->
            <div #sentinel class="h-4" aria-hidden="true"></div>
            <p class="py-6 text-center text-sm text-muted" role="status">
              Memuat lebih banyak… ({{ visiblePokemons().length }} dari
              {{ filteredPokemons().length }})
            </p>
          }
        }
      }
    </main>
  `,
})
export class PokemonListPage {
  /**
   * Data diambil dari service, bukan dimuat sendiri di komponen ini.
   *
   * Bedanya terasa saat user menekan Back dari halaman detail: data sudah ada,
   * kartu tergambar di frame pertama, tidak ada 19 request ulang, dan transisi
   * gambarnya punya sesuatu untuk dimorf.
   */
  private readonly store = inject(PokemonStore);

  /** Resource mentah, untuk status memuat/gagal. */
  protected readonly data = this.store.data;

  /** Daftar pokémon-nya sendiri. */
  protected readonly pokemons = this.store.pokemons;

  // --- State filter hidup di URL, bukan di komponen -----------------------
  //
  // Sebelumnya ketiganya adalah signal biasa di dalam komponen. Masalahnya:
  // komponen DIHANCURKAN saat berpindah ke halaman detail, jadi menekan Back
  // mengembalikan daftar dalam keadaan kosong tanpa filter - terbukti lewat
  // pengujian.
  //
  // Sekarang sumber kebenarannya adalah URL: /?q=char&gen=1&type=fire
  //
  // Tiga keuntungan sekaligus:
  //   1. Back dan Forward bekerja sendiri, karena browser yang mengurus riwayat.
  //   2. URL-nya bisa disalin, dibagikan, dan di-bookmark.
  //   3. Tidak ada dua sumber kebenaran yang bisa saling bertentangan.

  private readonly router = inject(Router);
  private readonly navigation = inject(PokemonNavigation);
  private readonly route = inject(ActivatedRoute);

  /**
   * withComponentInputBinding() memetakan query parameter ke input komponen,
   * bukan cuma parameter rute. Jadi ?q=char otomatis masuk ke input `q`.
   *
   * Tipenya `string | undefined`, dan itu penting.
   *
   * Saat query param-nya TIDAK ADA di URL, Angular mengisi input dengan
   * undefined - nilai default input('') tidak dipakai. Kalau tipenya ditulis
   * `string` saja, TypeScript akan menganggap this.gen().split() aman, padahal
   * saat runtime nilainya undefined dan melempar TypeError. Error itu lalu
   * menghentikan siklus render Angular, sehingga tombol Reset terlihat rusak.
   *
   * Jadi tipe di sini ditulis apa adanya, dan `?? ''` menanganinya di satu
   * tempat. Tipe yang berbohong lebih berbahaya daripada tidak ada tipe.
   */
  readonly q = input<string | undefined>('');
  readonly gen = input<string | undefined>('');
  readonly type = input<string | undefined>('');

  protected readonly searchTerm = computed(() => this.q() ?? '');

  protected readonly selectedGenerations = computed(() =>
    (this.gen() ?? '')
      .split(',')
      .map(Number)
      // Menyaring isi URL, bukan mempercayainya. Siapa pun bisa mengetik
      // ?gen=99 atau ?gen=abc di address bar.
      .filter((id) => GENERATIONS.some((generation) => generation.id === id)),
  );

  protected readonly selectedTypes = computed(() =>
    (this.type() ?? '')
      .split(',')
      .filter((name): name is PokemonTypeName => ALL_TYPES.includes(name as PokemonTypeName)),
  );

  protected readonly generationOptions: MultiSelectOption<number>[] = GENERATIONS.map((gen) => ({
    value: gen.id,
    label: gen.label,
  }));

  protected readonly typeOptions: MultiSelectOption<PokemonTypeName>[] = ALL_TYPES.map((type) => ({
    value: type,
    label: formatTypeName(type),
  }));

  protected readonly skeletons = Array.from({ length: 12 });

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  /**
   * INI inti pelajarannya.
   *
   * computed() membaca EMPAT signal: data mentah + tiga filter. Angular
   * mencatat sendiri ketergantungan itu — tidak ada daftar dependency manual
   * seperti useMemo di React, dan tidak mungkin lupa mencantumkan satu.
   *
   * Hasilnya di-cache. Kalau kamu memanggil filteredPokemons() lima kali dalam
   * satu render, perhitungannya cuma jalan sekali. Kalau tidak ada satu pun
   * dari keempat signal itu berubah, dia tidak dihitung ulang sama sekali.
   *
   * Coba bandingkan: kalau logika ini ditulis sebagai method biasa dan
   * dipanggil dari template, Angular akan menjalankannya ulang setiap siklus
   * change detection — ribuan kali, untuk hasil yang sama.
   */
  protected readonly filteredPokemons = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const generations = this.selectedGenerations();
    const types = this.selectedTypes();

    return this.pokemons().filter((pokemon) => {
      // Array kosong berarti "tidak difilter", bukan "tidak ada yang cocok".
      const matchesGeneration =
        generations.length === 0 || generations.includes(pokemon.generation);

      // .some() = "punya minimal satu type yang dipilih" (logika ATAU).
      // Kalau mau "punya SEMUA type yang dipilih", ganti jadi .every()
      // pada `types` — coba sendiri, bedanya menarik.
      const matchesType = types.length === 0 || pokemon.types.some((type) => types.includes(type));

      const matchesQuery =
        query === '' ||
        pokemon.searchKey.includes(query) ||
        // Supaya "25" dan "0025" sama-sama menemukan Pikachu.
        String(pokemon.id).padStart(4, '0').includes(query);

      return matchesGeneration && matchesType && matchesQuery;
    });
  });

  // --- Infinite scroll ------------------------------------------------------
  //
  // Alasannya terukur: artwork PokeAPI berukuran 118-150 KB per gambar.
  // Merender 1025 kartu berarti browser berusaha mengunduh ~151 MB, dan
  // raw.githubusercontent.com mulai memutus koneksi (terbukti: 13 dari 60
  // request paralel gagal). Dengan 15 kartu sekali render, angkanya jadi ~2 MB.

  /**
   * Berapa kartu yang boleh digambar saat ini.
   *
   * linkedSignal, bukan signal biasa: nilainya bertambah saat user scroll,
   * TAPI otomatis kembali ke 15 setiap kali hasil filter berubah.
   *
   * Coba bayangkan pakai signal biasa: user scroll sampai 300 kartu, lalu
   * mengetik di search. Hasilnya cuma 4 pokémon, tapi visibleCount masih 300.
   * Kita harus ingat me-reset-nya manual di SETIAP tempat yang mengubah filter
   * (onSearch, dua dropdown, tombol reset) - dan pasti ada yang kelupaan.
   * linkedSignal membuat aturan itu ditulis satu kali, di sini.
   */
  protected readonly visibleCount = linkedSignal({
    source: () => this.filteredPokemons(),
    computation: () => PAGE_SIZE,
  });

  protected readonly visiblePokemons = computed(() =>
    this.filteredPokemons().slice(0, this.visibleCount()),
  );

  protected readonly hasMore = computed(() => this.visibleCount() < this.filteredPokemons().length);

  constructor() {
    /**
     * Mencatat halaman ini sebagai alamat pulang, lengkap dengan filternya,
     * supaya tombol "Kembali" di halaman detail tahu harus ke mana.
     *
     * Kenapa perlu? Karena link itu navigasi BARU ke '/', bukan tombol Back
     * browser. Browser tidak tahu apa-apa soal filter kita.
     */
    effect(() => {
      const params: Params = {};
      if (this.q()) params['q'] = this.q();
      if (this.gen()) params['gen'] = this.gen();
      if (this.type()) params['type'] = this.type();
      this.navigation.returnTo.set({ path: '/', query: params, label: 'daftar' });
    });

    effect((onCleanup) => {
      const element = this.sentinel()?.nativeElement;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          this.visibleCount.update((count) => count + PAGE_SIZE);
          // IntersectionObserver hanya menembak saat status BERUBAH. Kalau
          // sentinel tetap terlihat setelah kartu baru muncul (misal layar
          // lebar, 15 kartu belum memenuhinya), dia tidak akan menembak lagi.
          // Observe ulang memaksa pemeriksaan baru pada frame berikutnya.
          requestAnimationFrame(() => {
            observer.unobserve(element);
            observer.observe(element);
          });
        },
        // Muat lebih awal 600px sebelum sentinel benar-benar terlihat, supaya
        // kartu sudah siap sebelum user sampai ke bawah.
        { rootMargin: '600px' },
      );

      observer.observe(element);
      // Tanpa baris ini, observer lama tetap hidup setiap kali effect jalan
      // ulang atau komponen dihancurkan - kebocoran memori klasik.
      onCleanup(() => observer.disconnect());
    });
  }

  protected readonly hasActiveFilters = computed(
    () =>
      this.searchTerm() !== '' ||
      this.selectedGenerations().length > 0 ||
      this.selectedTypes().length > 0,
  );

  /**
   * Menulis state filter ke URL.
   *
   * queryParamsHandling 'merge' → parameter lain tidak ikut terhapus.
   * Nilai kosong dikirim sebagai null → parameternya DIHAPUS dari URL,
   * jadi tidak ada ?q=&gen=&type= yang jelek saat filter dikosongkan.
   *
   * replaceUrl: true → mengetik "charizard" tidak meninggalkan 9 entri riwayat.
   * Tanpa ini, user harus menekan Back sembilan kali untuk keluar dari daftar.
   */
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

  protected resetFilters(): void {
    // Tanpa replaceUrl: menghapus filter LAYAK masuk riwayat, supaya Back
    // bisa mengembalikan filter yang tadi dipakai.
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
