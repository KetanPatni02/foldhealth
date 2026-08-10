/* Waveform data (seeded random heights for consistent look) */
export const WAVE_BARS = Array.from({ length: 120 }, (_, i) => {
  const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return 3 + (seed - Math.floor(seed)) * 12;
});

export const RECORDING_URL =
  'https://osnihfqqrcchsaqhagcx.supabase.co/storage/v1/object/sign/Call%20Recording/call_recording.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hMzBhZDI5OS1mYjE0LTQ2ZjUtOTQ1NC0xOGM2OTNiNjEyMzkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJDYWxsIFJlY29yZGluZy9jYWxsX3JlY29yZGluZy5tcDMiLCJpYXQiOjE3NzY5MzA1MjMsImV4cCI6MTc3NzUzNTMyM30.jjYQNHs_zPGBSwpw6G4zUdn-oYinz8NkHvSRSP_YAIs';

export function formatTime(secs) {
  if (!secs || isNaN(secs)) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
