// Piano sound settings.
//
// The piano recordings are stored on this site (in public/piano) instead of
// being downloaded from an outside sound server, which school web filters
// often block. Only the two loudness layers the game actually plays are
// loaded, so the piano starts faster on slow school Wi-Fi.
//
// The sound library asks for names like 'Mf A#2.ogg'. The copies in
// public/piano are named 'Mf-As2.ogg' (no spaces or '#') so they are safe in
// web addresses, so we translate each request before fetching it.

const ALL_MIDI_NOTES = Array.from({ length: 128 }, (_, i) => i);

export const PIANO_SAMPLE_OPTIONS = {
  baseUrl: '/piano',
  notesToLoad: { notes: ALL_MIDI_NOTES, velocityRange: [78, 95] as [number, number] },
  storage: {
    fetch: (url: string) => fetch(url.replace(/%20/g, '-').replace(/%23/g, 's')),
  },
};
