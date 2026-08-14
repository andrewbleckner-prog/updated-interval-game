import React, { useMemo } from 'react';
import {
  type Note,
  type Accidental,
  staffPosition,
  ledgerInfo,
  ACC_SYMBOL,
  LETTER_NAMES,
} from '@/music';

// SMuFL Bravura glyph codepoints.
const GLYPH = {
  trebleClef: '\uE050',
  flat: '\uE260',
  natural: '\uE261',
  sharp: '\uE262',
  timeSig4: '\uE084',
};

// Layout constants (SVG user units). One staff space = SPACE.
const SPACE = 14;
const STAFF_LEFT = 60;
const STAFF_WIDTH = 300;
const STAFF_RIGHT = STAFF_LEFT + STAFF_WIDTH;
const TOP_LINE_Y = 40; // y of the top staff line (F5)

// SMuFL standard: font em = 4 staff spaces.
const MUSIC_FONT_SIZE = SPACE * 4;
const STEM_LENGTH = SPACE * 3.5;
const STEM_WIDTH = 1.6;

// Convert staff position (0 = top line F5) to SVG y.
function posY(staffPos: number): number {
  return TOP_LINE_Y + staffPos * (SPACE / 2);
}

const ACC_GLYPH: Record<Accidental, string> = {
  flat: GLYPH.flat,
  natural: GLYPH.natural,
  sharp: GLYPH.sharp,
};

interface StaffProps {
  low: Note;
  high: Note;
}

export function Staff({ low, high }: StaffProps) {
  const lowPos = useMemo(() => staffPosition(low), [low]);
  const highPos = useMemo(() => staffPosition(high), [high]);
  const lowLedger = useMemo(() => ledgerInfo(low), [low]);
  const highLedger = useMemo(() => ledgerInfo(high), [high]);

  const noteX1 = STAFF_LEFT + 130;
  const noteX2 = STAFF_LEFT + 220;

  // Stem direction: notes below the middle line (B4, pos 4) go up,
  // notes above go down. B4 follows the other note's direction.
  const lowStemUp = lowPos > 4 || (lowPos === 4 && highPos > 4);
  const highStemUp = highPos > 4 || (highPos === 4 && lowPos > 4);

  const staffLines = [0, 2, 4, 6, 8].map((p) => (
    <line
      key={p}
      x1={STAFF_LEFT}
      y1={posY(p)}
      x2={STAFF_RIGHT}
      y2={posY(p)}
      stroke="#1e2330"
      strokeWidth={1.2}
    />
  ));

  const renderLedgerLines = (x: number, info: { above: number; below: number }) => {
    const lines: React.ReactNode[] = [];
    const len = SPACE * 2.2;
    for (let i = 1; i <= info.above; i++) {
      const y = posY(-i * 2);
      lines.push(
        <line
          key={`a${i}`}
          x1={x - len / 2}
          y1={y}
          x2={x + len / 2}
          y2={y}
          stroke="#1e2330"
          strokeWidth={1.2}
        />,
      );
    }
    for (let i = 1; i <= info.below; i++) {
      const y = posY(8 + i * 2);
      lines.push(
        <line
          key={`b${i}`}
          x1={x - len / 2}
          y1={y}
          x2={x + len / 2}
          y2={y}
          stroke="#1e2330"
          strokeWidth={1.2}
        />,
      );
    }
    return lines;
  };

  const renderNote = (
    note: Note,
    x: number,
    pos: number,
    ledger: { above: number; below: number },
    stemUp: boolean,
  ) => {
    const y = posY(pos);
    const showAccidental = note.accidental !== 'natural';
    const accX = x - SPACE * 1.8;

    // Notehead: drawn as an SVG ellipse for perfect alignment.
    // Slightly wider than tall, tilted ~20° like real engraving.
    const rx = SPACE * 0.62;
    const ry = SPACE * 0.42;

    const stemX = stemUp ? x + rx * 0.82 : x - rx * 0.82;
    const stemY2 = stemUp ? y - STEM_LENGTH : y + STEM_LENGTH;

    return (
      <g key={x}>
        {renderLedgerLines(x, ledger)}
        {showAccidental && (
          <text
            x={accX}
            y={y}
            className="bravura"
            fontSize={MUSIC_FONT_SIZE}
            fill="#1e2330"
            dominantBaseline="central"
            textAnchor="start"
          >
            {ACC_GLYPH[note.accidental]}
          </text>
        )}
        <ellipse
          cx={x}
          cy={y}
          rx={rx}
          ry={ry}
          fill="#1e2330"
          transform={`rotate(-20 ${x} ${y})`}
        />
        <line
          x1={stemX}
          y1={y}
          x2={stemX}
          y2={stemY2}
          stroke="#1e2330"
          strokeWidth={STEM_WIDTH}
          strokeLinecap="butt"
        />
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 380 130"
      className="w-full h-auto max-w-md"
      role="img"
      aria-label={`Staff showing ${noteLabel(low)} and ${noteLabel(high)}`}
    >
      {/* Staff lines */}
      {staffLines}

      {/* Treble clef — SMuFL origin sits on the G line (position 6). */}
      <text
        x={STAFF_LEFT + 2}
        y={posY(6)}
        className="bravura"
        fontSize={MUSIC_FONT_SIZE}
        fill="#1e2330"
        dominantBaseline="central"
      >
        {GLYPH.trebleClef}
      </text>

      {/* Time signature 4/4 */}
      <text
        x={STAFF_LEFT + 58}
        y={posY(2)}
        className="bravura"
        fontSize={MUSIC_FONT_SIZE}
        fill="#1e2330"
        dominantBaseline="central"
        textAnchor="start"
      >
        {GLYPH.timeSig4}
      </text>
      <text
        x={STAFF_LEFT + 58}
        y={posY(6)}
        className="bravura"
        fontSize={MUSIC_FONT_SIZE}
        fill="#1e2330"
        dominantBaseline="central"
        textAnchor="start"
      >
        {GLYPH.timeSig4}
      </text>

      {/* Bar line at end */}
      <line
        x1={STAFF_RIGHT}
        y1={posY(0)}
        x2={STAFF_RIGHT}
        y2={posY(8)}
        stroke="#1e2330"
        strokeWidth={1.2}
      />

      {/* Notes */}
      {renderNote(low, noteX1, lowPos, lowLedger, lowStemUp)}
      {renderNote(high, noteX2, highPos, highLedger, highStemUp)}
    </svg>
  );
}

function noteLabel(n: Note): string {
  return `${LETTER_NAMES[n.letter]}${ACC_SYMBOL[n.accidental]}${n.octave}`;
}
