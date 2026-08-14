import React, { useCallback, useRef, useState } from 'react';
import { Check, X, Music2, Volume2, RotateCcw, Trophy, Play } from 'lucide-react';
import { Staff } from '@/Staff';
import { useAudio } from '@/useAudio';
import {
  type Interval,
  type Quality,
  type SizeName,
  generateQuestion,
  intervalsEqual,
  noteName,
} from '@/music';

const QUALITIES: Quality[] = ['perfect', 'minor', 'major', 'diminished', 'augmented'];
const SIZES: SizeName[] = [
  'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave',
];

type Feedback = 'idle' | 'correct' | 'wrong';

export default function App() {
  const audio = useAudio();
  const [question, setQuestion] = useState(() => generateQuestion());
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
  const questionKey = useRef(0);

  const nextQuestion = useCallback(
    (prev: Interval) => {
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
      window.setTimeout(() => nextQuestion(question.interval), 1700);
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
    <div id="interval-app-root" className="min-h-screen text-ink-800 flex flex-col items-center px-4 py-8 sm:py-12">
      {/* Header */}
      <header id="game-header" className="w-full max-w-3xl text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 text-amber-600 mb-2">
          <Music2 className="w-7 h-7" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">Ear Training</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink-900">
          Interval Identification
        </h1>
        <p className="mt-3 text-ink-600 text-base sm:text-lg">
          Identify the melodic interval between the two notes on the staff.
        </p>
      </header>

      {!started ? (
        <StartScreen onStart={startGame} bestStreak={bestStreak} />
      ) : (
        <main id="game-main-board" className="w-full max-w-3xl flex flex-col gap-6 animate-fade-in">
          {/* Stats bar */}
          <div id="game-stats-bar" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Score" value={score} accent="text-emerald-600" />
            <StatCard label="Streak" value={streak} accent="text-amber-600" icon={<Trophy className="w-4 h-4" />} />
            <StatCard label="Accuracy" value={`${accuracy}%`} accent="text-sky-600" />
            <StatCard label="Best Streak" value={bestStreak} accent="text-violet-600" />
          </div>

          {/* Staff + feedback area */}
          <div id="game-staff-area" className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-stretch">
            {/* Staff card */}
            <div id="staff-card" className="bg-white rounded-2xl shadow-xl border border-ink-200 p-4 sm:p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white to-ink-50 opacity-50 pointer-events-none" />
              <div className="relative">
                <Staff low={question.low} high={question.high} />
                <div className="mt-3 flex items-center justify-center gap-4 text-ink-700">
                  <span className="text-sm font-medium">{noteName(question.low)}</span>
                  <span className="text-ink-300">→</span>
                  <span className="text-sm font-medium">{noteName(question.high)}</span>
                </div>
              </div>
            </div>

            {/* Feedback panel */}
            <div id="feedback-container" className="flex md:flex-col items-center justify-center min-h-[120px] md:min-w-[140px]">
              <FeedbackPanel feedback={feedback} />
            </div>
          </div>

          {/* Replay interval button */}
          <div className="flex justify-center">
            <button
              id="replay-interval-button"
              onClick={handlePlayInterval}
              disabled={feedback === 'correct'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-800 text-sm font-medium transition-colors border border-ink-300 shadow-sm"
            >
              <Volume2 className="w-4 h-4" />
              Play interval again
            </button>
          </div>

          {/* Answer selection */}
          <div id="answer-selection-panel" className="bg-white/80 backdrop-blur rounded-2xl border border-ink-200 shadow-lg p-4 sm:p-6 space-y-4">
            {/* Quality row */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Quality</p>
              <div className="flex flex-wrap gap-2">
                {QUALITIES.map((q) => (
                  <AnswerButton
                    key={q}
                    label={q}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <AnswerButton
                    key={s}
                    label={s}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
                Compound <span className="normal-case text-ink-400 font-normal">(adds an octave)</span>
              </p>
              <button
                id="compound-toggle-button"
                onClick={() => {
                  setCompound((c) => !c);
                  setFeedback('idle');
                }}
                disabled={feedback === 'correct' || selectedSize === 'unison'}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                  compound
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30 scale-105'
                    : 'bg-white text-ink-700 border-ink-300 hover:bg-ink-100 hover:border-ink-400',
                  (feedback === 'correct' || selectedSize === 'unison') ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                compound
              </button>
            </div>

            {/* Select button */}
            <div className="pt-2">
              <button
                id="submit-answer-button"
                onClick={handleSelect}
                disabled={!selectedQuality || !selectedSize || feedback === 'correct'}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-ink-300 disabled:to-ink-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
              >
                {feedback === 'correct'
                  ? 'Correct! Next…'
                  : `Select${selectedSize ? ` — ${selectedQuality ?? '?'} ${compound ? 'compound ' : ''}${selectedSize}` : ''}`}
              </button>
            </div>

            {wrongAttempts > 0 && feedback !== 'correct' && (
              <p className="text-center text-sm text-rose-600">
                Not quite — try again. ({wrongAttempts} {wrongAttempts === 1 ? 'attempt' : 'attempts'} so far)
              </p>
            )}
          </div>

          {/* Reset */}
          <div className="flex justify-center pt-2">
            <button
              id="restart-game-button"
              onClick={startGame}
              className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restart game
            </button>
          </div>
        </main>
      )}

      <footer className="mt-10 text-center text-xs text-ink-400">
        Notation rendered with the Bravura music font (SMuFL). Sounds synthesized live.
      </footer>
    </div>
  );
}

function StartScreen({ onStart, bestStreak }: { onStart: () => void; bestStreak: number }) {
  return (
    <div id="start-screen" className="text-center animate-fade-in">
      <p className="text-ink-600 max-w-md mx-auto mb-6">
        You'll see two notes on a treble staff. Choose the interval's <em>quality</em> and <em>size</em>, toggle <em>compound</em> if it spans more than an octave, then press Select. A bell means correct; a buzzer means try again.
      </p>
      <button
        id="start-game-button"
        onClick={onStart}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg transition-all shadow-lg shadow-amber-500/30"
      >
        <Play className="w-5 h-5" />
        Start
      </button>
      {bestStreak > 0 && (
        <p className="mt-4 text-sm text-ink-500">Best streak so far: {bestStreak}</p>
      )}
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
    <div className="bg-white/80 backdrop-blur rounded-xl border border-ink-200 shadow-sm px-4 py-3 text-center">
      <div className="text-xs uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 flex items-center justify-center gap-1 ${accent}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function AnswerButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  key?: React.Key;
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border',
        selected
          ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30 scale-105'
          : 'bg-white text-ink-700 border-ink-300 hover:bg-ink-100 hover:border-ink-400',
        disabled && !selected ? 'opacity-40 cursor-not-allowed' : '',
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
