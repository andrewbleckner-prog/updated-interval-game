// Music theory utilities for interval identification.

export type Accidental = 'flat' | 'natural' | 'sharp';
export type Quality = 'diminished' | 'minor' | 'major' | 'perfect' | 'augmented';
export type SizeName =
  | 'unison'
  | 'second'
  | 'third'
  | 'fourth'
  | 'fifth'
  | 'sixth'
  | 'seventh'
  | 'octave';
export type Clef = 'treble' | 'bass';

export interface Note {
  // Diatonic letter index: 0=C, 1=D, 2=E, 3=F, 4=G, 5=A, 6=B
  letter: number;
  accidental: Accidental;
  // Octave number (scientific pitch notation); middle C is octave 4.
  octave: number;
}

// Semitone offsets for each accidental.
const ACC_SEMITONE: Record<Accidental, number> = {
  flat: -1,
  natural: 0,
  sharp: 1,
};

// Semitone offset of each natural letter within a C-major octave.
const LETTER_SEMITONE: readonly number[] = [0, 2, 4, 5, 7, 9, 11];
const LETTER_NAMES: readonly string[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACC_SYMBOL: Record<Accidental, string> = {
  flat: '♭',
  natural: '♮',
  sharp: '♯',
};

/** Absolute MIDI note number (C-1 = 0). */
export function midiNumber(note: Note): number {
  return (note.octave + 1) * 12 + LETTER_SEMITONE[note.letter] + ACC_SEMITONE[note.accidental];
}

/** Absolute diatonic step count from a fixed origin — used for interval size. */
function diatonicStep(note: Note): number {
  return note.octave * 7 + note.letter;
}

/** Display name, e.g. "F♯4". */
export function noteName(note: Note): string {
  return `${LETTER_NAMES[note.letter]}${ACC_SYMBOL[note.accidental]}${note.octave}`;
}

export interface Interval {
  quality: Quality;
  size: SizeName;
  compound: boolean;
}

// Generic size number for each simple interval size (1=unison ... 8=octave).
const SIZE_TO_GENERIC: Record<SizeName, number> = {
  unison: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  octave: 8,
};

// Base semitone count for the "perfect or major" version of each simple size.
const PERFECT_MAJOR_SEMITONES: Record<SizeName, number> = {
  unison: 0,
  second: 2,
  third: 4,
  fourth: 5,
  fifth: 7,
  sixth: 9,
  seventh: 11,
  octave: 12,
};

const PERFECT_SIZES: ReadonlySet<SizeName> = new Set(['unison', 'fourth', 'fifth', 'octave']);

/** Generic size number (1=unison … 8=octave) from a SizeName. */
function genericNumber(size: SizeName): number {
  return SIZE_TO_GENERIC[size];
}

/** Inverse: SizeName from a generic number 1..8. */
function sizeFromGeneric(num: number): SizeName {
  return (Object.keys(SIZE_TO_GENERIC) as SizeName[]).find(
    (k) => SIZE_TO_GENERIC[k] === num,
  )!;
}

/** Semitone span for the perfect/major version, accounting for compound. */
function baseSemitones(size: SizeName, compound: boolean): number {
  return PERFECT_MAJOR_SEMITONES[size] + (compound ? 12 : 0);
}

/**
 * Compute the interval between two notes (ascending: low -> high).
 * Compound intervals (spanning more than an octave) set `compound: true`
 * and reduce the size to its simple equivalent (e.g. a 9th = compound second).
 */
export function intervalBetween(low: Note, high: Note): Interval {
  const diatonic = diatonicStep(high) - diatonicStep(low);
  const semitones = midiNumber(high) - midiNumber(low);

  let sizeNum = diatonic + 1; // 1=unison, 2=second, ... 8=octave, 9=9th, etc.
  let compound = false;

  if (sizeNum > 8) {
    compound = true;
    sizeNum = sizeNum - 7; // 9→2 (second), 10→3 (third), ... 15→8 (octave)
  }

  const size = sizeFromGeneric(sizeNum);
  const base = baseSemitones(size, false); // base already excludes compound; we compare raw semitones

  // For compound, the base includes +12, but we compute diff from the simple base + 12.
  const expectedBase = base + (compound ? 12 : 0);
  const diff = semitones - expectedBase;

  const isPerfectType = PERFECT_SIZES.has(size);
  let quality: Quality;

  if (isPerfectType) {
    if (diff <= -1) quality = 'diminished';
    else if (diff === 0) quality = 'perfect';
    else quality = 'augmented';
  } else {
    if (diff <= -2) quality = 'diminished';
    else if (diff === -1) quality = 'minor';
    else if (diff === 0) quality = 'major';
    else quality = 'augmented';
  }

  return { quality, size, compound };
}

export function intervalsEqual(a: Interval, b: Interval): boolean {
  return a.quality === b.quality && a.size === b.size && a.compound === b.compound;
}

// ---------------------------------------------------------------------------
// Interval generation
// ---------------------------------------------------------------------------

const ALL_QUALITIES: Quality[] = ['diminished', 'minor', 'major', 'perfect', 'augmented'];
const ALL_SIZES: SizeName[] = [
  'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave',
];

/** Quality offset from the perfect/major base, in semitones. */
function qualityDiff(quality: Quality, isPerfectType: boolean): number {
  if (isPerfectType) {
    switch (quality) {
      case 'diminished': return -1;
      case 'perfect': return 0;
      case 'augmented': return 1;
      default: return 0; // minor/major don't apply to perfect-type sizes
    }
  } else {
    switch (quality) {
      case 'diminished': return -2;
      case 'minor': return -1;
      case 'major': return 0;
      case 'augmented': return 1;
      default: return 0; // perfect doesn't apply to imperfect sizes
    }
  }
}

/** Whether a (quality, size, compound) combination is musically valid. */
function isValidCombo(quality: Quality, size: SizeName, compound: boolean): boolean {
  const isPerfect = PERFECT_SIZES.has(size);
  if (isPerfect && (quality === 'minor' || quality === 'major')) return false;
  if (!isPerfect && quality === 'perfect') return false;

  // A "compound unison" is just an octave — not a distinct interval.
  if (compound && size === 'unison') return false;

  // A diminished unison does not exist — only perfect and augmented do.
  if (quality === 'diminished' && size === 'unison') return false;

  return true;
}

/**
 * Given an interval and clef, produce a pair of notes with random accidentals.
 * The low note gets a random accidental (when possible), and the high
 * note's accidental is computed to produce the exact target interval.
 *
 * Pitch ranges:
 * - Treble: low notes start around C4 (diatonic step 28), pos 10 (1 ledger line below)
 * - Bass: low notes start around E2 (diatonic step 16), pos 10 (1 ledger line below)
 * Both maintain identical relative positions and headroom on their respective staves.
 */
function notesForInterval(interval: Interval, clef: Clef): { low: Note; high: Note } {
  const genericSteps = genericNumber(interval.size) - 1 + (interval.compound ? 7 : 0);
  // Expand base pitch range: allow low notes to start 0-3 diatonic steps up for compound
  // and 0-6 diatonic steps up for simple intervals.
  const maxStepOffset = interval.compound ? 3 : 6;
  const stepOffset = Math.floor(Math.random() * (maxStepOffset + 1));

  const baseDiatonic = clef === 'treble' ? 4 * 7 + 0 : 2 * 7 + 2; // C4 (28) for treble, E2 (16) for bass
  const lowDiatonic = baseDiatonic + stepOffset;
  const lowOctave = Math.floor(lowDiatonic / 7);
  const lowLetter = lowDiatonic % 7;

  const highDiatonic = lowDiatonic + genericSteps;
  const highOctave = Math.floor(highDiatonic / 7);
  const highLetter = highDiatonic % 7;

  // Natural semitone span of the chosen letters.
  const lowNat = (lowOctave + 1) * 12 + LETTER_SEMITONE[lowLetter];
  const highNat = (highOctave + 1) * 12 + LETTER_SEMITONE[highLetter];
  const naturalSpan = highNat - lowNat;

  const targetSpan = baseSemitones(interval.size, interval.compound) +
    qualityDiff(interval.quality, PERFECT_SIZES.has(interval.size));

  const adjustment = targetSpan - naturalSpan; // -2..+2

  // Determine which low accidentals keep the high accidental in [-1, 1].
  // highAccOffset = adjustment + lowAccOffset, must be in [-1, 1].
  const validLowOffsets: number[] = [];
  for (const lo of [-1, 0, 1]) {
    const ho = adjustment + lo;
    if (ho >= -1 && ho <= 1) validLowOffsets.push(lo);
  }

  const lowOffset = validLowOffsets[Math.floor(Math.random() * validLowOffsets.length)];
  const highOffset = adjustment + lowOffset;

  const toAccidental = (n: number): Accidental =>
    n === -1 ? 'flat' : n === 1 ? 'sharp' : 'natural';

  return {
    low: { letter: lowLetter, accidental: toAccidental(lowOffset), octave: lowOctave },
    high: { letter: highLetter, accidental: toAccidental(highOffset), octave: highOctave },
  };
}

export interface Question {
  interval: Interval;
  low: Note;
  high: Note;
  clef: Clef;
}

/** Generate a random valid interval + note pair, continuously alternating between treble and bass clef. */
export function generateQuestion(previous?: Question): Question {
  let interval: Interval;
  let attempts = 0;
  // Continuously alternates clefs: treble -> bass -> treble -> bass...
  const clef: Clef = previous ? (previous.clef === 'treble' ? 'bass' : 'treble') : 'treble';

  do {
    const quality = ALL_QUALITIES[Math.floor(Math.random() * ALL_QUALITIES.length)];
    const size = ALL_SIZES[Math.floor(Math.random() * ALL_SIZES.length)];
    const compound = Math.random() < 0.30; // 30% chance of compound
    interval = { quality, size, compound };
    if (!isValidCombo(quality, size, compound)) continue;
    attempts++;
  } while (
    (!isValidCombo(interval.quality, interval.size, interval.compound) ||
      (previous && intervalsEqual(interval, previous.interval))) &&
    attempts < 30
  );

  const { low, high } = notesForInterval(interval, clef);
  return { interval, low, high, clef };
}

// ---------------------------------------------------------------------------
// Staff geometry helpers
// ---------------------------------------------------------------------------

// Top staff line notes (position 0)
const TOP_LINE_NOTE: Record<Clef, Note> = {
  treble: { letter: 3, accidental: 'natural', octave: 5 }, // F5
  bass: { letter: 5, accidental: 'natural', octave: 3 },   // A3
};

export function staffPosition(note: Note, clef: Clef = 'treble'): number {
  return diatonicStep(TOP_LINE_NOTE[clef]) - diatonicStep(note);
}

/** Does the note need ledger lines? Returns count above (negative) or below (positive). */
export function ledgerInfo(note: Note, clef: Clef = 'treble'): { above: number; below: number } {
  const pos = staffPosition(note, clef);
  let above = 0;
  let below = 0;
  if (pos < 0) above = Math.floor((-pos) / 2);
  if (pos > 8) below = Math.floor((pos - 8) / 2);
  return { above, below };
}

export { LETTER_NAMES, ACC_SYMBOL, ACC_SEMITONE, LETTER_SEMITONE };
