// ─── Model names ──────────────────────────────────────────────────────────────
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-001";

// ─── Image generation ─────────────────────────────────────────────────────────
export const IMAGE_NUMBER_OF_IMAGES = 1;
export const IMAGE_ASPECT_RATIO = "1:1";

// ─── Autosave ─────────────────────────────────────────────────────────────────
export const AUTOSAVE_DEBOUNCE_MS = 2200;

// ─── History ──────────────────────────────────────────────────────────────────
/** Characters to use from the first line of source text as an auto-title seed */
export const TITLE_SEED_LENGTH = 48;

// ─── PPTX export colours (hex without #) ─────────────────────────────────────
export const PPTX_BG_COLOR = "1a1040";
export const PPTX_TITLE_COLOR = "FFFFFF";
export const PPTX_BODY_COLOR = "E0D8FF";
export const PPTX_ACCENT_COLOR = "C4B5FD";
export const PPTX_CLOSING_ACCENT_COLOR = "A78BFA";
export const PPTX_FONT_FACE = "Calibri";

// ─── Output transform instructions ───────────────────────────────────────────
export const OUTPUT_TRANSFORM_INSTRUCTIONS = {
  shorten:
    "Make this output around 30-40% shorter while preserving key meaning and action items.",
  expand:
    "Expand this output with practical detail, examples, and clearer structure while preserving the intent.",
  tone: "Improve tone and readability so it sounds confident, practical, and natural without adding hype.",
} as const;

export type OutputTransformType = keyof typeof OUTPUT_TRANSFORM_INSTRUCTIONS;

// ─── Error classification ─────────────────────────────────────────────────────
export type WorkspaceErrorKind =
  | "quota"
  | "network"
  | "credits"
  | "auth"
  | "validation"
  | "unknown";

export interface ClassifiedError {
  kind: WorkspaceErrorKind;
  userMessage: string;
}

export function classifyWorkspaceError(err: unknown): ClassifiedError {
  if (!(err instanceof Error)) {
    return { kind: "unknown", userMessage: "Something went wrong. Please try again." };
  }

  const msg = err.message.toLowerCase();

  // Firebase HttpsError codes arrive as err.code on the error object
  const code = (err as { code?: string }).code ?? "";

  if (
    msg.includes("insufficient_credits") ||
    msg.includes("not enough credits") ||
    msg.includes("you need at least")
  ) {
    return {
      kind: "credits",
      userMessage:
        "Not enough credits for this run. Add credits using the button in the header.",
    };
  }

  if (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    code === "resource-exhausted"
  ) {
    return {
      kind: "quota",
      userMessage: "Gemini rate limit reached. Wait a moment and try again.",
    };
  }

  if (
    msg === "failed to fetch" ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("network request failed") ||
    code === "unavailable"
  ) {
    return {
      kind: "network",
      userMessage: "Network error — check your connection and try again.",
    };
  }

  if (
    msg.includes("unauthenticated") ||
    msg.includes("permission-denied") ||
    code === "unauthenticated" ||
    code === "permission-denied"
  ) {
    return {
      kind: "auth",
      userMessage: "Authentication error. Try signing out and back in.",
    };
  }

  return {
    kind: "unknown",
    userMessage: err.message || "We couldn't complete that run. Please try again.",
  };
}
