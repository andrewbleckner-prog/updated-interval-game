import React, { useCallback, useRef, useState } from 'react';
import { Check, X, Music2, Volume2, SkipForward, Trophy, Play, BookOpen } from 'lucide-react';
import { Staff } from '@/Staff';
import { useAudio } from '@/useAudio';
import {
  type Interval,
  type Quality,
  type SizeName,
  type Question,
  generateQuestion,
  intervalsEqual,
  noteName,
} from '@/music';

const QUALITIES: Quality[] = ['perfect', 'minor', 'major', 'diminished', 'augmented'];
const QUALITY_SYMBOLS: Record<Quality, string> = {
  perfect: 'P',
  major: 'M',
  minor: 'm',
  diminished: 'º',
  augmented: '+',
};
const SIZES: SizeName[] = [
  'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave',
];
const SIZE_SYMBOLS: Record<SizeName, string> = {
  unison: 'U',
  second: '2nd',
  third: '3rd',
  fourth: '4th',
  fifth: '5th',
  sixth: '6th',
  seventh: '7th',
  octave: '8ve',
};

type Feedback = 'idle' | 'correct' | 'wrong';

export default function App() {
  const audio = useAudio();
  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeName | null>(null);
  const [compound, setCompound] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0); // wrong attempts on current question
  const [started, setStarted] = useState(false);
  const [showTheoryTips, setShowTheoryTips] = useState(false);
  const questionKey = useRef(0);

  const nextQuestion = useCallback(
    (prev?: Question) => {
      const q = generateQuestion(prev);
      setQuestion(q);
      setSelectedQuality(null);
      setSelectedSize(null);
      setCompound(false);
      setFeedback('idle');
      setWrongAttempts(0);
      questionKey.current += 1;
      // Play the new interval after a short delay.
      window.setTimeout(() => audio.playNotes([q.low, q.high]), 250);
    },
    [audio],
  );

  const handleSelect = useCallback(() => {
    if (!selectedQuality || !selectedSize || feedback === 'correct') return;

    const userAnswer: Interval = { quality: selectedQuality, size: selectedSize, compound };
    const correct = intervalsEqual(userAnswer, question.interval);

    setAttempts((a) => a + 1);

    if (correct) {
      setFeedback('correct');
      setScore((s) => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      audio.playCorrect();
      window.setTimeout(() => nextQuestion(question), 1700);
    } else {
      setFeedback('wrong');
      setWrongAttempts((w) => w + 1);
      setStreak(0);
      audio.playWrong();
      // Clear feedback after a moment so they can try again.
      window.setTimeout(() => setFeedback('idle'), 1100);
    }
  }, [selectedQuality, selectedSize, compound, feedback, question, audio, streak, bestStreak, nextQuestion]);

  const handlePlayInterval = useCallback(() => {
    audio.playNotes([question.low, question.high]);
  }, [audio, question]);

  const handleSkip = useCallback(() => {
    nextQuestion(question);
  }, [nextQuestion, question]);

  const startGame = useCallback(() => {
    setStarted(true);
    setScore(0);
    setAttempts(0);
    setStreak(0);
    setBestStreak(0);
    const q = generateQuestion();
    setQuestion(q);
    setSelectedQuality(null);
    setSelectedSize(null);
    setCompound(false);
    setFeedback('idle');
    setWrongAttempts(0);
    audio.getCtx(); // unlock audio on user gesture
    window.setTimeout(() => audio.playNotes([q.low, q.high]), 150);
  }, [audio]);

  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  return (
    <div id="interval-app-root" className="min-h-screen bg-stone-200/70 text-ink-800 flex flex-col items-center px-4 py-8 sm:py-12">
      {/* Header */}
{!started ? (
  <header id="game-header" className="w-full max-w-2xl text-center mb-6 animate-fade-in">
    <h1 className="game-title">
      Interval Identification
    </h1>
  </header>
) : (
        <header id="game-header" className="w-full max-w-5xl mb-6 animate-fade-in text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {/* Title & subtitle aligned with left column */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/80 border border-orange-400/50 flex items-center justify-center shrink-0 shadow-xs backdrop-blur-xs text-white">
                  <Music2 className="w-5 h-5 text-white" />
                </div>
<h1 className="game-title">
  Interval Identification
</h1>
</div>
<p className="game-subtitle mt-1.5 pl-12 sm:pl-13">
  Identify the melodic interval between the two notes on the staff.
</p>
            </div>

            {/* Stats row aligned right above the selection window spanning its exact width */}
            <div id="game-stats-bar" className="grid grid-cols-4 gap-2 w-full">
              <StatCard label="Score" value={score} accent="text-emerald-600" />
              <StatCard label="Streak" value={streak} accent="text-amber-600" icon={<Trophy className="w-3 h-3" />} />
              <StatCard label="Accuracy" value={`${accuracy}%`} accent="text-sky-600" />
              <StatCard label="Best Streak" value={bestStreak} accent="text-violet-600" />
            </div>
          </div>
        </header>
      )}

      {!started ? (
        <StartScreen onStart={startGame} bestStreak={bestStreak} />
      ) : (
        <main id="game-main-board" className="w-full max-w-5xl flex flex-col gap-6 animate-fade-in">
          {/* Side-by-side: Staff window (left) and Selection window (right) */}
          <div id="game-workspace" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left column: Staff card & action buttons */}
            <div id="staff-column" className="flex flex-col justify-between h-full gap-3">
              {/* Staff card */}
              <div id="staff-card" className="bg-white rounded-2xl shadow-xl border border-ink-200 p-4 sm:p-5 relative overflow-hidden flex flex-col items-center flex-1 justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-white to-ink-50 opacity-50 pointer-events-none" />
                <div className="relative w-full flex flex-col items-center">
                  <Staff low={question.low} high={question.high} clef={question.clef} />
                  <div className="mt-2 flex items-center justify-center gap-4 text-ink-900 font-bold">
                    <span className="text-sm">{noteName(question.low)}</span>
                    <span className="text-ink-400">→</span>
                    <span className="text-sm">{noteName(question.high)}</span>
                  </div>

                  {/* Feedback state indicator */}
                  <div className="mt-2 min-h-[34px] flex items-center justify-center">
                    {feedback === 'correct' && (
                      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-sm animate-pop-in shadow-xs">
                        <Check className="w-5 h-5 text-emerald-700" strokeWidth={3} />
                        <span>Correct!</span>
                      </div>
                    )}
                    {feedback === 'wrong' && (
                      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-bold text-sm animate-shake shadow-xs">
                        <X className="w-5 h-5 text-rose-700" strokeWidth={3} />
                        <span>Try again</span>
                      </div>
                    )}
                    {feedback === 'idle' && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink-100 text-ink-700 font-semibold text-xs">
                        <Music2 className="w-4 h-4 text-ink-600" />
                        <span>Identify melodic interval</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Replay interval button - slightly greater height */}
              <button
                id="replay-interval-button"
                onClick={handlePlayInterval}
                disabled={feedback === 'correct'}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-xl bg-white hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 text-sm sm:text-base font-bold transition-colors border border-ink-300 shadow-sm w-full"
              >
                <Volume2 className="w-4 h-4 text-ink-800" />
                Play Interval
              </button>

              {/* Action buttons directly under staff window */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  id="theory-tips-button"
                  onClick={() => setShowTheoryTips(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-ink-100 text-ink-950 text-sm font-bold transition-colors border border-ink-300 shadow-sm w-full"
                >
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Theory Tips
                </button>

                <button
                  id="skip-question-button"
                  onClick={handleSkip}
                  disabled={feedback === 'correct'}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 text-sm font-bold transition-colors border border-ink-300 shadow-sm w-full"
                >
                  <SkipForward className="w-4 h-4 text-ink-800" />
                  Skip
                </button>
              </div>
            </div>

            {/* Right column: Answer selection window */}
            <div id="answer-selection-panel" className="bg-white/90 backdrop-blur rounded-2xl border border-ink-200 shadow-xl p-4 sm:p-5 flex flex-col justify-between h-full">
              <div className="space-y-3.5">
                {/* Quality row */}
                <div>
                  <p className="text-sm font-bold tracking-wide text-ink-950 mb-2">Quality</p>
                  <div className="flex flex-wrap gap-2">
                    {QUALITIES.map((q) => (
                      <AnswerButton
                        key={q}
                        label={QUALITY_SYMBOLS[q]}
                        ariaLabel={q}
                        selected={selectedQuality === q}
                        disabled={feedback === 'correct'}
                        onClick={() => {
                          setSelectedQuality(q);
                          setFeedback('idle');
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Size row */}
                <div>
                  <p className="text-sm font-bold tracking-wide text-ink-950 mb-2">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <AnswerButton
                        key={s}
                        label={SIZE_SYMBOLS[s]}
                        ariaLabel={s}
                        selected={selectedSize === s}
                        disabled={feedback === 'correct'}
                        onClick={() => {
                          setSelectedSize(s);
                          if (s === 'unison') setCompound(false);
                          setFeedback('idle');
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Compound toggle row */}
                <div>
                  <p className="text-sm font-bold tracking-wide text-ink-950 mb-2">
                    Compound <span className="text-xs text-ink-600 font-semibold">(adds an octave)</span>
                  </p>
                  <button
                    id="compound-toggle-button"
                    onClick={() => {
                      setCompound((c) => !c);
                      setFeedback('idle');
                    }}
                    disabled={feedback === 'correct' || selectedSize === 'unison'}
                    className={[
                      'px-4 py-2 rounded-xl text-sm sm:text-base font-bold transition-all border shadow-xs',
                      compound
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30 scale-105 font-extrabold'
                        : 'bg-white text-ink-950 border-ink-300 hover:bg-ink-100 hover:border-ink-400',
                      (feedback === 'correct' || selectedSize === 'unison') ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    compound
                  </button>
                </div>
              </div>

              {/* Select button - slightly less height */}
              <div className="pt-2">
                <button
                  id="submit-answer-button"
                  onClick={handleSelect}
                  disabled={!selectedQuality || !selectedSize || feedback === 'correct'}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-ink-300 disabled:to-ink-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
                >
                  {feedback === 'correct'
                    ? 'Correct! Next…'
                    : `Select${selectedSize ? ` — ${selectedQuality ? QUALITY_SYMBOLS[selectedQuality] : '?'} ${compound ? 'compound ' : ''}${SIZE_SYMBOLS[selectedSize]}` : ''}`}
                </button>
                {wrongAttempts > 0 && feedback !== 'correct' && (
                  <p className="text-center text-xs sm:text-sm text-rose-600 font-semibold mt-1.5">
                    Not quite — try again. ({wrongAttempts} {wrongAttempts === 1 ? 'attempt' : 'attempts'} so far)
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Theory Tips Pop-up Modal */}
      {showTheoryTips && (
        <div
          id="theory-tips-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowTheoryTips(false)}
        >
          <div
            id="theory-tips-popup-window"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-ink-200 p-6 sm:p-8 relative animate-fade-in"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="inline-flex items-center gap-2 text-amber-600">
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Music Theory Tips</span>
              </div>
              <button
                id="close-theory-tips-button"
                onClick={() => setShowTheoryTips(false)}
                className="text-ink-400 hover:text-ink-700 p-1.5 rounded-lg hover:bg-ink-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-ink-900 mb-4">
              How to analyze music intervals on the staff.
            </h3>

            <ul className="space-y-3 text-ink-700 text-sm sm:text-base mb-6 list-disc list-outside pl-6 leading-relaxed">
              <li>Determine size first by counting diatonic steps</li>
              <li>Ignore accidentals and find diatonic quality</li>
              <li>Add in accidentals one at a time to complete assessment of quality</li>
            </ul>

            <div className="pt-4 border-t border-ink-100 mb-6">
              <h4 className="text-base sm:text-lg font-bold text-ink-900 mb-3">
                Diatonic Interval Basics
              </h4>
              <ul className="space-y-2.5 text-ink-700 text-sm sm:text-base list-disc list-outside pl-6 leading-relaxed">
                <li>All 5ths above the scale notes are perfect except above B.</li>
                <li>All fourths above the scale notes are perfect except above F.</li>
                <li>The 3rds above C, F, and G (1, 4, 5) are major, and all others are minor.</li>
                <li>All seconds above the scale are major except EF and BC.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2 border-t border-ink-100">
              <button
                id="dismiss-theory-tips-button"
                onClick={() => setShowTheoryTips(false)}
                className="px-6 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white font-medium text-sm transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-ink-400">
        Notation rendered with the Bravura music font (SMuFL). Sounds synthesized live.
      </footer>
    </div>
  );
}

function StartScreen({ onStart, bestStreak }: { onStart: () => void; bestStreak: number }) {
  const qualitySymbols = [
    { name: 'Perfect', symbol: 'P' },
    { name: 'Major', symbol: 'M' },
    { name: 'Minor', symbol: 'm' },
    { name: 'Diminished', symbol: 'º' },
    { name: 'Augmented', symbol: '+' },
  ];

  const specialSizeSymbols = [
    { name: 'Unison', symbol: 'U' },
    { name: 'Octave', symbol: '8ve' },
  ];

  return (
    <div id="start-screen" className="w-full max-w-2xl animate-fade-in">
      <div id="start-screen-card" className="bg-white rounded-2xl shadow-xl border border-ink-200 p-5 sm:p-7">
        <div className="flex items-center gap-2.5 mb-3 text-left">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/80 border border-sky-400/50 flex items-center justify-center shrink-0 shadow-xs backdrop-blur-xs text-white">
            <Music2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-900">
            Directions
          </h2>
        </div>
        <p className="text-ink-700 text-sm sm:text-base text-left leading-relaxed mb-5">
          Two consecutive notes appear on a treble or bass staff forming a melodic interval. Choose the interval's <strong>quality</strong> and <strong>size</strong>, toggle <strong>compound</strong> if it spans more than an octave, and then press <strong>Select</strong>. A bell means correct; a buzzer means try again.
        </p>

        {/* Quality symbols display */}
        <div id="quality-symbols-container" className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-800 text-left mb-2.5">
            Interval Quality Symbols
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {qualitySymbols.map((item) => (
              <div
                key={item.name}
                id={`symbol-tile-${item.name.toLowerCase()}`}
                className="bg-stone-50 border border-ink-200 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs"
              >
                <span className="text-xs font-semibold text-ink-700 mb-0.5">{item.name}</span>
                <span className="text-xl sm:text-2xl font-bold text-ink-900 leading-none">{item.symbol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Special Size symbols display */}
        <div id="special-size-symbols-container" className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-800 text-left mb-2.5">
            Special Size Symbols
          </h3>
          <div className="grid grid-cols-2 gap-2.5 max-w-sm">
            {specialSizeSymbols.map((item) => (
              <div
                key={item.name}
                id={`size-symbol-tile-${item.name.toLowerCase()}`}
                className="bg-stone-50 border border-ink-200 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs"
              >
                <span className="text-xs font-semibold text-ink-700 mb-0.5">{item.name}</span>
                <span className="text-xl sm:text-2xl font-bold text-ink-900 leading-none">{item.symbol}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <button
            id="start-game-button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-base transition-all shadow-lg shadow-amber-500/30 w-full sm:w-auto"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
          {bestStreak > 0 && (
            <p className="mt-3 text-xs text-ink-500 text-center">Best streak so far: {bestStreak}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white/85 backdrop-blur rounded-xl border border-ink-200 shadow-xs px-2 py-2 text-center flex flex-col justify-center min-w-0">
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-500 truncate">{label}</div>
      <div className={`text-base sm:text-lg font-bold mt-0.5 flex items-center justify-center gap-1 ${accent} truncate leading-tight`}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}

function AnswerButton({
  label,
  selected,
  disabled,
  onClick,
  ariaLabel,
  className,
}: {
  key?: React.Key;
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        'px-5 py-2.5 rounded-xl text-base sm:text-lg font-bold transition-all border shadow-xs min-w-[44px]',
        selected
          ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30 scale-105 font-extrabold'
          : 'bg-white text-ink-950 border-ink-300 hover:bg-ink-100 hover:border-ink-400',
        disabled && !selected ? 'opacity-40 cursor-not-allowed' : '',
        className || '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  if (feedback === 'correct') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 animate-pop-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center animate-glow-green">
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
        <span className="text-emerald-400 font-semibold text-sm">Correct!</span>
      </div>
    );
  }

  if (feedback === 'wrong') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 animate-shake">
        <div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center animate-glow-red">
          <X className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
        <span className="text-rose-400 font-semibold text-sm">Try again</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="w-20 h-20 rounded-full border-2 border-dashed border-ink-300 flex items-center justify-center">
        <Music2 className="w-9 h-9 text-ink-400" />
      </div>
      <span className="text-ink-400 text-xs font-medium">Your answer</span>
    </div>
  );
}
