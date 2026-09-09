import { Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { PokemonTypeName } from '../models/pokemon.model';
import { formatTypeName, TYPE_COLORS, typeGradient } from '../util/types';
import { shinyArtworkUrl } from '../util/images';

/**
 * Kepala halaman detail: gambar besar, nomor, nama, type, tombol shiny & suara.
 *
 * Komponen ini SELALU bisa digambar, bahkan sebelum data lengkap datang -
 * cukup dengan id, nama, dan type dari kartu yang diklik. Itu bukan sekadar
 * demi kecepatan terasa: View Transitions memotret halaman baru segera setelah
 * rutenya berganti, dan kalau saat itu belum ada elemen ber-view-transition-name,
 * morf gambarnya gagal dan yang terlihat cuma dua halaman saling menumpuk.
 */
@Component({
  selector: 'app-pokemon-hero',
  imports: [NgOptimizedImage],
  host: { class: 'block' },
  template: `
    <header
      class="flex flex-wrap items-center gap-6 rounded-[18px] px-7 py-6 text-white transition-[background] duration-500"
      [style.background]="background()"
    >
      <!--
        Dua cabang, bukan satu img dengan src yang berubah. NgOptimizedImage
        MELEMPAR error kalau ngSrc diganti pada elemen yang sudah hidup
        (NG02953), dan menekan tombol shiny mengubah gambar tanpa berpindah
        halaman. Berpindah cabang @if membuat elemennya dibuat ulang.
      -->
      @if (shiny()) {
        <img
          class="h-44 w-44 shrink-0 object-contain filter-[drop-shadow(0_10px_20px_rgb(0_0_0/0.4))]"
          style="view-transition-name: pokemon-art"
          [ngSrc]="shinyUrl()"
          alt=""
          width="352"
          height="352"
        />
      } @else {
        <img
          class="h-44 w-44 shrink-0 object-contain filter-[drop-shadow(0_10px_20px_rgb(0_0_0/0.4))]"
          style="view-transition-name: pokemon-art"
          [ngSrc]="imageUrl()"
          alt=""
          width="352"
          height="352"
          priority
        />
      }

      <div class="min-w-[240px] flex-1">
        <p class="m-0 text-lg opacity-80">#{{ paddedId() }}</p>

        @if (name()) {
          <h1 class="m-0 text-4xl font-bold">{{ name() }}</h1>
        } @else {
          <!-- Dibuka langsung dari URL: namanya belum diketahui. -->
          <h1 class="m-0 h-10 w-56 animate-pulse rounded bg-white/20 text-4xl font-bold">
            <span class="sr-only">Memuat nama pokémon…</span>
          </h1>
        }

        <p class="m-0 mt-1 h-7 text-lg italic opacity-85">{{ genus() }}</p>

        <ul class="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
          @for (type of types(); track type) {
            <li
              class="rounded-full px-3 py-1 text-sm shadow-[0_0_0_1.5px_rgb(255_255_255/0.5)]"
              [style.background]="typeColor(type)"
            >
              {{ label(type) }}
            </li>
          }
        </ul>

        <div class="mt-4 flex flex-wrap gap-2">
          <!-- aria-pressed menandai tombol dua keadaan (nyala/mati),
               bukan tombol aksi biasa. -->
          <button
            type="button"
            class="cursor-pointer rounded-full border px-4 py-2 text-sm font-[inherit] text-white"
            [class]="
              shiny() ? 'border-white bg-black/45' : 'border-white/50 bg-black/25 hover:bg-black/40'
            "
            [attr.aria-pressed]="shiny()"
            (click)="shiny.set(!shiny())"
          >
            <span aria-hidden="true">✨</span> Shiny
          </button>

          @if (cryUrl()) {
            <!-- Elemen audio di template, bukan new Audio() di kelas.
                 preload="none" berarti file tidak diunduh sampai ditekan. -->
            <audio #cry preload="none" [src]="cryUrl()"></audio>
            <button
              type="button"
              class="cursor-pointer rounded-full border border-white/50 bg-black/25 px-4 py-2 text-sm font-[inherit] text-white hover:bg-black/40"
              (click)="playCry()"
            >
              <span aria-hidden="true">🔊</span> Putar suara
            </button>
          }
        </div>
      </div>
    </header>
  `,
})
export class PokemonHero {
  readonly pokemonId = input.required<number>();
  readonly name = input('');
  readonly genus = input('');
  readonly types = input<PokemonTypeName[]>([]);
  readonly imageUrl = input.required<string>();
  readonly cryUrl = input<string | null>(null);

  private readonly cryElement = viewChild<ElementRef<HTMLAudioElement>>('cry');

  /** Preferensi tampilan sesaat - sengaja TIDAK disimpan di URL. */
  protected readonly shiny = signal(false);

  protected readonly shinyUrl = computed(() => shinyArtworkUrl(this.pokemonId()));

  protected readonly paddedId = computed(() => String(this.pokemonId()).padStart(4, '0'));

  protected readonly background = computed(() => {
    const types = this.types();
    // Belum tahu type-nya (dibuka langsung dari URL): warna netral dulu, lalu
    // berubah halus ke gradient type saat datanya datang.
    return types.length ? typeGradient(types) : '#2a3341';
  });

  protected readonly label = formatTypeName;

  protected typeColor(type: PokemonTypeName): string {
    return TYPE_COLORS[type];
  }

  protected playCry(): void {
    const audio = this.cryElement()?.nativeElement;
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.35;
    void audio.play();
  }
}
