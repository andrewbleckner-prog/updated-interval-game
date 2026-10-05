import React from 'react';
import { type Note, type Accidental, type Clef, staffPosition, ledgerInfo, ACC_SYMBOL, LETTER_NAMES } from '@/music';
import { type MusicGlyph, TREBLE_CLEF, BASS_CLEF, SHARP, FLAT, NATURAL } from '@/musicGlyphs';

// Layout constants (SVG user units). One staff space = SPACE.
const SPACE = 14;
const STAFF_LEFT = 60;
const STAFF_WIDTH = 300;
const STAFF_RIGHT = STAFF_LEFT + STAFF_WIDTH;
const TOP_LINE_Y = 50; // y of the top staff line
const STEM_LENGTH = SPACE * 3.5;
const STEM_WIDTH = 1.6;
const INK = '#1e2330';

// Convert staff position (0 = top line) to SVG y.
function posY(staffPos: number): number {
  return TOP_LINE_Y + staffPos * (SPACE / 2);
}

const ACC_GLYPH: Record<Accidental, MusicGlyph> = {
  flat: FLAT,
  natural: NATURAL,
  sharp: SHARP,
};

/** Draws a music symbol with its left edge at x and its anchor point at y. */
function Glyph({ glyph, x, y }: { glyph: MusicGlyph; x: number; y: number }) {
  const k = SPACE / glyph.unitsPerSpace;
  return (
    <path
      d={glyph.d}
      fill={INK}
      transform={`translate(${x - glyph.left * k} ${y}) scale(${k}) translate(0 ${glyph.offsetY})`}
    />
  );
}

function glyphWidth(glyph: MusicGlyph): number {
  return ((glyph.right - glyph.left) * SPACE) / glyph.unitsPerSpace;
}

interface StaffProps {
  low: Note;
  high: Note;
  clef?: Clef;
}

export function Staff({ low, high, clef = 'treble' }: StaffProps) {
  const lowPos = staffPosition(low, clef);
  const highPos = staffPosition(high, clef);

  const noteX1 = STAFF_LEFT + 125;
  const noteX2 = STAFF_LEFT + 225;

  // Stem direction: notes below the middle line go up, notes above go down.
  // A note on the middle line follows the other note's direction.
  const lowStemUp = lowPos > 4 || (lowPos === 4 && highPos > 4);
  const highStemUp = highPos > 4 || (highPos === 4 && lowPos > 4);

  const renderLedgerLines = (x: number, info: { above: number; below: number }) => {
    const lines: React.ReactNode[] = [];
    const len = SPACE * 2.2;
    for (let i = 1; i <= info.above; i++) {
      const y = posY(-i * 2);
      lines.push(<line key={`a${i}`} x1={x - len / 2} y1={y} x2={x + len / 2} y2={y} stroke={INK} strokeWidth={1.2} />);
    }
    for (let i = 1; i <= info.below; i++) {
      const y = posY(8 + i * 2);
      lines.push(<line key={`b${i}`} x1={x - len / 2} y1={y} x2={x + len / 2} y2={y} stroke={INK} strokeWidth={1.2} />);
    }
    return lines;
  };

  const renderNote = (note: Note, x: number, pos: number, stemUp: boolean) => {
    const y = posY(pos);
    const rx = SPACE * 0.62;
    const ry = SPACE * 0.42;
    const stemX = stemUp ? x + rx * 0.82 : x - rx * 0.82;
    const stemY2 = stemUp ? y - STEM_LENGTH : y + STEM_LENGTH;
    const acc = ACC_GLYPH[note.accidental];
    return (
      <g key={x}>
        {renderLedgerLines(x, ledgerInfo(note, clef))}
        {note.accidental !== 'natural' && <Glyph glyph={acc} x={x - rx - 4 - glyphWidth(acc)} y={y} />}
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={INK} transform={`rotate(-20 ${x} ${y})`} />
        <line x1={stemX} y1={y} x2={stemX} y2={stemY2} stroke={INK} strokeWidth={STEM_WIDTH} strokeLinecap="butt" />
      </g>
    );
  };

  return (
    <svg
      viewBox="44 -18 324 168"
      className="interval-staff w-full h-auto select-none"
      role="img"
      aria-label={`Staff showing ${noteLabel(low)} and ${noteLabel(high)}`}
    >
      {[0, 2, 4, 6, 8].map((p) => (
        <line key={p} x1={STAFF_LEFT} y1={posY(p)} x2={STAFF_RIGHT} y2={posY(p)} stroke={INK} strokeWidth={1.2} />
      ))}

      {/* Clef: the treble clef curls around the G line (pos 6); the bass clef's dots surround the F line (pos 2). */}
      {clef === 'treble' ? (
        <Glyph glyph={TREBLE_CLEF} x={STAFF_LEFT + 6} y={posY(6)} />
      ) : (
        <Glyph glyph={BASS_CLEF} x={STAFF_LEFT + 6} y={posY(2)} />
      )}

      {/* Bar line at end */}
      <line x1={STAFF_RIGHT} y1={posY(0)} x2={STAFF_RIGHT} y2={posY(8)} stroke={INK} strokeWidth={1.6} />

      {renderNote(low, noteX1, lowPos, lowStemUp)}
      {renderNote(high, noteX2, highPos, highStemUp)}
    </svg>
  );
}

function noteLabel(n: Note): string {
  return `${LETTER_NAMES[n.letter]}${ACC_SYMBOL[n.accidental]}${n.octave}`;
}
