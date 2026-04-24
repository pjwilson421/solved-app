// Test file to demonstrate the centralized video prompt builder transformation
import { buildVideoPrompt } from './lib/ai/build-video-prompt.js';

// Example transformation
const userPrompt = "car driving fast";
const settings = {
  aspectRatio: "16:9",
  resolution: "4K",
  duration: "10s",
  hasStartFrame: false,
  hasEndFrame: false,
  startFrameEndFrame: false,
};

const enhancedPrompt = buildVideoPrompt(userPrompt, settings);

console.log("=== VIDEO PROMPT TRANSFORMATION DEMONSTRATION ===\n");
console.log("Input:");
console.log('"car driving fast"');
console.log("\nOutput (sent to video model):");
console.log(enhancedPrompt);
