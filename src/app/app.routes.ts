import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pokemon/pages/pokemon-list-page').then((m) => m.PokemonListPage),
    title: 'Pokédex',
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./pokemon/pages/pokemon-detail-page').then((m) => m.PokemonDetailPage),
    title: 'Pokémon Detail',
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./pokemon/pages/pokemon-compare-page').then((m) => m.PokemonComparePage),
    title: 'Compare pokémon',
  },
  {
    path: 'mega',
    loadComponent: () =>
      import('./pokemon/pages/special-forms-page').then((m) => m.SpecialFormsPage),
    data: { kind: 'mega' },
    title: 'Mega Evolution',
  },
  {
    path: 'gmax',
    loadComponent: () =>
      import('./pokemon/pages/special-forms-page').then((m) => m.SpecialFormsPage),
    data: { kind: 'gmax' },
    title: 'Gigantamax',
  },
  { path: '**', redirectTo: '' },
];
