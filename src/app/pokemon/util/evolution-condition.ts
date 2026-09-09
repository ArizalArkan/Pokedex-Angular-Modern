/**
 * Satu baris `evolution_details` dari PokeAPI. Hampir semua field bisa null,
 * dan yang terisi berbeda-beda tergantung cara evolusinya.
 */
export interface EvolutionDetail {
  trigger: { name: string } | null;
  min_level: number | null;
  item: { name: string } | null;
  held_item: { name: string } | null;
  min_happiness: number | null;
  min_affection: number | null;
  time_of_day: string;
  location: { name: string } | null;
  known_move: { name: string } | null;
  needs_overworld_rain: boolean;
}

/** "thunder-stone" → "Thunder Stone" */
function rapikan(nama: string): string {
  return nama
    .split('-')
    .map((kata) => kata[0].toUpperCase() + kata.slice(1))
    .join(' ');
}

const WAKTU: Record<string, string> = { day: 'siang', night: 'malam', dusk: 'senja' };

/**
 * Merangkum syarat evolusi jadi satu kalimat pendek yang bisa dibaca manusia.
 *
 * PokeAPI memberi ini sebagai kumpulan field yang kebanyakan null, dan
 * kombinasinya bermacam-macam:
 *
 *   { trigger: 'level-up', min_level: 16 }               → "Level 16"
 *   { trigger: 'use-item', item: 'thunder-stone' }       → "Thunder Stone"
 *   { trigger: 'level-up', min_happiness: 160,
 *     time_of_day: 'day' }                               → "Happiness 160, siang"
 *   { trigger: 'trade' }                                 → "Ditukar"
 *
 * Eevee adalah contoh terbaiknya: delapan cabang, hampir semuanya beda syarat.
 *
 * Fungsi murni, jadi bisa diuji tanpa Angular maupun jaringan.
 */
export function describeEvolution(details: EvolutionDetail[]): string {
  const detail = details[0];
  if (!detail) return '';

  const bagian: string[] = [];

  if (detail.min_level !== null) bagian.push(`Level ${detail.min_level}`);
  if (detail.item) bagian.push(rapikan(detail.item.name));
  if (detail.held_item) bagian.push(`sambil membawa ${rapikan(detail.held_item.name)}`);
  if (detail.min_happiness !== null) bagian.push(`Happiness ${detail.min_happiness}`);
  if (detail.min_affection !== null) bagian.push(`Affection ${detail.min_affection}`);
  if (detail.known_move) bagian.push(`menguasai ${rapikan(detail.known_move.name)}`);
  if (detail.location) bagian.push(`di ${rapikan(detail.location.name)}`);
  if (detail.time_of_day) bagian.push(WAKTU[detail.time_of_day] ?? detail.time_of_day);
  if (detail.needs_overworld_rain) bagian.push('saat hujan');

  // Trigger hanya disebut kalau tidak ada syarat lain yang lebih informatif.
  // "Level 16" sudah jelas naik level; tidak perlu ditulis "Naik level, Level 16".
  if (bagian.length === 0 && detail.trigger) {
    const nama = detail.trigger.name;
    if (nama === 'trade') return 'Ditukar';
    if (nama === 'shed') return 'Cara khusus';
    return rapikan(nama);
  }

  if (detail.trigger?.name === 'trade') bagian.unshift('Ditukar');

  return bagian.join(', ');
}
