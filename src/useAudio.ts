import { useCallback, useRef } from 'react';
import { midiNumber, type Note } from '@/music';

/**
 * Web Audio API helpers: play a pleasant bell for correct answers,
 * a buzzer for wrong answers, and the two notes of an interval.
 */
export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (
      ctx: AudioContext,
      freq: number,
      start: number,
      duration: number,
      type: OscillatorType = 'sine',
      gain = 0.18,
    ) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(gain, start + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    },
    [],
  );

  const playNotes = useCallback(
    (notes: Note[]) => {
      const ctx = getCtx();
      const now = ctx.currentTime;
      notes.forEach((n, i) => {
        const midi = midiNumber(n);
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        playTone(ctx, freq, now + i * 0.55, 1.2, 'triangle', 0.16);
      });
    },
    [getCtx, playTone],
  );

  const playCorrect = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Bright ascending arpeggio bell (C5 E5 G5 C6)
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => {
      playTone(ctx, f, now + i * 0.09, 0.6, 'sine', 0.2);
      playTone(ctx, f * 2, now + i * 0.09, 0.4, 'sine', 0.06);
    });
  }, [getCtx, playTone]);

  const playWrong = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Low buzzer: square wave with slight pitch drop.
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.35);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.15, now + 0.02);
    env.gain.setValueAtTime(0.15, now + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }, [getCtx]);

  return { playNotes, playCorrect, playWrong, getCtx };
}
