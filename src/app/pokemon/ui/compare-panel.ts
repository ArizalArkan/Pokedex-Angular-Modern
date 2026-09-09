import { Component, computed, input } from '@angular/core';
import { PokemonDetail } from '../models/pokemon.model';
import { formatTypeName, typeGradient } from '../util/types';

/**
 * Satu sisi perbandingan: pemilih, gambar, nama, type.
 *
 * Komponen ini memakai CONTENT PROJECTION lewat <ng-content>.
 *
 * Bedanya dengan input(): input mengirim DATA, content projection mengirim
 * MARKUP. Pemilih pokémon-nya ditulis oleh halaman induk, lalu "dititipkan"
 * untuk dirender di dalam panel ini.
 *
 * Kenapa tidak dibuat input saja? Karena panel ini tidak perlu tahu apa pun
 * tentang cara memilih pokémon - apakah dropdown, kotak pencarian, atau tombol
 * acak. Dia cuma menyediakan tempatnya. Itu membuat panel ini bisa dipakai
 * ulang di konteks lain tanpa diubah sama sekali.
 */
@Component({
  selector: 'app-compare-panel',
  host: { class: 'block flex-1 min-w-[260px]' },
  template: `
    <div class="rounded-[18px] p-5 text-white" [style.background]="background()">
      <!-- Di sinilah markup dari induk disisipkan. -->
      <ng-content />

      @if (pokemon(); as p) {
        <div class="mt-4 flex items-center gap-4">
          <!--
            <img> biasa di sini, BUKAN NgOptimizedImage - dan itu disengaja.

            NgOptimizedImage dirancang untuk gambar yang sumbernya sudah pasti
            saat elemen dibuat. Dia MELARANG ngSrc berubah setelah itu, dan
            memperingatkan kalau gambar LCP tidak ditandai priority (NG02955).

            Gambar di panel ini berganti setiap kali user memilih pokemon lain,
            jadi dua aturan itu justru melawan kita. Yang sebenarnya diberikan
            NgOptimizedImage - width/height untuk mencegah layout melompat, dan
            pengaturan prioritas muat - bisa kita tulis sendiri dalam tiga
            atribut. Pakai alat yang cocok dengan sifat datanya.
          -->
          <img
            class="h-28 w-28 shrink-0 object-contain filter-[drop-shadow(0_6px_12px_rgb(0_0_0/0.4))]"
            [src]="p.imageUrl"
            alt=""
            width="224"
            height="224"
            loading="eager"
            fetchpriority="high"
          />
          <div>
            <p class="m-0 text-sm opacity-80">#{{ paddedId() }}</p>
            <h2 class="m-0 text-2xl font-bold">{{ p.name }}</h2>
            <p class="m-0 mt-1 text-sm italic opacity-85">{{ typeLabel() }}</p>
          </div>
        </div>
      } @else if (loading()) {
        <div class="mt-4 h-28 animate-pulse rounded-xl bg-white/10" aria-hidden="true"></div>
      } @else {
        <p class="mt-4 mb-0 text-sm opacity-70">Belum ada pokémon dipilih.</p>
      }
    </div>
  `,
})
export class ComparePanel {
  readonly pokemon = input<PokemonDetail | undefined>();
  readonly loading = input(false);

  protected readonly background = computed(() => {
    const p = this.pokemon();
    return p ? typeGradient(p.types) : '#1e2530';
  });

  protected readonly paddedId = computed(() => String(this.pokemon()?.id ?? 0).padStart(4, '0'));

  protected readonly typeLabel = computed(() =>
    (this.pokemon()?.types ?? []).map(formatTypeName).join(', '),
  );
}
