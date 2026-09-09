import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSidebar, SidebarGroup } from './shared/ui/app-sidebar';
import { ICONS } from './shared/ui/icons';
import { PokemonStore } from './pokemon/data-access/pokemon-store';

@Component({
  imports: [RouterOutlet, AppSidebar],
  selector: 'app-root',
  template: `
    <a
      href="#konten"
      class="sr-only rounded-lg bg-sky-300 px-4 py-2 font-semibold text-ink
             focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
    >
      Jump To Conetent
    </a>

    <div class="lg:flex">
      <app-sidebar [groups]="menu()" tagline="1025 species" />
      <div id="konten" class="min-w-0 flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class App {
  private readonly store = inject(PokemonStore);

  protected readonly menu = computed<SidebarGroup[]>(() => [
    {
      label: 'Explore',
      items: [
        {
          label: 'All pokémon',
          iconPath: ICONS.list,
          link: '/',
          exact: true,
          badge: this.store.pokemons().length,
        },
        {
          label: 'Mega Evolution',
          iconPath: ICONS.gem,
          link: '/mega',
          badge: this.store.forms().mega.length,
        },
        {
          label: 'Gigantamax',
          iconPath: ICONS.expand,
          link: '/gmax',
          badge: this.store.forms().gmax.length,
        },
      ],
    },
    {
      label: 'Extra',
      items: [{ label: 'Compare Pokemons', iconPath: ICONS.scale, link: '/compare' }],
    },
  ]);
}
