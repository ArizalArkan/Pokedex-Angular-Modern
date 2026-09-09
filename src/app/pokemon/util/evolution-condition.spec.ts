import { describe, expect, it } from 'vitest';
import { describeEvolution, EvolutionDetail } from './evolution-condition';

/** Membuat satu baris detail dengan semua field null, lalu ditimpa seperlunya. */
function detail(isi: Partial<EvolutionDetail> = {}): EvolutionDetail {
  return {
    trigger: null,
    min_level: null,
    item: null,
    held_item: null,
    min_happiness: null,
    min_affection: null,
    time_of_day: '',
    location: null,
    known_move: null,
    needs_overworld_rain: false,
    ...isi,
  };
}

describe('describeEvolution', () => {
  it('mengembalikan teks kosong kalau tidak ada detail (bentuk dasar)', () => {
    expect(describeEvolution([])).toBe('');
  });

  it('menyebut level untuk evolusi naik level biasa', () => {
    const hasil = describeEvolution([detail({ trigger: { name: 'level-up' }, min_level: 16 })]);
    // "Level 16" saja - tidak perlu ditambah "Naik level", itu mubazir.
    expect(hasil).toBe('Level 16');
  });

  it('merapikan nama item bertanda hubung', () => {
    const hasil = describeEvolution([
      detail({ trigger: { name: 'use-item' }, item: { name: 'thunder-stone' } }),
    ]);
    expect(hasil).toBe('Thunder Stone');
  });

  it('menggabungkan beberapa syarat sekaligus (kasus Espeon)', () => {
    const hasil = describeEvolution([
      detail({ trigger: { name: 'level-up' }, min_happiness: 160, time_of_day: 'day' }),
    ]);
    expect(hasil).toBe('Happiness 160, siang');
  });

  it('menerjemahkan waktu ke bahasa Indonesia', () => {
    expect(describeEvolution([detail({ time_of_day: 'night' })])).toBe('malam');
  });

  it('memakai nama trigger kalau tidak ada syarat lain', () => {
    expect(describeEvolution([detail({ trigger: { name: 'trade' } })])).toBe('Ditukar');
  });

  it('menyebut lokasi khusus (kasus Leafeon)', () => {
    const hasil = describeEvolution([
      detail({ trigger: { name: 'level-up' }, location: { name: 'eterna-forest' } }),
    ]);
    expect(hasil).toBe('di Eterna Forest');
  });

  it('menggabungkan tukar dengan item yang dibawa', () => {
    const hasil = describeEvolution([
      detail({ trigger: { name: 'trade' }, held_item: { name: 'metal-coat' } }),
    ]);
    expect(hasil).toBe('Ditukar, sambil membawa Metal Coat');
  });
});
