# Desain: Halaman List Pokémon

Tanggal: 2026-09-04
Status: disetujui

## Tujuan

Halaman pertama Pokedex: menampilkan 151 pokémon generasi 1 sebagai grid kartu.
Setiap kartu berisi nama, nomor, daftar type, gambar, dan latar gradient sesuai type.

Ini projek belajar. Prioritasnya kejelasan konsep Angular, bukan optimasi.

## Bukan bagian dari iterasi ini

Search, filter generation, filter type, badge jumlah forms, halaman detail.
Desain ini menyiapkan tempatnya: semua data ada di satu signal `Pokemon[]`,
sehingga fitur-fitur itu nanti cukup jadi `computed()` di atasnya.

## Batasan dari PokeAPI

- `GET /pokemon?limit=151` hanya mengembalikan `{ name, url }` — tanpa types, tanpa gambar.
- `GET /pokemon/{id}` lengkap, tapi satu request per pokémon.

Keputusan: service melakukan 1 request daftar + 151 request detail paralel,
lalu memetakannya ke model internal. Alternatif "tiap kartu fetch sendiri"
ditolak karena menyebarkan data type ke 151 komponen, membuat filter sulit.

## Struktur

    src/app/
    ├── app.config.ts                      provideHttpClient()
    ├── app.routes.ts                      lazy load halaman list
    ├── core/pokemon/
    │   ├── pokemon.model.ts               PokeApiPokemon (mentah) + Pokemon (internal)
    │   ├── pokemon-type.data.ts           TYPE_COLORS: Record<PokemonTypeName, string>
    │   └── pokemon-api.ts                 @Service, HttpClient, mapping mentah → internal
    └── features/pokemon-list/
        ├── pokemon-list-page.ts           smart: rxResource, loading/error/success
        └── pokemon-card.ts                dumb: input() Pokemon, render saja

## Alur data

    PokemonApi.loadGeneration1(): Observable<Pokemon[]>
      GET /pokemon?limit=151
        → switchMap → forkJoin(151 × GET /pokemon/{id})
          → map(toPokemon)

    PokemonListPage
      pokemons = rxResource({ stream: () => api.loadGeneration1(), defaultValue: [] })
        isLoading() → 12 skeleton card
        error()     → pesan + tombol "Coba lagi" (pokemons.reload())
        value()     → @for → <app-pokemon-card [pokemon]="p" />

## Model internal

    interface Pokemon {
      id: number;
      name: string;
      types: PokemonTypeName[];
      imageUrl: string;
    }

Alasan memisahkan model internal dari bentuk API: struktur PokeAPI yang dalam
(`sprites.other['official-artwork'].front_default`) tidak boleh bocor ke komponen.
Kalau API berubah, hanya satu fungsi mapping yang perlu diedit.

## Warna & aksesibilitas

`TYPE_COLORS` memakai versi gelap dari warna type resmi, dipilih agar rasio kontras
terhadap teks putih ≥ 4.5:1 (WCAG AA). Kartu dengan satu type memakai warna solid,
dua type memakai `linear-gradient` dari warna pertama ke kedua.

Gambar memakai `NgOptimizedImage` dengan `width`/`height` eksplisit; kartu baris
pertama diberi `priority` untuk LCP.

## Penanganan error

`forkJoin` bersifat semua-atau-gagal-semua: satu request detail gagal → seluruh
resource masuk state error. Perilaku ini diterima untuk iterasi ini karena jujur
dan sederhana. Penanganan per-item dengan `catchError` dicatat sebagai komentar
di kode untuk latihan berikutnya.

## Verifikasi

- `npm run build` lolos tanpa error TypeScript.
- Aplikasi dijalankan, 151 kartu tampil dengan gambar dan warna benar.

---

# Iterasi 2: Search + Filter (2026-09-05)

## Perubahan arsitektur data

Iterasi 1 memakai 1 request daftar + N request detail. Untuk gen 1 (151) itu
masuk akal. Untuk seluruh 1025 pokémon jadi 1026 request — tidak masuk akal.

Diganti menjadi 19 request yang dijalankan paralel:

    GET /pokemon?limit=1025      1 request   → id + nama
    GET /type/{nama} × 18       18 request   → pemetaan type per pokémon
    gambar                       0 request   → diturunkan dari id (pola URL sprite)
    generation                   0 request   → diturunkan dari id (tabel konstanta)

Tidak ada lagi `switchMap` — request tidak saling bergantung, cukup `forkJoin`.

Terverifikasi: 19 request, 1.7 detik, 1025 pokémon, 0 tanpa type, jumlah per
generasi cocok dengan angka resmi (151/100/135/107/156/72/88/96/120).

Entry dengan id > 1025 (form Mega, Gigantamax, dll) disaring.

Tidak ada komponen yang perlu diubah karena penggantian ini — bukti bahwa
pemisahan model internal dari bentuk API memang berfungsi.

## Filter

Tiga signal terpisah di `PokemonListPage`: `searchTerm`, `selectedGenerations`,
`selectedTypes`. Satu `computed()` menggabungkan ketiganya di atas data mentah.
Array filter kosong berarti "tidak difilter". Filter type memakai logika ATAU
(`.some()`).

Search mencocokkan nama (lowercase, tanda hubung jadi spasi) dan nomor, baik
"25" maupun "0025". Tanpa debounce: filter in-memory atas 1025 item selesai
dalam hitungan mikrodetik; debounce baru relevan untuk pencarian sisi server.

## Komponen baru

`MultiSelect<T>` — dropdown checkbox generik, dipakai dua kali (generation dan
type). Two-way binding lewat `model()`. Trigger `<button>` asli dengan
`aria-expanded`, isi `<input type="checkbox">` asli di dalam `<label>`, Escape
menutup dan mengembalikan fokus.

## Styling

Projek dikonversi ke Tailwind v4 di luar sesi ini. Semua komponen memakai
utility class; blok `styles:` dihapus. Warna kondisional dirakit di `computed()`
dan bukan lewat beberapa `[class.x]`, karena dua utility warna dengan
spesifisitas sama membuat pemenangnya ditentukan urutan CSS hasil generate.

## Performa

1025 kartu di DOM. Ditangani dengan `content-visibility: auto` +
`contain-intrinsic-size` pada kartu — browser melewati layout dan paint untuk
kartu di luar layar. Murni CSS, tanpa virtual scrolling.

## Belum dikerjakan

Badge jumlah forms, halaman detail, virtual scrolling, tes unit untuk logika
filter dan pemetaan API.

---

# Iterasi 3: Infinite scroll + perbaikan bug kartu kosong (2026-09-06)

## Bug: kartu kosong saat memfilter

Gejala: sebagian kartu tidak tergambar (kotak kosong) setelah mengetik di search,
lalu muncul normal kalau dicoba ulang.

Akar masalah: `NG02953`. Kartu memakai `[priority]="i < 6"`. `@for ... track p.id`
memakai ulang instance komponen, sehingga saat urutan berubah karena filter,
input `priority` berubah pada elemen `<img>` yang sudah hidup. NgOptimizedImage
melarang itu dan melempar error, yang menghentikan siklus render Angular
di tengah jalan — kartu sesudahnya tidak pernah digambar.

Dua hipotesis yang DIBANTAH lebih dulu, keduanya dengan bukti piksel:
 1. `content-visibility: auto` — screenshot dengan dan tanpa properti ini identik.
 2. Gambar gagal dimuat — nyata, tapi masalah terpisah (lihat bawah).

Perbaikan: tiga cabang `@if` (fallback / priority / biasa) sehingga perpindahan
status membuat elemen dihancurkan dan dibuat ulang, bukan input yang diubah.
Ini solusi yang disarankan pesan error Angular itu sendiri.

Pelajaran proses: console browser tidak diperiksa sampai dua hipotesis gugur.
Errornya ada di sana sejak awal.

## Gambar

Artwork PokeAPI berukuran 118–150 KB per gambar → ~151 MB untuk 1025 kartu.
Terukur: 13 dari 60 request paralel ke raw.githubusercontent.com GAGAL.

Mitigasi:
 - Infinite scroll membatasi gambar yang dimuat (~15 sekaligus, ~2 MB).
 - Fallback ke sprite 96×96 (597 byte) lewat `(error)`, di-reset oleh
   `linkedSignal` yang bersumber pada `pokemon().id`.
 - `<link rel="preconnect">` ke host gambar (saran NG02956).

## Infinite scroll

`visibleCount` = `linkedSignal` bersumber pada hasil filter, sehingga otomatis
kembali ke 15 setiap filter berubah — aturan reset ditulis satu kali, bukan
diulang di setiap handler.

`IntersectionObserver` pada elemen sentinel, `rootMargin: 600px`, dipasang di
dalam `effect()` dengan `onCleanup` untuk membuang observer. Observer di-observe
ulang tiap penambahan, karena IntersectionObserver hanya menembak saat status
berubah dan sentinel bisa tetap terlihat di layar lebar.

`content-visibility` dibuang: tidak lagi diperlukan setelah DOM hanya berisi
belasan kartu.

Terverifikasi di browser: awal 15 kartu / 15 request gambar; scroll → 30, 45, 60;
ketik "k" → kembali ke 15; console bersih dari error.

## Belum dikerjakan

Badge jumlah forms, halaman detail, tes unit untuk logika filter dan mapping API
(tes yang ada baru satu, dan hanya memeriksa komponen root berhasil dibuat).

---

# Iterasi 4: Halaman detail + transisi (2026-09-06)

## Rute

`/pokemon/:id`, lazy loaded. `withComponentInputBinding()` memetakan parameter
rute langsung ke `input.required<string>('id')` — tidak perlu inject
ActivatedRoute maupun berlangganan paramMap.

`rxResource({ params: () => Number(this.id()), stream: ... })` — `params`
membuat resource memuat ulang otomatis saat :id berubah, misalnya saat user
mengklik tahap evolusi lain. Terverifikasi: /pokemon/3 → klik Bulbasaur →
/pokemon/1 dengan data yang benar.

## Data detail

`loadDetail(id)` memakai forkJoin DAN switchMap, dengan alasan berbeda:
 - forkJoin: /pokemon/{id} dan /pokemon-species/{id} independen → paralel.
 - switchMap: URL rantai evolusi baru diketahui setelah species datang.

Rantai evolusi berbentuk pohon rekursif (`evolves_to` menunjuk ke tipe dirinya
sendiri) karena evolusi bisa bercabang — Eevee punya delapan cabang. Diratakan
dengan fungsi rekursif + flatMap, menyimpan `depth` tiap tahap.

## Transisi seamless

`withViewTransitions({ skipInitialTransition: true })`.

Kunci morph gambar: `view-transition-name: pokemon-art` harus ada di TEPAT SATU
elemen pada masing-masing halaman. Karena itu nama hanya diberikan pada kartu
yang diklik, dikoordinasikan lewat service singleton `PokemonTransition` yang
menyimpan `activeId`. Memberi nama ke semua kartu akan membatalkan transisi
(nama duplikat) dan memaksa browser memotret puluhan elemen.

CSS di styles.css menyetel durasi: root 220ms, pokemon-art 420ms dengan easing
melesat-lalu-mendarat. Potret lama/baru gambar di-set `animation: none` supaya
tidak berkedip saat ukurannya berubah (110px → 176px).

Seluruh animasi dimatikan di bawah `prefers-reduced-motion: reduce`.
Terverifikasi tergenerate di CSS hasil build.

## Hover kartu

Kartu jadi `<a routerLink>` asli — bisa di-Tab, Ctrl+klik, disalin alamatnya,
dan dibacakan screen reader sebagai tautan. Efek: kartu terangkat 4px dengan
bayangan, gambar membesar 112% dan miring -6°, plus glow warna type. Murni CSS
lewat `group-hover`, nol JavaScript. Tailwind membungkus hover dalam
`@media (hover:hover)` sehingga tidak aktif di layar sentuh.

## CACAT YANG DIKETAHUI: state filter hilang saat Back

Terverifikasi: filter "char" (7 hasil) → masuk detail → tekan Back → filter
kosong, 1025 hasil, dan posisi scroll hilang.

Penyebab: state filter tinggal di dalam komponen, yang dihancurkan saat
berpindah rute.

Perbaikan yang disarankan (belum dikerjakan): pindahkan searchTerm,
selectedGenerations, selectedTypes ke query parameter URL, dibaca lewat
`withComponentInputBinding()`. Selain menyelesaikan Back, URL jadi bisa
dibagikan dan di-bookmark. Menulisnya pakai `replaceUrl: true` supaya tiap
ketikan tidak menumpuk riwayat.

## Belum dikerjakan

Badge jumlah forms, judul halaman dinamis (masih statis "Detail pokémon"),
tes unit untuk logika filter, mapping API, dan perataan pohon evolusi.

---

# Iterasi 5: Perbaikan gambar "nyangkut" saat transisi (2026-09-06)

Gejala: saat masuk dan keluar halaman detail, dua gambar pokémon terlihat
bersamaan dan halaman lama membayang di belakang halaman baru.

## Diagnosis

`document.getAnimations()` menunjukkan hanya animasi `root` yang berjalan —
tidak ada `pokemon-art` sama sekali. Jadi morf shared-element TIDAK PERNAH
terjadi; yang terlihat cuma silang-pudar seluruh halaman, dan karena kedua
halaman punya gambar pokémon masing-masing, terlihat dua gambar.

Penyebabnya sama di kedua arah: pada frame saat View Transitions memotret
halaman baru, elemen ber-view-transition-name belum ada.

 - Masuk ke detail: halaman detail masih isLoading() → yang tampil skeleton.
 - Keluar ke daftar: komponen daftar dibuat ulang, resource berjalan lagi,
   19 request ditembak ulang (terukur), daftar masih kosong.

## Perbaikan

1. `PokemonTransition` kini menyimpan objek `Pokemon` yang diklik, bukan hanya
   id-nya. Halaman detail memakainya untuk menggambar header LENGKAP seketika
   (gambar, nomor, nama, type), lalu mengisi stats/evolusi saat data datang.
   Urutan sumber: data lengkap → data dari kartu yang diklik → hanya nomor dari
   URL (gambar tetap bisa ditebak dari id).

2. `PokemonStore` (@Service, singleton) kini memiliki resource daftar, bukan
   komponen. Data hidup selama aplikasi hidup, jadi setelah Back kartu
   tergambar di frame pertama.

3. CSS: `animation: none` pada ::view-transition-old/new(pokemon-art) DIHAPUS —
   itu membuat kedua potret tampil penuh bersamaan. Diganti durasi yang
   disamakan dengan wadahnya (420ms) plus height:100% + object-fit:contain.

4. URL gambar dipindah ke `pokemon-image.ts` (artworkUrl / spriteUrl),
   menghapus tiga salinan string yang sama.

## Verifikasi (CPU diperlambat 6x, jaringan 1,5 Mbps)

 - Request PokeAPI saat Back: 19 → 0
 - Animasi transisi saat Back: 6 (tanpa morf) → 10 (morf jalan)
 - Masuk: mulai 506ms, selesai 1047ms, 0 animasi tersisa
 - Keluar: mulai 80ms, selesai 548ms, 0 animasi tersisa
 - Judul pokémon tampil seketika di halaman detail (tidak lagi skeleton)

## Belum dikerjakan

State filter masih hilang saat Back (lihat Iterasi 4) — perbaikannya query
parameter URL. Badge jumlah forms, judul halaman dinamis, unit test.

---

# Iterasi 6: State filter pindah ke query parameter URL (2026-09-06)

Menutup cacat dari Iterasi 4: filter hilang saat menekan Back.

## Bentuk URL

    /?q=char&gen=1,3&type=fire,water

Dibaca lewat `withComponentInputBinding()` sebagai input `q`, `gen`, `type`.
searchTerm / selectedGenerations / selectedTypes kini `computed()` dari input
itu — bukan lagi signal yang bisa ditulis. URL adalah satu-satunya sumber
kebenaran, jadi tidak ada state bayangan yang bisa bertentangan.

Nilai dari URL DISARING, tidak dipercaya: `?gen=99` dan `?type=abc` diabaikan.

## Menulis balik

`router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })`.
Nilai kosong dikirim sebagai `null` agar parameternya dihapus dari URL.
`replaceUrl: true` supaya mengetik 9 huruf tidak meninggalkan 9 entri riwayat
(terukur: 0 entri tambahan). Tombol Reset sengaja TIDAK memakai replaceUrl,
supaya Back bisa mengembalikan filter yang barusan dihapus.

MultiSelect kini dipakai dengan binding satu arah `[selected]` +
`(selectedChange)`, bukan `[(selected)]`, karena sumbernya computed.
`model()` mendukung kedua gaya pemakaian itu.

## Bug yang ditemukan saat verifikasi

`withComponentInputBinding()` mengisi input dengan `undefined` saat query
param-nya tidak ada — nilai default `input('')` TIDAK dipakai. Akibatnya
`this.gen().split(',')` melempar TypeError, dan error itu menghentikan siklus
render sehingga tombol Reset tampak rusak padahal URL-nya sudah bersih.

Perbaikan: tipe input ditulis apa adanya `input<string | undefined>('')` dan
ditangani dengan `?? ''`. Tipe yang berbohong tentang runtime lebih berbahaya
daripada tidak ada tipe.

## Verifikasi

 - Buka langsung `/?q=char&type=fire&gen=99` → search terisi "char", chip
   "Fire" aktif, gen=99 diabaikan, 5 hasil.
 - Mengetik 4 huruf → 0 entri riwayat tambahan.
 - Masuk detail → Back → filter kembali utuh (5 kartu, "char").
 - Reset → URL bersih, 1025 hasil.
 - Console bersih.
 - View transition tetap utuh dua arah (10 animasi, 0 tersisa).

## Belum dikerjakan

Badge jumlah forms, judul halaman dinamis, migrasi service ke GraphQL
(19 request → 1), unit test untuk logika filter, mapping API, dan perataan
pohon evolusi.

---

# Iterasi 6b: Link "Kembali ke daftar" ikut membawa filter (2026-09-06)

Iterasi 6 dinyatakan selesai terlalu cepat. Filter memang bertahan saat menekan
tombol Back BROWSER, tapi tetap hilang saat mengklik link "Kembali ke daftar"
di halaman detail.

Penyebab: link itu `routerLink="/"` — navigasi BARU tanpa query parameter.
Tombol Back browser memulihkan URL lengkap; link di halaman tidak.

Kesalahan proses: pengujian memakai `history.back()`, bukan mengklik link yang
sebenarnya dipakai user. Tesnya lulus, produknya tetap rusak. Uji jalur yang
BENAR-BENAR dilewati user, bukan jalur yang paling gampang diotomasi.

## Perbaikan

`PokemonTransition` diganti nama jadi `PokemonNavigation` (namanya kini
menanggung dua hal: pokémon yang diklik DAN alamat kembali) dan menambah
`listQuery = signal<Params>({})`.

Komponen daftar mencatat filter aktifnya ke sana lewat `effect()`. Halaman
detail memakainya: `<a routerLink="/" [queryParams]="listQuery()">`.

## Verifikasi

 - href tombol kembali: `/` → `/?q=char&type=fire`
 - Klik link kembali → filter utuh (5 kartu, "char")
 - Tombol Back browser → tetap utuh
 - View transition tetap 10 animasi dua arah, 0 tersisa
 - Console bersih, build dan test lolos

---

# Iterasi 7: Varian + shiny, dan halaman banding (2026-09-06)

## Hasil eksplorasi PokeAPI

Yang tersedia tapi belum dipakai: `type.damage_relations` (efektivitas type —
datanya SUDAH kita unduh lewat 18 request /type, cuma dibuang),
`species.varieties` (Pikachu punya 17), sprite shiny, `evolution_details`
(trigger/level/item), `/pokemon/{id}/encounters` (40 lokasi untuk Pikachu),
937 move dengan power/accuracy.

## Varian + tombol shiny (halaman detail)

`species.varieties` dipetakan ke `PokemonVariety[]`. Artwork varian terverifikasi
ada untuk id form (10080 dst). Artwork shiny ada di `official-artwork/shiny/{id}.png`
untuk semua 1025.

Bagian varian dibungkus `@defer (on viewport)` dengan `@placeholder`.
Terukur: sebelum scroll hanya 3 request artwork; setelah scroll +17.
Untuk Pikachu itu ~2 MB yang tidak diunduh kalau user tidak scroll ke bawah.

Tombol shiny memakai `@if` dua cabang, bukan mengganti ngSrc — alasan yang sama
dengan NG02953 di Iterasi 4. `aria-pressed` menandai tombol dua keadaan.
Terverifikasi: src berubah 25.png → shiny/25.png, gambar termuat dalam 400ms.

## Halaman banding (/compare?a=25&b=6)

Konsep baru:
 - **Signal Forms** (`@angular/forms/signals`): `form(model, schema)` dengan
   `schema()` + `required()`. Direktif `[formField]` mengikat `<select>`.
   Catatan: direktifnya mendengarkan event `input`, bukan `change`.
 - **Content projection** (`<ng-content>`): ComparePanel menyediakan tempat,
   induk yang menentukan markup pemilihnya. Panel tidak tahu apa-apa soal
   dropdown, jadi bisa dipakai ulang dengan pemilih jenis lain.
 - **`@let`** di template untuk statB / menangA / menangB, menghindari
   pengulangan `b.stats[i].value` lima kali.

Nilai awal dibaca SEKALI dari `route.snapshot`, bukan input reaktif, lalu
ditulis satu arah form → URL. Kalau dua-duanya reaktif, URL dan form saling
memicu tanpa henti.

Chunk halaman ini 65 kB (pustaka Signal Forms) — hanya diunduh saat rute
/compare dibuka, karena lazy loaded.

## Gambar di panel banding memakai <img> biasa

NgOptimizedImage melarang ngSrc berubah dan memperingatkan gambar LCP tanpa
priority (NG02955 muncul saat verifikasi). Gambar panel berganti tiap kali user
memilih pokémon lain, jadi aturan itu melawan tujuannya. width/height dan
fetchpriority ditulis manual — tiga atribut, tanpa melawan directive.

## Verifikasi

 - /compare?a=25&b=6 → Pikachu vs Charizard, 6 baris stat, "Total 320
   berbanding 534 — Charizard unggul"
 - 1026 opsi di dropdown (1025 + placeholder)
 - Ganti dropdown → URL ikut berubah ke ?a=25&b=9, panel jadi Blastoise
 - Console bersih, build dan test lolos

## Belum dikerjakan

Kalkulator efektivitas type (damage_relations sudah diunduh, tinggal dipakai),
unit test sungguhan, migrasi GraphQL, judul halaman dinamis.

---

# Iterasi 8: Kelemahan type, syarat evolusi, lokasi, Mega (2026-09-06)

## Unit test pertama yang sungguhan

Ditulis SEBELUM implementasinya (TDD). Dua modul fungsi murni:

 - `type-effectiveness.ts` — 7 test. Menguji rumus perkalian, termasuk kasus
   kekebalan mengalahkan kelemahan (steel+flying vs ground = 0, bukan 2).
 - `evolution-condition.ts` — 8 test. Menguji perangkuman syarat evolusi.

Total 16 test. Keduanya fungsi murni: tanpa jaringan, tanpa signal, tanpa
Angular. Test-nya selesai dalam hitungan milidetik dan tidak bisa gagal karena
internet mati.

## Kalkulator kelemahan — nol request tambahan

`damage_relations` ternyata sudah ikut terunduh sejak Iterasi 2 lewat 18
request /type, tapi selama enam iterasi kita membuangnya. Sekarang `loadAll()`
mengembalikan `PokedexData { pokemons, megas, typeChart }`.

Terverifikasi untuk Charizard (Fire+Flying): Rock ×4, Water/Electric ×2,
Fire/Fighting/Steel/Fairy ×0.5, Grass/Bug ×0.25, Ground ×0. Sesuai tabel resmi.

## Syarat evolusi

`evolution_details` dipetakan jadi kalimat pendek dan disimpan pada tahap
TUJUAN, bukan tahap asal. Terverifikasi: Charmeleon "Level 16", Charizard
"Level 36". Eevee adalah kasus terkaya (8 cabang: batu, happiness+waktu,
lokasi).

## Lokasi ditemukan

Komponen `PokemonEncounters` terpisah, dibungkus `@defer (on viewport)`.
Pemisahan komponen itu WAJIB: @defer menunda pembuatan komponen, jadi kalau
resource-nya ditaruh di kelas halaman detail, request-nya tetap jalan saat
halaman dibuka.

Terverifikasi: 0 request API sebelum scroll, `/pokemon/6/encounters` muncul
hanya setelah menggulir. Komponennya juga jadi chunk JS terpisah.

## Halaman Mega Evolution — juga nol request tambahan

97 bentuk Mega, dikenali dari pola nama `-mega`. Endpoint /type ternyata
memuat bentuk-bentuk ini lengkap dengan slot type; sebelumnya kita menyaring
id > 1025 keluar. Sekarang disimpan sebagai `megas` di store.

`PokemonCard` dipakai ulang apa adanya — buah dari memisahkan komponen "bodoh"
sejak awal.

## Perbaikan: ikuti tautan API, jangan menebak URL

`loadDetail` dulu menyusun sendiri `/pokemon-species/{id}` dan menembaknya
paralel dengan `/pokemon/{id}`. Itu 404 untuk bentuk Mega: id 10034 tidak punya
species dengan id yang sama — species-nya charizard (id 6), dan PokeAPI sudah
memberi tahu lewat field `species.url`.

Sekarang tiga request berurutan mengikuti tautan. Biayanya satu perjalanan
jaringan (~250 ms), dan tidak terasa karena header detail sudah digambar
seketika dari data kartu.

Terverifikasi: /pokemon/10034 → "Charizard Mega X", type Fire/Dragon (berbeda
dari Fire/Flying bentuk aslinya), deskripsi termuat.

## Belum dikerjakan

Migrasi GraphQL (19 request → 1), judul halaman dinamis, infinite scroll di
halaman /mega (97 kartu sekaligus, meski gambarnya tetap lazy), test untuk
logika filter dan mapping API.

---

# Iterasi 9: Restrukturisasi codebase (2026-09-06)

Refactor murni — nol perubahan perilaku, diverifikasi ulang di browser.

## Masalah yang diperbaiki (terukur, bukan selera)

1. Kebocoran antar-fitur: `features/pokemon-mega` mengimpor `PokemonCard` dan
   `MultiSelect` dari `features/pokemon-list`. Fitur bergantung pada fitur lain
   hanya untuk meminjam komponen umum.
2. File terlalu besar: detail-page 442 baris (tujuh tanggung jawab),
   list-page 402, pokemon-api 306, pokemon.model 201.
3. Kategori tercampur: service, tipe, dan fungsi murni dalam satu folder.

## Struktur baru — berlapis, panah hanya menunjuk ke bawah

    src/app/
    ├── shared/ui/            komponen generik, TIDAK tahu apa-apa soal pokemon
    └── pokemon/
        ├── models/           tipe saja
        │   ├── pokeapi.model.ts    bentuk MENTAH dari API
        │   └── pokemon.model.ts    bentuk domain kita
        ├── util/             fungsi murni + konstanta (+ semua unit test)
        ├── data-access/      service HTTP, store, navigation, mappers
        ├── ui/               komponen presentasi ("bodoh")
        └── pages/            komponen ter-route ("pintar")

Aturannya: `pages` → `ui`/`data-access` → `util` → `models`. Tidak pernah
sebaliknya, dan `ui` tidak pernah mengimpor `pages`.

Terverifikasi otomatis: `ui` dan `shared` tidak mengimpor `pages`, dan `shared`
tidak menyebut kata "pokemon" sama sekali.

## Pemecahan file

 - `pokemon.model.ts` (201) → `pokeapi.model.ts` (mentah) + `pokemon.model.ts`
   (domain). Alasannya: keduanya berubah karena sebab yang berbeda — yang satu
   kalau PokeAPI berubah, yang lain kalau kebutuhan aplikasi berubah.
 - `pokemon-api.ts` (306) → service tipis + `mappers.ts` (fungsi murni).
 - `pokemon-detail-page.ts` (442 → 207) → komponen ui: hero, stats, weakness,
   evolution, varieties.
 - `pokemon-list-page.ts` (402 → 354) → komponen ui: filters.
 - Logika pengelompokan kelemahan pindah ke `util/type-effectiveness.ts`
   sebagai `groupEffectiveness()`, dengan 3 test baru. Total 19 test.

## Verifikasi setelah refactor

Semua dijalankan ulang dan hasilnya identik dengan sebelum refactor:
 - Kelemahan Charizard: Rock ×4, Ground ×0
 - Syarat evolusi: Level 16 / Level 36
 - @defer lokasi: 0 request sebelum scroll
 - /mega: 97 bentuk
 - Mega Charizard X: Fire/Dragon
 - Filter di URL, Back, tombol "Kembali ke daftar"
 - Console bersih, build lolos, 19 test lolos

## Belum dikerjakan

Migrasi GraphQL (19 request → 1), judul halaman dinamis, infinite scroll di
/mega, test untuk mappers dan logika filter.

---

# Iterasi 10: Menu samping + Gigantamax (2026-09-06)

## Menu samping menggantikan tautan di header

Header sebelumnya memuat tautan "Mega Evolution" dan "Bandingkan dua pokémon".
Tidak skalabel: menambah satu menu lagi membuatnya sesak.

`shared/ui/app-sidebar.ts` — satu komponen, dua tampilan:
 - layar >= lg : menu menempel di kiri, selalu terlihat
 - layar < lg  : tombol hamburger membuka laci di atas konten + lapisan gelap

Aksesibilitas:
 - `<nav aria-label>`, tombol dengan `aria-expanded` + `aria-controls`
 - Escape menutup laci DAN mengembalikan fokus ke tombolnya
 - laci tertutup otomatis setelah memilih menu; klik lapisan gelap juga menutup
 - `routerLinkActive` + `ariaCurrentWhenActive="page"`
 - tautan "Lompat ke konten" di app.ts, muncul saat di-Tab

Detail penting: `routerLinkActiveOptions` memakai `queryParams: 'ignored'`.
Tanpa itu, menu "Semua pokémon" padam begitu user memfilter (URL jadi
`/?q=char`), padahal jelas sedang berada di halaman itu.

## Gigantamax — dan satu halaman untuk semua bentuk khusus

34 bentuk Gmax, dikenali dari pola nama `-gmax`, sudah ikut terunduh lewat 19
request yang sama. Nol request tambahan, sama seperti Mega.

`pokemon-mega-page.ts` diganti `special-forms-page.ts` yang generik. Jenisnya
datang dari `data: { kind: 'mega' | 'gmax' }` pada rute, dipetakan ke input
komponen oleh `withComponentInputBinding()` — mekanisme yang sama dengan
parameter rute dan query parameter.

`util/special-forms.ts` menyimpan judul, deskripsi, ikon, dan pola nama tiap
jenis. Menambah jenis baru (misal form regional) = satu entri + satu rute.

Lapisan data ikut digeneralisasi: `PokedexData.megas` menjadi
`PokedexData.forms: Record<SpecialFormKind, Pokemon[]>`.

## Verifikasi

Lebar 1400px: menu menempel terlihat, hamburger tersembunyi, "Semua pokémon"
tetap aktif meski URL `?q=char`.

Lebar 520px: nav di luar layar, hamburger terlihat, klik → aria-expanded true
dan nav masuk, Escape → tertutup dan fokus kembali ke tombol.

/gmax: 34 bentuk, judul benar, menu Gigantamax aktif.
Regresi: filter di URL, tombol "Kembali ke daftar", dan halaman banding tetap
berfungsi. Console bersih, build lolos, 19 test lolos.

## Belum dikerjakan

Migrasi GraphQL (19 request → 1), judul halaman dinamis, infinite scroll di
halaman bentuk khusus, test untuk mappers dan logika filter.

---

# Iterasi 11: Menu samping dipoles (2026-09-06)

Keluhan: menunya terlalu polos.

## Yang diubah

 - Emoji diganti SVG (`shared/ui/icons.ts`, gaya Lucide, satu string path per
   ikon, dirender lewat `[attr.d]` bukan innerHTML). Emoji berbeda bentuk di
   tiap OS, tidak bisa mengikuti warna teks, dan ukurannya ikut font.
 - Penanda merek: Poké Ball dalam kotak ring sky + wordmark + tagline.
 - Menu dikelompokkan: "JELAJAHI" dan "ALAT".
 - Badge jumlah (1025 / 97 / 34) dengan `tabular-nums` supaya lebarnya tetap.
 - Item aktif: garis aksen kiri yang tumbuh (before:h-0 → before:h-5), latar
   halus, ikon jadi sky-400.
 - Latar gradient vertikal, footer kredit PokeAPI.
 - Kepala laci khusus layar sempit dengan tombol tutup — laci menutupi tombol
   hamburger, jadi tanpa ini satu-satunya jalan keluar adalah menebak.

## Kontras — diukur, bukan dikira

Terhadap latar menu #131a24:

    slate-600 #475569   2.31:1   GAGAL
    slate-500 #64748b   3.67:1   GAGAL untuk teks normal
    slate-400 #94a3b8   6.82:1   LULUS  ← dipakai untuk teks idle & label seksi

Dua warna pertama itu justru yang paling sering dipakai orang sebagai warna
"muted" untuk label seksi kecil. Keduanya tidak memenuhi WCAG AA.

## Aturan lapisan tetap dijaga

`AppSidebar` tidak tahu apa pun soal pokémon: menunya masuk lewat
`input<SidebarGroup[]>`. Angka badge dirakit di `app.ts` — kerangka aplikasi,
yang memang boleh mengenal domain. Terverifikasi: tidak ada import "pokemon"
di seluruh `shared/`.

## Verifikasi

1400px: menu menempel, badge 1025/97/34 tampil, item aktif benar meski URL
ber-query-param. 520px: hamburger, laci + kepala dengan tombol tutup, Escape
menutup dan mengembalikan fokus ke hamburger. Regresi filter, tombol kembali,
dan halaman banding aman. Console bersih, build lolos, 19 test lolos.

---

# Iterasi 12: Tombol kembali tahu asalnya (2026-09-06)

Laporan: masuk detail dari halaman Mega Evolution atau Gigantamax, lalu menekan
"Kembali ke daftar", malah terlempar ke daftar utama.

## Dua masalah dalam satu laporan

1. Jalur tombol kembali DIPATOK `routerLink="/"`. Halaman detail tidak pernah
   tahu user datang dari mana.
2. Filter di halaman bentuk khusus disimpan sebagai signal LOKAL, bukan di URL.
   Jadi meskipun jalurnya diperbaiki, filternya tetap hilang. Ini kelas bug
   yang sama persis dengan Iterasi 6 — perbaikannya tidak diterapkan ke halaman
   yang dibuat belakangan.

## Perbaikan

`PokemonNavigation.listQuery` (hanya query param) diganti `returnTo`:

    interface ReturnTarget { path: string; query: Params; label: string }

Setiap halaman daftar mencatat dirinya lewat `effect()`:
 - halaman utama    → { path: '/',     query, label: 'daftar' }
 - bentuk khusus    → { path: '/mega' | '/gmax', query, label: judulnya }

Halaman detail memakai ketiganya: jalur, query, dan label untuk teks tombol.

Filter halaman bentuk khusus dipindahkan ke query parameter, mengikuti pola
yang sama dengan halaman utama — termasuk `input<string | undefined>` plus
`?? ''`, karena Angular mengisi input dengan undefined saat query param-nya
tidak ada.

## Verifikasi

Dari /mega dengan filter "char": tombol berbunyi "Kembali ke Mega Evolution",
href `/mega?q=char`, dan mendarat di /mega dengan filter utuh.
Dari /gmax: idem untuk Gigantamax.
Regresi halaman utama, Back browser, reset filter, dan menu samping semuanya
aman. Console bersih, build lolos, 19 test lolos.

## Pelajaran

Perbaikan yang dilakukan pada satu halaman tidak otomatis ikut ke halaman yang
dibuat setelahnya. Ketika sebuah pola sudah terbukti benar (state filter di
URL), pola itu perlu diterapkan ke SEMUA halaman sejenis — atau lebih baik lagi,
diangkat jadi sesuatu yang dipakai bersama sehingga tidak bisa terlupa.
