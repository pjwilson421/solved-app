// Test file to demonstrate the centralized prompt builder transformation
import { buildImagePrompt } from './lib/ai/build-image-prompt.js';

// Example transformation
const userPrompt = "modern house";
const settings = {
  assetType: "Standard",
  aspectRatio: "16:9",
  resolution: "4K",
  numberOfVariations: 1,
  targetWidth: 3840,
  targetHeight: 2160,
  variationIndex: 0,
  variationTotal: 1,
  referenceImageCount: 0,
};

const enhancedPrompt = buildImagePrompt(userPrompt, settings);

console.log("=== PROMPT TRANSFORMATION DEMONSTRATION ===\n");
console.log("Input:");
console.log('"modern house"');
console.log("\nOutput (sent to image model):");
console.log(enhancedPrompt);
