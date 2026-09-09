/**
 * URL gambar pokémon.
 *
 * Keduanya bisa ditebak dari nomor Pokédex, jadi tidak perlu request apa pun
 * untuk mendapatkannya. Ditaruh di satu file supaya tidak ada tiga salinan
 * string yang sama berkeliaran di kode.
 */
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Artwork resmi, 475x475, 118-150 KB. Dipakai kartu dan halaman detail. */
export function artworkUrl(id: number): string {
  return `${SPRITES}/other/official-artwork/${id}.png`;
}

/** Sprite klasik, 96x96, ~600 byte. Cadangan kalau artwork gagal dimuat. */
export function spriteUrl(id: number): string {
  return `${SPRITES}/${id}.png`;
}

/** Artwork versi shiny (warna langka). Ada untuk semua 1025 pokémon. */
export function shinyArtworkUrl(id: number): string {
  return `${SPRITES}/other/official-artwork/shiny/${id}.png`;
}
