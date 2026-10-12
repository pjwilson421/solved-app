import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', quiet: true });
import { generateSeedance, seedanceExample } from './lib/seedance.js';
try {
  console.log(await generateSeedance(seedanceExample));
} catch {
  console.error('Seedance generation did not complete successfully. No video URL verified.');
  process.exitCode = 1;
}
