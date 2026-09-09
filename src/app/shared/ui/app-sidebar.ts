import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { ICONS } from './icons';

export interface SidebarItem {
  label: string;
  /** Data path SVG dari ICONS. */
  iconPath: string;
  link: string;
  /** true hanya untuk halaman utama, supaya tidak ikut menyala di rute lain. */
  exact?: boolean;
  /** Angka kecil di kanan, misal jumlah item. Disembunyikan kalau 0. */
  badge?: number;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

/**
 * Menu samping aplikasi.
 *
 * Komponen ini GENERIK: dia tidak tahu apa pun soal pokémon. Menunya masuk
 * lewat input(), termasuk angka badge-nya. Itu yang menjaga aturan lapisan -
 * shared/ tidak boleh bergantung pada domain mana pun.
 *
 * Satu komponen, dua tampilan:
 *  - layar >= lg : menempel di kiri, selalu terlihat
 *  - layar < lg  : tombol hamburger membuka laci di atas konten
 *
 * Catatan kontras (semua diukur terhadap latar #131a24):
 *   slate-400 #94a3b8  6.82:1  dipakai untuk teks idle dan label seksi
 *   slate-600 #475569  2.31:1  GAGAL - warna "muted" yang menggoda tapi terlarang
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  host: { '(document:keydown.escape)': 'closeAndRefocus()' },
  template: `
    <!-- Batang atas, hanya di layar sempit. -->
    <div
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-[#131a24]/95 px-4 py-3 backdrop-blur lg:hidden"
    >
      <button
        #trigger
        type="button"
        class="cursor-pointer rounded-lg p-2 text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-paper"
        [attr.aria-expanded]="open()"
        aria-controls="menu-utama"
        [attr.aria-label]="open() ? 'Tutup menu' : 'Buka menu'"
        (click)="open.set(!open())"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            [attr.d]="open() ? icons.close : icons.menu"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <span class="flex items-center gap-2 font-semibold">
        <svg class="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            [attr.d]="icons.pokeball"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        {{ brand() }}
      </span>
    </div>

    <!-- Lapisan gelap di belakang laci. Mengkliknya menutup laci. -->
    @if (open()) {
      <div
        class="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
        (click)="open.set(false)"
      ></div>
    }

    <nav
      id="menu-utama"
      aria-label="Menu utama"
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5
             bg-gradient-to-b from-[#161e29] to-[#111720] transition-transform duration-200
             lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0
             motion-reduce:transition-none"
      [class]="open() ? 'translate-x-0' : '-translate-x-full'"
    >
      <!--
        Kepala laci, hanya di layar sempit.

        Perlu karena laci MENUTUPI batang atas beserta tombol hamburger-nya.
        Tanpa tombol tutup di sini, satu-satunya cara keluar adalah menebak:
        tekan Escape atau klik area gelap. Keduanya tidak terlihat, dan itu
        bukan sesuatu yang boleh diharapkan diketahui pengguna.
      -->
      <div class="flex items-center justify-between px-5 py-4 lg:hidden">
        <span class="flex items-center gap-2 font-semibold">
          <svg class="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              [attr.d]="icons.pokeball"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          {{ brand() }}
        </span>
        <button
          type="button"
          class="cursor-pointer rounded-lg p-2 text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-paper"
          aria-label="Tutup menu"
          (click)="closeAndRefocus()"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              [attr.d]="icons.close"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- Kepala: penanda merek. Hanya di layar lebar, karena di layar sempit
           sudah ada di batang atas. -->
      <div class="hidden items-center gap-2.5 px-5 py-5 lg:flex">
        <span
          class="grid h-9 w-9 place-items-center rounded-xl bg-sky-400/10 text-sky-400 ring-1 ring-sky-400/20"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              [attr.d]="icons.pokeball"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <span>
          <span class="block leading-tight font-semibold">{{ brand() }}</span>
          <span class="block text-xs text-[#94a3b8]">{{ tagline() }}</span>
        </span>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-4">
        @for (group of groups(); track group.label) {
          <p
            class="px-3 pt-5 pb-2 text-[0.7rem] font-semibold tracking-[0.14em] text-[#94a3b8] uppercase"
          >
            {{ group.label }}
          </p>

          @for (item of group.items; track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="!bg-white/[0.07] !text-paper before:h-5 [&_svg]:text-sky-400"
              [routerLinkActiveOptions]="item.exact ? exactMatch : looseMatch"
              ariaCurrentWhenActive="page"
              (click)="open.set(false)"
              class="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
                     text-[#94a3b8] transition-colors duration-150 hover:bg-white/5 hover:text-paper
                     before:absolute before:top-1/2 before:left-0 before:h-0 before:w-[3px]
                     before:-translate-y-1/2 before:rounded-r-full before:bg-sky-400
                     before:transition-all before:duration-200
                     motion-reduce:transition-none motion-reduce:before:transition-none"
            >
              <svg
                class="h-[18px] w-[18px] shrink-0 text-[#94a3b8] transition-colors group-hover:text-paper"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  [attr.d]="item.iconPath"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <span class="flex-1">{{ item.label }}</span>

              @if (item.badge) {
                <!-- tabular-nums membuat lebar tiap angka sama, jadi badge
                     tidak bergeser-geser saat angkanya berubah. -->
                <span
                  class="rounded-md bg-white/5 px-1.5 py-0.5 text-[0.7rem] tabular-nums text-[#94a3b8]"
                >
                  {{ item.badge }}
                </span>
              }
            </a>
          }
        }
      </div>

      <div class="border-t border-white/5 px-5 py-4">
        <a
          href="https://pokeapi.co"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-[#94a3b8] transition-colors hover:text-paper"
        >
          Data dari PokeAPI ↗
        </a>
      </div>
    </nav>
  `,
})
export class AppSidebar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly groups = input.required<SidebarGroup[]>();
  readonly brand = input('Pokédex');
  readonly tagline = input('');

  protected readonly icons = ICONS;
  protected readonly open = signal(false);

  /**
   * queryParams: 'ignored' itu WAJIB di sini.
   *
   * Halaman utama sering ber-URL /?q=char&type=fire. Kalau query parameter ikut
   * dibandingkan, menu "Semua pokémon" akan padam begitu user memfilter -
   * padahal dia jelas-jelas sedang berada di halaman itu.
   */
  protected readonly exactMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  protected readonly looseMatch: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected closeAndRefocus(): void {
    if (!this.open()) return;
    this.open.set(false);
    // Fokus dikembalikan ke tombol hamburger, bukan dibiarkan hilang. Tanpa
    // ini pengguna keyboard terlempar ke awal halaman setiap menutup menu.
    this.trigger()?.nativeElement.focus();
  }
}
