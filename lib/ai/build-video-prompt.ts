export type VideoSettings = {
  aspectRatio: string;
  resolution: string;
  duration: string;
  hasStartFrame?: boolean;
  hasEndFrame?: boolean;
  startFrameEndFrame?: boolean;
};

function cleanPrompt(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function isVaguePrompt(input: string): boolean {
  if (!input) return true;
  const words = input.split(/\s+/).filter(Boolean);
  return words.length <= 3 || input.length < 18;
}

function enhanceSubject(userPrompt: string): string {
  if (!userPrompt) {
    return "A compelling visual subject with clear form and identity.";
  }
  if (!isVaguePrompt(userPrompt)) {
    return userPrompt;
  }
  return `${userPrompt}; elevate it into a visually striking subject with clear definition and presence.`;
}

function describeScene(userPrompt: string): string {
  if (isVaguePrompt(userPrompt)) {
    return "Place the subject in a coherent environment with believable depth, scale, and supporting visual elements.";
  }
  return "Build a coherent scene that strengthens the subject narrative without clutter.";
}

function inferMotionFromPrompt(userPrompt: string, hasStartFrame: boolean, hasEndFrame: boolean): string {
  const lowerPrompt = userPrompt.toLowerCase();
  
  // Direct motion keywords
  if (lowerPrompt.includes('drive') || lowerPrompt.includes('driving')) {
    return "Dynamic forward motion with realistic vehicle movement, wheels rotating, environment flowing past";
  }
  if (lowerPrompt.includes('walk') || lowerPrompt.includes('walking')) {
    return "Natural bipedal locomotion with rhythmic gait, arm swing, and subtle body movement";
  }
  if (lowerPrompt.includes('run') || lowerPrompt.includes('running')) {
    return "Energetic forward motion with dynamic leg movement, arm pumping, and environmental interaction";
  }
  if (lowerPrompt.includes('fly') || lowerPrompt.includes('flying')) {
    return "Graceful aerial movement with natural flight dynamics, wind effects, and spatial navigation";
  }
  if (lowerPrompt.includes('dance') || lowerPrompt.includes('dancing')) {
    return "Rhythmic body movement with coordinated motion, flow, and expressive gestures";
  }
  if (lowerPrompt.includes('wave') || lowerPrompt.includes('ocean') || lowerPrompt.includes('water')) {
    return "Fluid water motion with natural wave dynamics, ripples, and liquid movement";
  }
  if (lowerPrompt.includes('wind') || lowerPrompt.includes('leaves') || lowerPrompt.includes('trees')) {
    return "Gentle environmental movement with natural swaying, rustling, and air currents";
  }
  
  // Frame-based motion
  if (hasStartFrame && hasEndFrame) {
    return "Smooth transitional motion connecting start and end frames with natural progression";
  }
  if (hasStartFrame || hasEndFrame) {
    return "Cinematic motion evolving from the reference frame with natural movement";
  }
  
  // Default motion for vague prompts
  if (isVaguePrompt(userPrompt)) {
    return "Subtle, natural movement with gentle motion and dynamic presence";
  }
  
  return "Intentional, purposeful motion that enhances the subject and scene";
}

function describeCameraMovement(userPrompt: string, hasStartFrame: boolean, hasEndFrame: boolean): string {
  const lowerPrompt = userPrompt.toLowerCase();
  
  // Specific camera movements from prompt
  if (lowerPrompt.includes('pan') || lowerPrompt.includes('sweep')) {
    return "Smooth horizontal panning movement with consistent speed and stable horizon";
  }
  if (lowerPrompt.includes('zoom') || lowerPrompt.includes('dolly') || lowerPrompt.includes('push')) {
    return "Controlled forward or backward movement with smooth perspective changes";
  }
  if (lowerPrompt.includes('orbit') || lowerPrompt.includes('rotate') || lowerPrompt.includes('circle')) {
    return "Graceful orbital movement around the subject with maintained focus";
  }
  if (lowerPrompt.includes('tilt') || lowerPrompt.includes('up') || lowerPrompt.includes('down')) {
    return "Smooth vertical camera movement with controlled angle changes";
  }
  
  // Frame-based camera work
  if (hasStartFrame && hasEndFrame) {
    return "Cinematic camera movement that naturally transitions between keyframes";
  }
  
  // Default cinematic approach
  return "Cinematic camera placement with thoughtful composition and subtle, natural movement";
}

function describeStyle(userPrompt: string): string {
  const lowerPrompt = userPrompt.toLowerCase();
  
  if (lowerPrompt.includes('cinematic') || lowerPrompt.includes('film') || lowerPrompt.includes('movie')) {
    return "Cinematic filmmaking style with dramatic lighting, composition, and visual storytelling";
  }
  if (lowerPrompt.includes('documentary') || lowerPrompt.includes('real') || lowerPrompt.includes('authentic')) {
    return "Documentary realism with natural lighting, authentic movement, and observational perspective";
  }
  if (lowerPrompt.includes('commercial') || lowerPrompt.includes('ad') || lowerPrompt.includes('brand')) {
    return "Commercial production quality with polished aesthetics, premium lighting, and professional composition";
  }
  if (lowerPrompt.includes('artistic') || lowerPrompt.includes('creative') || lowerPrompt.includes('abstract')) {
    return "Artistic interpretation with creative visual language, expressive motion, and stylized presentation";
  }
  
  return "High-end cinematic production with professional visual quality and artistic composition";
}

function getDurationDescription(duration: string): string {
  switch (duration) {
    case "5s":
      return "5-second short-form video with concise motion and immediate impact";
    case "6s":
      return "6-second brief video with focused motion and clear progression";
    case "8s":
    default:
      return "8-second extended video with developed motion and narrative progression";
  }
}

function getTechnicalSpecs(settings: VideoSettings): string {
  const durationDesc = getDurationDescription(settings.duration);
  return `${durationDesc}, ${settings.aspectRatio} aspect ratio, ${settings.resolution} resolution`;
}

export function buildVideoPrompt(userPrompt: string, settings: VideoSettings): string {
  const prompt = cleanPrompt(userPrompt);
  
  return [
    `[1] SUBJECT\n${enhanceSubject(prompt)}`,
    `[2] SCENE / ENVIRONMENT\n${describeScene(prompt)}`,
    `[3] ACTION / MOTION\n${inferMotionFromPrompt(prompt, settings.hasStartFrame || false, settings.hasEndFrame || false)}`,
    `[4] STYLE\n${describeStyle(prompt)}`,
    `[5] CAMERA\n${describeCameraMovement(prompt, settings.hasStartFrame || false, settings.hasEndFrame || false)}`,
    `[6] LIGHTING\nCinematic lighting with realistic shadows, natural highlights, controlled contrast, and atmospheric depth`,
    `[7] COLOR / MOOD\nHarmonized color palette with emotional coherence, natural skin tones, and polished grading`,
    `[8] DETAIL / REALISM LEVEL\nHigh detail fidelity, realistic textures, crisp edges, natural motion blur, and production-grade finish`,
    `[9] TECHNICAL SPECS\n${getTechnicalSpecs(settings)}`,
    `[10] NEGATIVE INSTRUCTIONS\nNo text, no logos, no watermark, no flickering, no jitter, no distortion, no artifacts, no inconsistent motion, no frame warping, no shaky footage, no unnatural movements`,
  ].join("\n\n");
}
