import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, X, Music2, Volume2, Trophy, Play, Lightbulb, Settings, Eye, SlidersHorizontal } from 'lucide-react';
import { Staff } from '@/Staff';
import { useAudio } from '@/useAudio';
import {
  type Interval,
  type Quality,
  type SizeName,
  type Question,
  type IntervalFamily,
  generateQuestion,
  intervalsEqual,
  intervalMatchesFamily,
  LETTER_NAMES,
  ACC_SYMBOL,
  type Note,
} from '@/music';

const QUALITIES: Quality[] = ['perfect', 'minor', 'major', 'diminished', 'augmented'];
const QUALITY_SYMBOLS: Record<Quality, string> = {
  perfect: 'P',
  major: 'M',
  minor: 'm',
  diminished: 'º',
  augmented: '+',
};
const QUALITY_WORDS: Record<Quality, string> = {
  perfect: 'Perfect',
  major: 'Major',
  minor: 'Minor',
  diminished: 'Diminished',
  augmented: 'Augmented',
};
// Keyboard keys for each quality ("M" is Shift + m).
const QUALITY_KEYS: Record<string, Quality> = {
  p: 'perfect',
  P: 'perfect',
  M: 'major',
  m: 'minor',
  d: 'diminished',
  D: 'diminished',
  o: 'diminished',
  a: 'augmented',
  A: 'augmented',
  '+': 'augmented',
};

const SIZES: SizeName[] = ['unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave'];
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
const SIZE_WORDS: Record<SizeName, string> = {
  unison: 'unison',
  second: '2nd',
  third: '3rd',
  fourth: '4th',
  fifth: '5th',
  sixth: '6th',
  seventh: '7th',
  octave: 'octave',
};

export interface FamilyOption {
  id: IntervalFamily;
  label: string;
}

export const INTERVAL_OPTIONS: FamilyOption[] = [
  { id: 'all', label: 'All intervals' },
  { id: 'perfect', label: 'Intervals in the U, 4th, 5th and 8ve family' },
  { id: 'imperfect', label: 'Intervals in the 2nd, 3rd, 6th and 7th family' },
];

// "revealed" = the student pressed Show answer for this interval.
type Feedback = 'idle' | 'correct' | 'wrong' | 'revealed';

function intervalName(i: Interval): string {
  return `${i.compound ? 'compound ' : ''}${QUALITY_WORDS[i.quality].toLowerCase()} ${SIZE_WORDS[i.size]}`;
}

// Short label for the Check button, e.g. "M3", "P5 compound", "+4".
const SIZE_NUMBERS: Record<SizeName, string> = {
  unison: 'U',
  second: '2',
  third: '3',
  fourth: '4',
  fifth: '5',
  sixth: '6',
  seventh: '7',
  octave: '8',
};

function noteText(n: Note): string {
  return `${LETTER_NAMES[n.letter]}${n.accidental === 'natural' ? '' : ACC_SYMBOL[n.accidental]}${n.octave}`;
}

export default function App() {
  const audio = useAudio();
  const [intervalFamily, setIntervalFamily] = useState<IntervalFamily>('all');
  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeName | null>(null);
  const [compound, setCompound] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [started, setStarted] = useState(false);
  const [dialog, setDialog] = useState<'tips' | 'settings' | null>(null);
  const timer = useRef<number | null>(null);
  const wrongTimer = useRef<number | null>(null);

  // Once answered correctly or the answer is shown, the buttons lock until
  // the student moves on to the next interval.
  const locked = feedback === 'correct' || feedback === 'revealed';

  const clearAnswer = useCallback(() => {
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    setSelectedQuality(null);
    setSelectedSize(null);
    setCompound(false);
    setFeedback('idle');
    setWrongAttempts(0);
  }, []);

  const playSoon = useCallback(
    (q: Question, delay = 250) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => audio.playNotes([q.low, q.high]), delay);
    },
    [audio],
  );

  const nextQuestion = useCallback(
    (prev?: Question, family: IntervalFamily = intervalFamily) => {
      const q = generateQuestion(prev, family);
      setQuestion(q);
      clearAnswer();
      playSoon(q);
    },
    [intervalFamily, clearAnswer, playSoon],
  );

  const handleFamilyChange = useCallback(
    (newFamily: IntervalFamily) => {
      setIntervalFamily(newFamily);
      if (started && !intervalMatchesFamily(question.interval, newFamily)) {
        nextQuestion(undefined, newFamily);
      }
    },
    [started, question, nextQuestion],
  );

  const pickQuality = useCallback((q: Quality) => {
    setSelectedQuality(q);
    setFeedback((f) => (f === 'wrong' ? 'idle' : f));
  }, []);

  const pickSize = useCallback((s: SizeName) => {
    setSelectedSize(s);
    if (s === 'unison') setCompound(false);
    setFeedback((f) => (f === 'wrong' ? 'idle' : f));
  }, []);

  const toggleCompound = useCallback(() => {
    if (selectedSize === 'unison') return;
    setCompound((c) => !c);
    setFeedback((f) => (f === 'wrong' ? 'idle' : f));
  }, [selectedSize]);

  const handleCheck = useCallback(() => {
    if (locked) {
      nextQuestion(question);
      return;
    }
    if (!selectedQuality || !selectedSize) return;

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
      // Wait for the student to press "Next Interval".
    } else {
      setFeedback('wrong');
      setWrongAttempts((w) => w + 1);
      setStreak(0);
      audio.playWrong();
      if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setFeedback((f) => (f === 'wrong' ? 'idle' : f)), 1100);
    }
  }, [locked, selectedQuality, selectedSize, compound, question, audio, streak, bestStreak, nextQuestion]);

  // Show the correct interval (counts as a miss) so the student can learn from it.
  const handleShowAnswer = useCallback(() => {
    if (locked) return;
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    if (wrongAttempts === 0) setAttempts((a) => a + 1);
    setStreak(0);
    setSelectedQuality(question.interval.quality);
    setSelectedSize(question.interval.size);
    setCompound(question.interval.compound);
    setFeedback('revealed');
    audio.playNotes([question.low, question.high]);
  }, [locked, wrongAttempts, question, audio]);

  const handlePlayInterval = useCallback(() => {
    audio.playNotes([question.low, question.high]);
  }, [audio, question]);

  const startGame = useCallback(() => {
    setStarted(true);
    setScore(0);
    setAttempts(0);
    setStreak(0);
    setBestStreak(0);
    const q = generateQuestion(undefined, intervalFamily);
    setQuestion(q);
    clearAnswer();
    audio.getCtx(); // unlock audio on user gesture
    playSoon(q, 150);
  }, [audio, intervalFamily, clearAnswer, playSoon]);

  // Keyboard on computers: P M m d a choose the quality, 1–8 the size
  // (1 = unison, 8 = octave), C toggles compound, Enter checks, Space replays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (dialog) {
        if (e.key === 'Escape') setDialog(null);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = e.key;

      if (!started) {
        if (key === 'Enter') {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        handleCheck();
        return;
      }
      if (key === ' ') {
        if (target?.tagName === 'BUTTON') return;
        e.preventDefault();
        handlePlayInterval();
        return;
      }
      if (locked) return;
      if (key === 'Backspace' || key === 'Escape') {
        e.preventDefault();
        clearAnswer();
        return;
      }
      if (key === 'c' || key === 'C') {
        toggleCompound();
        return;
      }
      if (QUALITY_KEYS[key]) {
        pickQuality(QUALITY_KEYS[key]);
        return;
      }
      if (/^[1-8]$/.test(key)) {
        pickSize(SIZES[Number(key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, started, locked, startGame, handleCheck, handlePlayInterval, clearAnswer, toggleCompound, pickQuality, pickSize]);

  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
  const familyLabel = INTERVAL_OPTIONS.find((o) => o.id === intervalFamily)?.label;

  const preview = selectedSize
    ? `${selectedQuality ? QUALITY_SYMBOLS[selectedQuality] : '?'}${SIZE_NUMBERS[selectedSize]}${compound ? ' compound' : ''}`
    : '';

  const toolButton =
    'inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 h-11 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-sm font-semibold transition-all border border-stone-300 shadow-sm hover:border-stone-400 cursor-pointer w-full text-center whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div id="interval-app-root" className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center px-4 py-4 sm:py-10">
      <header
        id="game-header"
        className={`w-full ${
          started ? 'max-w-5xl mb-3 md:mb-4' : 'max-w-3xl text-center mb-6 sm:mb-8 flex flex-col items-center justify-center'
        } animate-fade-in`}
      >
        {started ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-center">
            <div className="flex items-center gap-2.5 justify-start min-w-0">
              <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white shadow-sm shrink-0">
                <Music2 className="w-4 h-4" />
              </div>
              <h1 className="game-title">Interval Identification</h1>
            </div>
            <div id="game-stats-bar" className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
              <StatChip label="Score" value={score} accent="text-emerald-700" />
              <StatChip
                label="Streak"
                value={streak}
                accent="text-amber-700"
                icon={<Trophy className="w-3 h-3 text-amber-600 inline" />}
              />
              <StatChip label="Accuracy" value={`${accuracy}%`} accent="text-sky-700" />
              <StatChip label="Best" value={bestStreak} accent="text-violet-700" />
            </div>
          </div>
        ) : (
          <h1 className="game-title">Interval Identification</h1>
        )}
      </header>

      {!started ? (
        <StartScreen
          onStart={startGame}
          bestStreak={bestStreak}
          selectedFamily={intervalFamily}
          onSelectFamily={handleFamilyChange}
        />
      ) : (
        <main id="game-main-board" className="w-full max-w-5xl flex flex-col gap-3 animate-fade-in">
          <div id="game-workspace" className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
            {/* 1. Staff */}
            <div
              id="staff-card"
              className="bg-white rounded-2xl shadow-sm border border-stone-200 p-3 sm:p-4 flex flex-col items-center h-full relative"
            >
              <div className="w-full flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Name this interval
                  </div>
                  {intervalFamily !== 'all' && (
                    <div className="mt-1 inline-block px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700">
                      {familyLabel}
                    </div>
                  )}
                </div>
                <button
                  id="replay-interval-button"
                  onClick={handlePlayInterval}
                  title="Play the interval (Space)"
                  aria-label="Play the interval"
                  className="w-11 h-11 shrink-0 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 border border-stone-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full flex flex-col items-center justify-center flex-1 py-2">
                <Staff low={question.low} high={question.high} clef={question.clef} />
              </div>

              {/* Note names appear once the interval is answered or shown */}
              <div className="min-h-[24px] flex items-center justify-center gap-3 text-stone-900 font-bold">
                {locked && (
                  <>
                    <span>{noteText(question.low)}</span>
                    <span className="text-stone-400">→</span>
                    <span>{noteText(question.high)}</span>
                  </>
                )}
              </div>

              <div className="w-full flex items-center justify-center min-h-[40px]">
                <FeedbackChip feedback={feedback} answer={intervalName(question.interval)} />
              </div>
            </div>

            {/* 2. Answer */}
            <div className="flex flex-col justify-between h-full gap-2">
              <div
                id="answer-selection-panel"
                className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 flex flex-col justify-center flex-1 gap-4 md:gap-5"
              >
                <div>
                  <p className="game-label mb-1.5">Quality</p>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {QUALITIES.map((q) => (
                      <AnswerButton
                        key={q}
                        label={<span className="text-lg">{QUALITY_SYMBOLS[q]}</span>}
                        ariaLabel={q}
                        title={QUALITY_WORDS[q]}
                        selected={selectedQuality === q}
                        disabled={locked}
                        onClick={() => pickQuality(q)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="game-label mb-1.5">Size</p>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {SIZES.map((s) => (
                      <AnswerButton
                        key={s}
                        label={SIZE_SYMBOLS[s]}
                        ariaLabel={s}
                        selected={selectedSize === s}
                        disabled={locked}
                        onClick={() => pickSize(s)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="game-label mb-1.5">
                    Compound <span className="game-caption font-normal">(more than an octave)</span>
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      id="compound-toggle-button"
                      onClick={toggleCompound}
                      disabled={locked || selectedSize === 'unison'}
                      aria-pressed={compound}
                      className={[
                        'col-span-2 h-11 rounded-lg text-base font-semibold transition-all border cursor-pointer',
                        compound
                          ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                          : 'bg-white text-stone-900 border-stone-300 hover:bg-stone-50 hover:border-stone-400',
                        locked || selectedSize === 'unison' ? 'cursor-not-allowed' : '',
                        (locked && !compound) || selectedSize === 'unison' ? 'opacity-40' : '',
                      ].join(' ')}
                    >
                      Compound
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    id="submit-answer-button"
                    onClick={handleCheck}
                    disabled={!locked && (!selectedQuality || !selectedSize)}
                    className={
                      locked
                        ? 'w-full min-h-[48px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-all shadow-sm cursor-pointer'
                        : 'w-full min-h-[48px] py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-sm cursor-pointer'
                    }
                  >
                    {locked ? 'Next Interval' : `Check${preview ? ` — ${preview}` : ''}`}
                  </button>
                  <p className="keyboard-hint game-caption text-center mt-2">
                    <Kbd>P</Kbd>
                    <Kbd>M</Kbd>
                    <Kbd>m</Kbd>
                    <Kbd>d</Kbd>
                    <Kbd>a</Kbd> quality · <Kbd>1</Kbd>–<Kbd>8</Kbd> size · <Kbd>C</Kbd> compound ·{' '}
                    <Kbd>Enter</Kbd> checks · <Kbd>Space</Kbd> plays
                  </p>
                </div>

                {wrongAttempts > 0 && !locked && (
                  <p className="text-center text-sm font-semibold text-rose-700">
                    {wrongAttempts >= 2 ? 'Not quite. Try again, or press Show answer.' : 'Not quite — try again.'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 w-full items-stretch">
                <button id="theory-tips-button" onClick={() => setDialog('tips')} className={toolButton}>
                  <Lightbulb className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>Theory Tips</span>
                </button>
                <button id="settings-button" onClick={() => setDialog('settings')} className={toolButton}>
                  <Settings className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>Settings</span>
                </button>
                <button id="show-answer-button" onClick={handleShowAnswer} disabled={locked} className={toolButton}>
                  <Eye className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>Show answer</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {dialog === 'tips' && (
        <Modal title="Music Theory Tips" icon={<Lightbulb className="w-5 h-5 text-stone-600" />} onClose={() => setDialog(null)}>
          <TheoryTips />
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal
          title="Choose your intervals"
          icon={<Settings className="w-5 h-5 text-stone-600" />}
          onClose={() => setDialog(null)}
          narrow
        >
          <IntervalOptionButtons selectedFamily={intervalFamily} onSelectFamily={handleFamilyChange} />
        </Modal>
      )}

      <footer className="mt-8 text-center text-xs text-stone-500">Online Music Learning Lab</footer>
    </div>
  );
}

function FeedbackChip({ feedback, answer }: { feedback: Feedback; answer: string }) {
  if (feedback === 'correct') {
    return (
      <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm animate-pop-in">
        <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
        <span>Correct — {answer}</span>
      </div>
    );
  }
  if (feedback === 'revealed') {
    return (
      <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-sky-50 border border-sky-200 text-sky-900 font-bold text-sm animate-pop-in">
        <Eye className="w-4 h-4 shrink-0" />
        <span>This is {/^[aeiou]/i.test(answer) ? 'an' : 'a'} {answer}</span>
      </div>
    );
  }
  if (feedback === 'wrong') {
    return (
      <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold text-sm animate-shake">
        <span className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0">
          <X className="w-3 h-3" strokeWidth={3} />
        </span>
        <span>Try again</span>
      </div>
    );
  }
  return null;
}

function AnswerButton({
  label,
  ariaLabel,
  title,
  selected,
  disabled,
  onClick,
}: {
  key?: string; // listed so the type checker accepts React's "key" here
  label: ReactNode;
  ariaLabel?: string;
  title?: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={selected}
      title={title}
      className={[
        'h-11 min-w-0 rounded-lg text-base font-semibold transition-all border cursor-pointer inline-flex items-center justify-center',
        selected
          ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
          : 'bg-white text-stone-900 border-stone-300 hover:bg-stone-50 hover:border-stone-400',
        disabled && !selected ? 'opacity-40' : '',
        disabled ? 'cursor-not-allowed' : '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function IntervalOptionButtons({
  selectedFamily,
  onSelectFamily,
}: {
  selectedFamily: IntervalFamily;
  onSelectFamily: (family: IntervalFamily) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {INTERVAL_OPTIONS.map((opt) => {
        const isSelected = selectedFamily === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            id={`option-button-${opt.id}`}
            onClick={() => onSelectFamily(opt.id)}
            aria-pressed={isSelected}
            className={[
              'w-full min-h-[48px] text-left px-4 py-3 rounded-xl border text-sm sm:text-base font-bold transition-all cursor-pointer flex items-center justify-between gap-2',
              isSelected
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-300',
            ].join(' ')}
          >
            <span className="leading-snug">{opt.label}</span>
            {isSelected && <Check className="w-4 h-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function StartScreen({
  onStart,
  bestStreak,
  selectedFamily,
  onSelectFamily,
}: {
  onStart: () => void;
  bestStreak: number;
  selectedFamily: IntervalFamily;
  onSelectFamily: (family: IntervalFamily) => void;
}) {
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
    <div id="start-screen" className="w-full max-w-2xl mx-auto flex flex-col items-center animate-fade-in">
      <div id="start-screen-card" className="w-full bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm mb-5 text-left">
        <div className="flex items-center gap-2 mb-3 text-stone-900">
          <Music2 className="w-5 h-5 text-stone-600 shrink-0" />
          <span className="game-section-heading">Directions</span>
        </div>
        <p className="game-subtitle mb-2.5">Two notes appear on a treble or bass staff:</p>
        <ul className="game-body list-disc list-inside space-y-1.5 leading-relaxed">
          <li>Choose the interval's quality and size</li>
          <li>Press Compound if it spans more than an octave</li>
          <li>Press Check</li>
        </ul>
        <p className="keyboard-hint game-caption mt-3">
          On a computer you can also type: <Kbd>M</Kbd>
          <Kbd>3</Kbd> for a major 3rd, <Kbd>C</Kbd> for compound, then <Kbd>Enter</Kbd>.
        </p>

        <div className="mt-5 pt-4 border-t border-stone-200">
          <p className="game-label mb-2">Interval quality symbols</p>
          <div className="grid grid-cols-5 gap-2">
            {qualitySymbols.map((q) => (
              <div key={q.name} className="rounded-xl border border-stone-200 bg-stone-50 py-2 text-center">
                <div className="text-[11px] sm:text-xs font-semibold text-stone-600">{q.name}</div>
                <div className="text-xl font-bold text-stone-900 leading-tight">{q.symbol}</div>
              </div>
            ))}
          </div>
          <p className="game-label mt-4 mb-2">Special size symbols</p>
          <div className="grid grid-cols-5 gap-2">
            {specialSizeSymbols.map((s) => (
              <div key={s.name} className="rounded-xl border border-stone-200 bg-stone-50 py-2 text-center">
                <div className="text-[11px] sm:text-xs font-semibold text-stone-600">{s.name}</div>
                <div className="text-xl font-bold text-stone-900 leading-tight">{s.symbol}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2 text-stone-900">
            <SlidersHorizontal className="w-4.5 h-4.5 text-stone-600 shrink-0" />
            <span className="game-section-heading">Choose your intervals</span>
          </div>
          <IntervalOptionButtons selectedFamily={selectedFamily} onSelectFamily={onSelectFamily} />
        </div>
      </div>
      <button
        id="start-button"
        onClick={onStart}
        className="inline-flex items-center gap-2 min-h-[48px] px-7 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold text-base transition-all shadow-sm cursor-pointer"
      >
        <Play className="w-4.5 h-4.5" />
        Start
      </button>
      {bestStreak > 0 && <p className="mt-3.5 text-xs text-stone-500">Best streak so far: {bestStreak}</p>}
    </div>
  );
}

function Modal({
  title,
  icon,
  onClose,
  narrow = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${narrow ? 'max-w-md' : 'max-w-lg'} max-h-[90vh] overflow-y-auto bg-white border border-stone-200 rounded-2xl p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
            {icon}
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block min-w-[1.4em] px-1 py-px mx-px rounded border border-stone-300 bg-stone-50 text-[0.8em] font-semibold text-stone-800 text-center font-sans">
      {children}
    </kbd>
  );
}

function TheoryTips() {
  return (
    <div className="space-y-3 text-stone-800 text-sm sm:text-base leading-relaxed">
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <h4 className="font-bold text-stone-900 text-base mb-2">How to name an interval</h4>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Find the size first by counting letter names (lines and spaces), including both notes.</li>
          <li>Ignore the accidentals and find the quality of the plain interval.</li>
          <li>Add the accidentals back one at a time and adjust the quality.</li>
        </ul>
      </div>

      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <h4 className="font-bold text-stone-900 text-base mb-2">Intervals without accidentals</h4>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>All 5ths above the scale notes are perfect except above B.</li>
          <li>All 4ths above the scale notes are perfect except above F.</li>
          <li>The 3rds above C, F and G (1, 4, 5) are major, and all others are minor.</li>
          <li>All 2nds above the scale notes are major except E–F and B–C.</li>
        </ul>
      </div>

      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <h4 className="font-bold text-stone-900 text-base mb-2">Compound intervals</h4>
        <p>
          An interval larger than an octave is compound. Take away an octave (7 letter names) to find its
          simple size: a 9th is a compound 2nd, a 10th is a compound 3rd, and so on. The quality stays the
          same.
        </p>
      </div>
    </div>
  );
}

function StatChip({ label, value, accent, icon }: { label: string; value: string | number; accent: string; icon?: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-2xs px-1.5 sm:px-2.5 py-1 text-center min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-600 leading-tight">{label}</div>
      <div className={`text-sm sm:text-base font-bold flex items-center justify-center gap-0.5 leading-tight ${accent}`}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}
