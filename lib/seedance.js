import { config, higgsfield } from '@higgsfield/client/v2';
export async function generateSeedance(input) {
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials) throw new Error('HF_CREDENTIALS is missing');
  config({ credentials });
  const result = await higgsfield.subscribe('bytedance/seedance-2.5/text-to-video', {
    input, withPolling: true
  });
  if (result.status !== 'completed') throw new Error('Generation ended with status: ' + (result.status || 'unknown'));
  const url = result.video?.url;
  if (!url || !url.startsWith('https://')) throw new Error('Completed request returned no video URL');
  return url;
}
export const seedanceExample = {
  prompt: 'A cinematic scene at sunset', duration: 5, resolution: '720p', aspect_ratio: '16:9'
};
