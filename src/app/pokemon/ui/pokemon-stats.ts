import { Component, input } from '@angular/core';
import { PokemonStat } from '../models/pokemon.model';

/** Base stat tertinggi di seluruh game (Blissey, HP 255). Dipakai skala bar. */
const MAX_STAT = 255;

/** Enam base stat sebagai bar. Komponen presentasi murni. */
@Component({
  selector: 'app-pokemon-stats',
  host: { class: 'block' },
  template: `
    <ul class="m-0 flex list-none flex-col gap-3 p-0">
      @for (stat of stats(); track stat.label) {
        <li class="grid grid-cols-[110px_1fr_44px] items-center gap-3">
          <span class="text-sm text-muted">{{ stat.label }}</span>
          <!-- Bar-nya dekorasi; angkanya ada sebagai teks di sebelah, jadi
               screen reader tetap mendapat informasi lengkap. -->
          <span class="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <span
              class="block h-full rounded-full"
              [style.width.%]="width(stat.value)"
              [style.background]="color()"
            ></span>
          </span>
          <span class="text-right text-sm font-semibold">{{ stat.value }}</span>
        </li>
      }
    </ul>
  `,
})
export class PokemonStats {
  readonly stats = input.required<PokemonStat[]>();
  readonly color = input.required<string>();

  protected width(value: number): number {
    return Math.min(100, (value / MAX_STAT) * 100);
  }
}
