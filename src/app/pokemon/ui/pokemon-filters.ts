import { Component, input, output } from '@angular/core';
import { MultiSelect, MultiSelectOption } from '../../shared/ui/multi-select';
import { PokemonTypeName } from '../models/pokemon.model';

/**
 * Baris kontrol filter: search, generation, type, tombol reset.
 *
 * Komponen "bodoh" murni. Dia TIDAK tahu bahwa state-nya sebenarnya tinggal di
 * URL, tidak tahu ada router, dan tidak menyimpan apa pun sendiri. Nilai masuk
 * lewat input(), perubahan keluar lewat output(). Halaman induk yang memutuskan
 * apa yang terjadi setelahnya.
 *
 * Kenapa output() dan bukan model() dua arah? Karena nilai-nilainya di induk
 * adalah computed() turunan dari URL - tidak bisa ditulis langsung. Alurnya
 * satu putaran: URL → input → user mengubah → output → URL.
 */
@Component({
  selector: 'app-pokemon-filters',
  imports: [MultiSelect],
  host: { class: 'block' },
  template: `
    <!-- role="search" memberi tahu screen reader bahwa blok ini area pencarian,
         sehingga bisa dilompati langsung. -->
    <div class="flex flex-wrap items-center gap-3 border-b border-[#232c38] pb-5" role="search">
      <label>
        <!-- Label visual disembunyikan, tapi TETAP ADA untuk screen reader.
             placeholder BUKAN pengganti label: dia hilang begitu diketik. -->
        <span class="sr-only">Cari pokémon berdasarkan nama atau nomor</span>
        <input
          type="search"
          class="w-[260px] rounded-[10px] border border-[#2c3644] bg-[#1a212b] px-[0.9rem] py-[0.7rem] font-[inherit] text-paper placeholder:text-[#94a3b8]"
          placeholder="Search pokémon"
          [value]="searchTerm()"
          (input)="onSearch($event)"
        />
      </label>

      <app-multi-select
        label="Any generations"
        [options]="generationOptions()"
        [selected]="selectedGenerations()"
        (selectedChange)="generationsChange.emit($event)"
      />

      <app-multi-select
        label="Any types"
        [options]="typeOptions()"
        [selected]="selectedTypes()"
        (selectedChange)="typesChange.emit($event)"
      />

      @if (hasActiveFilters()) {
        <button
          type="button"
          class="cursor-pointer rounded-[10px] border border-[#2c3644] bg-transparent px-[0.9rem] py-[0.7rem] font-[inherit] text-[#cbd5e1] hover:bg-[#1a212b]"
          (click)="reset.emit()"
        >
          Reset filter
        </button>
      }
    </div>
  `,
})
export class PokemonFilters {
  readonly searchTerm = input.required<string>();
  readonly selectedGenerations = input.required<number[]>();
  readonly selectedTypes = input.required<PokemonTypeName[]>();
  readonly generationOptions = input.required<MultiSelectOption<number>[]>();
  readonly typeOptions = input.required<MultiSelectOption<PokemonTypeName>[]>();
  readonly hasActiveFilters = input(false);

  readonly searchChange = output<string>();
  readonly generationsChange = output<number[]>();
  readonly typesChange = output<PokemonTypeName[]>();
  readonly reset = output<void>();

  protected onSearch(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }
}
