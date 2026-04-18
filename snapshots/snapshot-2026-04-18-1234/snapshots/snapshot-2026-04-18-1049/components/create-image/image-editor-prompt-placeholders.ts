import type { ImageEditorToolId } from "@/components/create-image/ImageEditorToolStrip";

/**
 * Default Image Editor prompt bar placeholder. Keep this single source of truth so SSR and
 * hydration use the exact same string (see PromptBar overlay + textarea placeholder).
 */
export const IMAGE_EDITOR_DEFAULT_PROMPT_PLACEHOLDER = "Describe your edits...";

export function imageEditorPromptBarPlaceholderForActiveTool(
  activeTool: ImageEditorToolId | null,
): string {
  switch (activeTool) {
    case "add":
      return "Paint over the area you want to add an object...";
    case "remove":
      return "Paint over the area you want to remove an object...";
    case "enhance":
    case "regenerate":
      return IMAGE_EDITOR_DEFAULT_PROMPT_PLACEHOLDER;
    case "text":
      return "Type anywhere on the image...";
    case "draw":
      return "Draw anywhere on the image...";
    default:
      return IMAGE_EDITOR_DEFAULT_PROMPT_PLACEHOLDER;
  }
}
