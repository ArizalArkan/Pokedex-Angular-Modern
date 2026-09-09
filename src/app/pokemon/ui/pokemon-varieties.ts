import { Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { PokemonVariety } from '../models/pokemon.model';

/**
 * Bentuk-bentuk alternatif: Mega, Gigantamax, kostum, form regional.
 *
 * Komponen ini dipasang di dalam blok @defer pada halaman detail. Itu penting:
 * @defer menunda pembuatan KOMPONEN, jadi ke-17 gambar Pikachu (masing-masing
 * ~130 KB) baru diunduh saat bagian ini benar-benar tergulir ke layar.
 */
@Component({
  selector: 'app-pokemon-varieties',
  imports: [NgOptimizedImage],
  host: { class: 'block' },
  template: `
    <ul class="m-0 flex list-none flex-wrap gap-3 p-0">
      @for (variety of varieties(); track variety.id) {
        <li
          class="flex w-28 flex-col items-center gap-1 rounded-xl p-2"
          [class.bg-white/5]="variety.isDefault"
        >
          <img
            class="h-20 w-20 object-contain"
            [ngSrc]="variety.imageUrl"
            alt=""
            width="160"
            height="160"
          />
          <span class="text-center text-xs">{{ variety.name }}</span>
          @if (variety.isDefault) {
            <span class="text-xs text-muted">bentuk normal</span>
          }
        </li>
      }
    </ul>
  `,
})
export class PokemonVarieties {
  readonly varieties = input.required<PokemonVariety[]>();
}
