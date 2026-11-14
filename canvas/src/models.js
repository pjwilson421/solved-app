// Models shown in menus. `on: true` = wired to the server (api/hf-*.js). Others are listed like Luma's
// locked models: visible, marked "Not connected", not clickable.
export const IMAGE_MODELS = [
  { key: 'gpt_image_2_5', name: 'GPT Image 2.5', on: true },
  { key: 'nano_banana', name: 'Nano Banana' },
  { key: 'nano_banana_pro', name: 'Nano Banana Pro' },
  { key: 'seedream', name: 'Seedream' },
  { key: 'flux_pro', name: 'Flux Pro' },
  { key: 'ideogram', name: 'Ideogram' },
];
export const VIDEO_MODELS = {
  kling3: { name: 'Kling 3.0', min: 3, max: 15, needsFrame: true, on: true },
  seedance: { name: 'Seedance 2.5', min: 4, max: 30, needsFrame: false, on: true, ratios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], res: ['480p', '720p', '1080p'] },
  veo: { name: 'Veo 3.1' },
  kling4: { name: 'Kling 4.0' },
  minimax: { name: 'MiniMax' },
};
export const AUDIO_MODELS = [
  { key: 'el_music', name: 'ElevenLabs Music' },
  { key: 'el_sfx', name: 'ElevenLabs SFX' },
  { key: 'el_voice', name: 'ElevenLabs Voice' },
];
export const IMAGE_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'];
export const IMAGE_SIZES = ['1k', '2k', '4k'];
export const LABELS = [
  { key: 'approved', name: 'Approved', color: '#22a55b' },
  { key: 'pending', name: 'Pending', color: '#e0a100' },
  { key: 'rejected', name: 'Rejected', color: '#e5484d' },
  { key: 'review', name: 'Needs review', color: '#8e4ec6' },
  { key: 'progress', name: 'In progress', color: '#1985FF' },
];
export const COLORS = [
  { key: 'auto', name: 'Auto', hex: null },
  { key: 'white', name: 'White', hex: '#ffffff' },
  { key: 'gray', name: 'Gray', hex: '#8b8b8b' },
  { key: 'violet', name: 'Light violet', hex: '#b9a6f5' },
  { key: 'yellow', name: 'Yellow', hex: '#f5c518' },
  { key: 'orange', name: 'Orange', hex: '#f5862a' },
  { key: 'red', name: 'Red', hex: '#e5484d' },
  { key: 'lightred', name: 'Light red', hex: '#f4a3a3' },
  { key: 'lightgreen', name: 'Light green', hex: '#9bdca8' },
  { key: 'green', name: 'Green', hex: '#22a55b' },
  { key: 'blue', name: 'Blue', hex: '#1985FF' },
  { key: 'lightblue', name: 'Light blue', hex: '#9cc9ff' },
];
export const hexOf = key => COLORS.find(c => c.key === key)?.hex || null;

// Nearest aspect ratio GPT Image 2.5 accepts.
export function nearestRatio(a) {
  const [w, h] = String(a || '16:9').split(':').map(Number);
  const r = w / h || 16 / 9;
  const d = x => { const [a2, b2] = x.split(':').map(Number); return Math.abs(Math.log(a2 / b2 / r)); };
  return IMAGE_RATIOS.reduce((best, x) => d(x) < d(best) ? x : best, '1:1');
}

// Prompts behind Luma-style one-click actions (run through GPT Image 2.5 with the image as reference).
export const PRESETS = {
  upscale: 'Reproduce this exact image at higher resolution with finer detail and sharper textures. Do not change the composition, subject, colors, lighting or framing in any way.',
  reframe: 'Reframe this exact image to the new aspect ratio. Extend the scene naturally beyond the original edges; keep the subject, lighting, color and style identical.',
  blend: 'Blend the reference images into one coherent new image: merge their subjects, color palettes and styles naturally.',
  removeBg: 'Keep the main subject exactly as it is and remove everything else; place the subject on a pure white seamless background with a soft natural contact shadow.',
  depth: 'Convert this image into a grayscale depth map: nearest surfaces pure white, farthest pure black, smooth gradients in between. Keep the exact framing.',
};
