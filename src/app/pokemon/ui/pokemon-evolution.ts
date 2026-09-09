import { Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EvolutionStage } from '../models/pokemon.model';

/** Rantai evolusi yang bisa diklik, lengkap dengan syarat tiap tahap. */
@Component({
  selector: 'app-pokemon-evolution',
  imports: [NgOptimizedImage, RouterLink],
  host: { class: 'block' },
  template: `
    @if (stages().length <= 1) {
      <p class="m-0 text-muted">Pokémon ini tidak berevolusi.</p>
    } @else {
      <ul class="m-0 flex list-none flex-wrap items-center gap-3 p-0">
        @for (stage of stages(); track stage.id) {
          <li>
            <a
              [routerLink]="['/pokemon', stage.id]"
              class="flex w-28 flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-white/5"
              [class.ring-2]="stage.id === currentId()"
              [class.ring-sky-300]="stage.id === currentId()"
              [attr.aria-current]="stage.id === currentId() ? 'page' : null"
            >
              <img
                class="h-20 w-20 object-contain"
                [ngSrc]="stage.imageUrl"
                alt=""
                width="160"
                height="160"
              />
              <span class="text-center text-sm">{{ stage.name }}</span>
              @if (stage.condition) {
                <span class="text-center text-xs text-muted">{{ stage.condition }}</span>
              } @else {
                <span class="text-xs text-muted">bentuk dasar</span>
              }
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class PokemonEvolution {
  readonly stages = input.required<EvolutionStage[]>();
  readonly currentId = input.required<number>();
}
