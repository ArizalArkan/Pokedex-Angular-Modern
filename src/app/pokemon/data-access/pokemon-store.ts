import { computed, inject, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PokemonApi } from './pokemon-api';
import { TypeChart } from '../util/type-effectiveness';
import { SpecialFormKind } from '../util/special-forms';
import { Pokemon } from '../models/pokemon.model';

/**
 * Menyimpan seluruh data pokédex untuk seumur hidup aplikasi.
 *
 * Kenapa di service, bukan di dalam komponen daftar?
 *
 * Karena komponen DIHANCURKAN saat berpindah rute. Waktu user menekan Back
 * dari halaman detail, komponen daftar dibuat ulang, resource-nya berjalan
 * lagi, dan 19 request ditembak ulang - terbukti lewat pengukuran.
 *
 * Akibatnya bukan cuma boros. Pada frame pertama setelah Back, daftar masih
 * kosong. Padahal di frame itulah View Transitions memotret halaman baru, jadi
 * morf gambarnya gagal.
 *
 * Aturan umumnya: state yang harus hidup lebih lama daripada komponen,
 * tempatnya di service.
 *
 * Sekarang satu putaran 19 request itu memberi TIGA hal sekaligus: daftar
 * utama, daftar Mega, dan tabel kekuatan type.
 */
@Service()
export class PokemonStore {
  private readonly api = inject(PokemonApi);

  /**
   * Resource mentahnya. Komponen memakai ini untuk isLoading / error / reload.
   * Dibuat sekali, saat service pertama kali di-inject.
   */
  readonly data = rxResource({ stream: () => this.api.loadAll() });

  /** 1025 pokémon utama. Array kosong selama masih memuat. */
  readonly pokemons = computed(() => this.data.value()?.pokemons ?? []);

  /** Bentuk khusus per jenis: 'mega' atau 'gmax'. Kosong selama masih memuat. */
  readonly forms = computed(
    () =>
      this.data.value()?.forms ?? ({ mega: [], gmax: [] } as Record<SpecialFormKind, Pokemon[]>),
  );

  /** Tabel kekuatan type, atau undefined selama masih memuat. */
  readonly typeChart = computed((): TypeChart | undefined => this.data.value()?.typeChart);
}
