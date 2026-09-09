import { Component, input } from '@angular/core';
import { EffectivenessGroup } from '../util/type-effectiveness';
import { formatTypeName, TYPE_COLORS } from '../util/types';
import { PokemonTypeName } from '../models/pokemon.model';

/**
 * Lencana kelemahan dan ketahanan.
 *
 * Komponen ini TIDAK menghitung apa pun - perhitungan dan pengelompokannya ada
 * di util/type-effectiveness.ts sebagai fungsi murni yang punya 10 unit test.
 * Di sini tinggal menggambar. Itu sebabnya file ini pendek.
 */
@Component({
  selector: 'app-pokemon-weakness',
  host: { class: 'block' },
  template: `
    @for (group of groups(); track group.label) {
      <div class="mt-4">
        <h3 class="m-0 mb-2 text-sm text-muted">{{ group.label }}</h3>
        <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
          @for (item of group.items; track item.type) {
            <li
              class="rounded-full px-3 py-1 text-sm text-white shadow-[0_0_0_1.5px_rgb(255_255_255/0.25)]"
              [style.background]="color(item.type)"
            >
              {{ label(item.type) }}
              <span class="ml-1 font-bold">×{{ item.multiplier }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class PokemonWeakness {
  readonly groups = input.required<EffectivenessGroup[]>();

  protected readonly label = formatTypeName;

  protected color(type: PokemonTypeName): string {
    return TYPE_COLORS[type];
  }
}
