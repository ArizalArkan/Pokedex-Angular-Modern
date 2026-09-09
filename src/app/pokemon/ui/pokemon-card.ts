import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pokemon } from '../models/pokemon.model';
import { formatTypeName, TYPE_COLORS, typeGradient } from '../util/types';
import { PokemonNavigation } from '../data-access/pokemon-navigation';
import { spriteUrl } from '../util/images';

@Component({
  selector: 'app-pokemon-card',
  imports: [NgOptimizedImage, RouterLink],
  host: { class: 'block' },
  template: `
    <!--
      <a> asli, bukan <div> dengan (click).

      Bedanya nyata: link bisa di-Tab, dibuka di tab baru dengan Ctrl+klik,
      disalin alamatnya, dan dibacakan screen reader sebagai "tautan". Semua itu
      hilang kalau memakai div. routerLink tetap mencegah reload halaman penuh.

      Teks di dalamnya (nama pokémon) otomatis jadi nama aksesibel link ini.
    -->
    <a
      [routerLink]="['/pokemon', pokemon().id]"
      (click)="transition.active.set(pokemon())"
      class="group relative block overflow-hidden rounded-[14px] text-white
             transition-[transform,box-shadow] duration-200 ease-out
             hover:-translate-y-1 hover:shadow-[0_12px_28px_rgb(0_0_0/0.45)]
             focus-visible:-translate-y-1
             motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      [style.background]="background()"
    >
      <!-- Cahaya berwarna type yang membesar dari sudut kanan saat disentuh.
           aria-hidden karena murni dekorasi. -->
      <span
        class="pointer-events-none absolute -top-1/2 -right-1/4 h-[200%] w-[70%] rounded-full
               opacity-0 blur-2xl transition-opacity duration-300
               group-hover:opacity-40 motion-reduce:transition-none"
        [style.background]="glowColor()"
        aria-hidden="true"
      ></span>

      <article class="relative flex min-h-37 items-center justify-between gap-2 px-5 py-4">
        <div class="relative z-1">
          <h2 class="m-0 text-[1.35rem] font-bold leading-tight">{{ pokemon().name }}</h2>
          <p class="mb-0 mt-[0.35rem] text-[0.95rem] opacity-[0.85]">#{{ paddedId() }}</p>
          <p class="mb-0 mt-2 text-[0.95rem] italic opacity-[0.85]">{{ typeLabel() }}</p>

          <ul class="m-0 mt-[0.6rem] flex list-none gap-[0.35rem] p-0" aria-hidden="true">
            @for (color of typeColors(); track $index) {
              <li
                class="h-4 w-4 rounded-full shadow-[0_0_0_1.5px_rgb(255_255_255/0.55)]"
                [style.background]="color"
              ></li>
            }
          </ul>
        </div>

        <!--
          Tiga cabang @if, bukan satu <img> dengan input yang berubah-ubah.

          NgOptimizedImage melarang input ngSrc dan priority berubah setelah
          elemen dibuat, dan MELEMPAR ERROR kalau itu terjadi (NG02953) - error
          yang menghentikan siklus render Angular sehingga kartu sesudahnya
          tidak ikut digambar. @if menyelesaikannya karena berpindah cabang
          berarti elemen lama dihancurkan dan elemen baru dibuat.
        -->
        @if (imageFailed()) {
          <img
            class="h-24 w-24 shrink-0 object-contain [image-rendering:pixelated]"
            [ngSrc]="spriteUrl()"
            alt=""
            width="96"
            height="96"
          />
        } @else if (priority()) {
          <img
            [class]="artClass"
            [style.view-transition-name]="transitionName()"
            [ngSrc]="pokemon().imageUrl"
            alt=""
            width="240"
            height="240"
            priority
            (error)="imageFailed.set(true)"
          />
        } @else {
          <img
            [class]="artClass"
            [style.view-transition-name]="transitionName()"
            [ngSrc]="pokemon().imageUrl"
            alt=""
            width="240"
            height="240"
            (error)="imageFailed.set(true)"
          />
        }
      </article>
    </a>
  `,
})
export class PokemonCard {
  protected readonly transition = inject(PokemonNavigation);

  readonly pokemon = input.required<Pokemon>();

  readonly priority = input(false);

  /**
   * Gambar membesar dan miring sedikit saat kartu disentuh, seolah melompat
   * keluar. group-hover berarti "saat induk ber-class 'group' disentuh" -
   * jadi hover di mana pun pada kartu ikut menghidupkan gambar, bukan cuma
   * saat kursor tepat di atas gambarnya.
   */
  protected readonly artClass =
    'relative z-1 h-27.5 w-27.5 shrink-0 object-contain ' +
    'filter-[drop-shadow(0_4px_8px_rgb(0_0_0/0.35))] ' +
    'transition-transform duration-300 ease-out ' +
    'group-hover:scale-112 group-hover:-rotate-6 ' +
    'motion-reduce:transition-none motion-reduce:group-hover:scale-100 ' +
    'motion-reduce:group-hover:rotate-0';

  /**
   * Hanya kartu yang sedang berpindah yang mendapat nama transisi. Kartu lain
   * mendapat null, artinya browser tidak memotretnya sama sekali.
   */
  protected readonly transitionName = computed(() =>
    this.transition.activeId() === this.pokemon().id ? 'pokemon-art' : null,
  );

  protected readonly imageFailed = linkedSignal({
    source: () => this.pokemon().id,
    computation: () => false,
  });

  protected readonly spriteUrl = computed(() => spriteUrl(this.pokemon().id));

  protected readonly paddedId = computed(() => String(this.pokemon().id).padStart(4, '0'));

  protected readonly typeColors = computed(() =>
    this.pokemon().types.map((type) => TYPE_COLORS[type]),
  );

  protected readonly typeLabel = computed(() =>
    this.pokemon().types.map(formatTypeName).join(', '),
  );

  protected readonly glowColor = computed(() => this.typeColors().at(-1) ?? '#ffffff');

  protected readonly background = computed(() => typeGradient(this.pokemon().types));
}
