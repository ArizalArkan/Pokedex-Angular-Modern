import { Component, computed, ElementRef, inject, input, model, signal } from '@angular/core';

export interface MultiSelectOption<T> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-multi-select',
  host: {
    class: 'relative inline-block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closeAndRefocus()',
  },
  template: `
    <button
      type="button"
      class="flex min-w-47.5 cursor-pointer items-center justify-between gap-6 rounded-[10px] border bg-[#1a212b] px-[0.9rem] py-[0.7rem] text-left font-[inherit]"
      [class]="triggerClasses()"
      [attr.aria-expanded]="isOpen()"
      (click)="isOpen.set(!isOpen())"
    >
      <span class="overflow-hidden text-ellipsis whitespace-nowrap">
        {{ triggerLabel() }}
      </span>
      <span class="shrink-0 text-[#94a3b8]" aria-hidden="true">▾</span>
    </button>

    @if (isOpen()) {
      <div
        class="absolute top-[calc(100%+4px)] left-0 z-10 max-h-75 min-w-full overflow-y-auto rounded-[10px] border border-[#2c3644] bg-[#161c25] p-[0.4rem] shadow-[0_12px_28px_rgb(0_0_0/0.5)]"
        role="group"
        [attr.aria-label]="label()"
      >
        @for (option of options(); track option.value) {
          <label
            class="flex cursor-pointer items-center gap-[0.6rem] rounded-md px-[0.6rem] py-[0.45rem] whitespace-nowrap hover:bg-[#222b37]"
          >
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer accent-[#38bdf8]"
              [checked]="isSelected(option.value)"
              (change)="toggle(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        }
      </div>
    }
  `,
})
export class MultiSelect<T extends string | number> {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input.required<string>();
  readonly options = input.required<MultiSelectOption<T>[]>();

  /**
   * model() = input DAN output sekaligus, untuk two-way binding [(selected)].
   *
   * Alternatif lamanya: input() `selected` + output() `selectedChange`, lalu
   * setiap kali berubah harus memanggil .emit() manual. model() menggabungkan
   * keduanya — panggil .set()/.update(), Angular yang mengurus emit-nya.
   */
  readonly selected = model<T[]>([]);

  protected readonly isOpen = signal(false);

  /**
   * Warna kondisional dirakit di computed(), bukan lewat [class.xxx] terpisah.
   *
   * Alasannya khas Tailwind: `border-[#2c3644]` dan `border-sky-300` sama-sama
   * mengatur border-color dengan spesifisitas yang sama, jadi yang menang
   * ditentukan urutan di file CSS hasil generate — bukan urutan di template.
   * Menyalakan dua-duanya berarti hasilnya tidak bisa diprediksi. Dengan
   * computed(), hanya satu set kelas yang pernah aktif.
   */
  protected readonly triggerClasses = computed(() =>
    this.selected().length > 0
      ? 'border-sky-300 text-paper'
      : 'border-[#2c3644] text-[#cbd5e1] hover:border-[#3d4a5c]',
  );

  protected readonly triggerLabel = computed(() => {
    const chosen = this.selected();
    if (chosen.length === 0) return this.label();
    if (chosen.length === 1) {
      return this.options().find((o) => o.value === chosen[0])?.label ?? this.label();
    }
    return `${chosen.length} selected`;
  });

  protected isSelected(value: T): boolean {
    return this.selected().includes(value);
  }

  protected toggle(value: T): void {
    // .update() dan bukan .mutate(): kita membuat array BARU, tidak mengubah
    // array lama. Signal mendeteksi perubahan dengan membandingkan referensi,
    // jadi memodifikasi array di tempat tidak akan memicu apa pun.
    this.selected.update((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  protected closeAndRefocus(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    // Fokus dikembalikan ke trigger. Tanpa ini, pengguna keyboard yang menekan
    // Escape kehilangan posisi fokusnya dan terlempar ke awal halaman.
    this.elementRef.nativeElement.querySelector('button')?.focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const clickedInside = this.elementRef.nativeElement.contains(event.target as Node);
    if (!clickedInside) this.isOpen.set(false);
  }
}
