import { computed, Service, signal } from '@angular/core';
import { Params } from '@angular/router';
import { Pokemon } from '../models/pokemon.model';

/**
 * Ingatan yang harus hidup lebih lama daripada komponen mana pun.
 *
 * Komponen dihancurkan saat berpindah rute, jadi apa pun yang perlu diingat
 * LINTAS halaman tidak boleh disimpan di dalamnya. Ada dua hal seperti itu:
 *
 * 1. POKEMON YANG DIKLIK — dipakai untuk dua hal sekaligus:
 *
 *    a. View Transitions mencocokkan `view-transition-name` yang sama di
 *       halaman lama dan baru. Syaratnya satu nama hanya boleh dipakai satu
 *       elemen, jadi hanya kartu yang diklik yang diberi nama.
 *
 *    b. Halaman detail butuh ~1 detik memuat datanya. Dengan menitipkan nama,
 *       nomor, type, dan gambar di sini, header detail bisa digambar SEKETIKA.
 *       Itu bukan sekadar demi kecepatan terasa: kalau saat dipotret yang ada
 *       cuma skeleton, tidak ada elemen untuk dimorf dan transisinya gagal.
 *
 * 2. ALAMAT KEMBALI — halaman daftar mana yang tadi ditinggalkan, lengkap
 *    dengan filternya.
 *
 *    Link "Kembali" di halaman detail adalah navigasi BARU, bukan tombol Back
 *    browser. Jadi ia harus tahu sendiri harus pulang ke mana. Dulu jalurnya
 *    dipatok '/' — akibatnya user yang masuk detail dari halaman Mega
 *    Evolution atau Gigantamax malah terlempar ke daftar utama.
 *
 *    Yang disimpan bukan cuma query parameter, tapi juga JALUR dan LABEL-nya,
 *    supaya tombolnya bisa berbunyi "Kembali ke Mega Evolution" dan benar-benar
 *    pulang ke sana.
 */
/** Alamat pulang dari halaman detail. */
export interface ReturnTarget {
  /** Jalur rute, misal '/' atau '/mega'. */
  path: string;
  /** Filter yang sedang aktif di halaman itu. */
  query: Params;
  /** Dipakai di teks tombol: "Kembali ke {label}". */
  label: string;
}

@Service()
export class PokemonNavigation {
  /** Pokémon yang diklik, atau null kalau halaman detail dibuka langsung dari URL. */
  readonly active = signal<Pokemon | null>(null);

  readonly activeId = computed(() => this.active()?.id ?? null);

  /** Halaman daftar terakhir yang ditinggalkan user, lengkap dengan filternya. */
  readonly returnTo = signal<ReturnTarget>({ path: '/', query: {}, label: 'daftar' });
}
