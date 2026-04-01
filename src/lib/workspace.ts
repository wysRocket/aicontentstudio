import type { Timestamp } from "firebase/firestore";

export const WORKSPACE_TOOL_MODES = [
  "write_rewrite",
  "summarize",
  "transcribe",
  "translate",
  "generate_image",
  "create_document",
  "create_presentation",
] as const;

export type WorkspaceToolMode = (typeof WORKSPACE_TOOL_MODES)[number];
export type WorkspaceRunStatus = "draft" | "completed" | "failed";

export interface WorkspaceRunRecord {
  id: string;
  mode: WorkspaceToolMode;
  title: string;
  sourceText: string;
  instructions: string;
  outputText: string;
  targetLanguage: string;
  status: WorkspaceRunStatus;
  creditCost: number;
  tokenCount: number;
  sourceFileName: string;
  sourceMimeType: string;
  lastError: string;
  /** Compressed JPEG thumbnail for image runs (≤100 KB base64 data URI). Not stored for other modes. */
  thumbnailBase64?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * Compress a full-size image data URL to a JPEG thumbnail suitable for
 * storage in Firestore (target ≤ maxSizeBytes, default 90 KB).
 * Scales down to at most maxDimension px on the longest side first, then
 * reduces JPEG quality until the size target is met.
 */
export async function compressImageToThumbnail(
  dataUrl: string,
  maxSizeBytes = 90 * 1024,
  maxDimension = 400,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Reduce quality until we're under the size target
      let quality = 0.8;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > maxSizeBytes * 1.37 && quality > 0.1) {
        quality = Math.max(0.1, quality - 0.1);
        result = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for thumbnail compression"));
    img.src = dataUrl;
  });
}

export type WorkspaceRunInput = Omit<
  WorkspaceRunRecord,
  "id" | "createdAt" | "updatedAt"
>;

export interface WorkspaceToolMeta {
  label: string;
  eyebrow: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  instructionsLabel: string;
  instructionsPlaceholder: string;
  outputLabel: string;
  cost: number;
  acceptsFile: boolean;
}

export const WORKSPACE_TOOL_CONFIG: Record<WorkspaceToolMode, WorkspaceToolMeta> = {
  write_rewrite: {
    label: "Write & rewrite",
    eyebrow: "Drafting engine",
    description:
      "Shape raw notes, rough drafts, product copy, and emails into cleaner final language.",
    inputLabel: "Source text",
    inputPlaceholder:
      "Paste the draft, bullets, product notes, or rough copy you want to improve.",
    instructionsLabel: "Rewrite instructions",
    instructionsPlaceholder:
      "Example: tighten the structure, keep the voice direct, and end with one clear CTA.",
    outputLabel: "Reworked draft",
    cost: 6,
    acceptsFile: false,
  },
  summarize: {
    label: "Summarize documents",
    eyebrow: "Compression engine",
    description:
      "Turn long text into structured takeaways, action items, and decision-ready notes.",
    inputLabel: "Document text",
    inputPlaceholder:
      "Paste meeting notes, a long article, support thread, or internal document here.",
    instructionsLabel: "Summary focus",
    instructionsPlaceholder:
      "Example: surface key decisions, open risks, and next actions for the team.",
    outputLabel: "Structured summary",
    cost: 4,
    acceptsFile: false,
  },
  transcribe: {
    label: "Transcribe audio",
    eyebrow: "Audio to text",
    description:
      "Convert an audio recording into searchable text with a clean, readable transcript.",
    inputLabel: "Context notes",
    inputPlaceholder:
      "Optional: add speaker names, meeting context, or any cleanup instructions for the transcript.",
    instructionsLabel: "Transcript cleanup",
    instructionsPlaceholder:
      "Example: label speakers if obvious, remove filler, and append a short recap.",
    outputLabel: "Transcript",
    cost: 8,
    acceptsFile: true,
  },
  translate: {
    label: "Translate content",
    eyebrow: "Language conversion",
    description:
      "Produce consistent multilingual versions of product copy, docs, and working text.",
    inputLabel: "Source text",
    inputPlaceholder:
      "Paste the content that needs translation, localization, or tone-preserving adaptation.",
    instructionsLabel: "Translation notes",
    instructionsPlaceholder:
      "Example: preserve product names, keep the tone formal, and localize idioms naturally.",
    outputLabel: "Translated version",
    cost: 4,
    acceptsFile: false,
  },
  generate_image: {
    label: "Generate image",
    eyebrow: "Image engine",
    description:
      "Turn a text description into a visual — illustrations, concepts, product mockups, and creative scenes.",
    inputLabel: "Image description",
    inputPlaceholder:
      "Describe what you want to see — subject, setting, mood, and composition.",
    instructionsLabel: "Style guidance",
    instructionsPlaceholder:
      "Example: flat vector illustration, soft pastel palette, minimal detail, no text in image.",
    outputLabel: "Generated image",
    cost: 10,
    acceptsFile: false,
  },
  create_document: {
    label: "Create document",
    eyebrow: "Document engine",
    description:
      "Generate polished Word and PDF documents from briefs, notes, or templates.",
    inputLabel: "Document brief",
    inputPlaceholder:
      "Describe the document you need — topic, purpose, and key sections to include.",
    instructionsLabel: "Format and style",
    instructionsPlaceholder:
      "Example: formal business report, 5 sections with headers, include an executive summary.",
    outputLabel: "Document draft",
    cost: 8,
    acceptsFile: false,
  },
  create_presentation: {
    label: "Create presentation",
    eyebrow: "Slides engine",
    description:
      "Generate a structured, visually designed presentation from any content or brief.",
    inputLabel: "Presentation brief",
    inputPlaceholder:
      "Paste your notes, outline, or topic — we'll turn it into a complete slide deck.",
    instructionsLabel: "Design and structure",
    instructionsPlaceholder:
      "Example: 10 slides, executive audience, dark theme, include a summary slide.",
    outputLabel: "Slide deck",
    cost: 12,
    acceptsFile: false,
  },
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitleSeed(sourceText: string) {
  const firstLine = sourceText
    .split("\n")
    .map((line) => compactWhitespace(line))
    .find(Boolean);

  if (!firstLine) return "";
  return firstLine.slice(0, 48);
}

export function getDefaultWorkspaceRunTitle(
  mode: WorkspaceToolMode,
  sourceText = "",
) {
  const seed = extractTitleSeed(sourceText);
  if (seed) return seed;

  switch (mode) {
    case "write_rewrite":
      return "Untitled Rewrite";
    case "summarize":
      return "Untitled Summary";
    case "transcribe":
      return "Untitled Transcript";
    case "translate":
      return "Untitled Translation";
    case "generate_image":
      return "Untitled Image";
    case "create_document":
      return "Untitled Document";
    case "create_presentation":
      return "Untitled Presentation";
  }
}

export function createWorkspaceRunDraft(
  mode: WorkspaceToolMode,
  overrides: Partial<WorkspaceRunInput> = {},
): WorkspaceRunInput {
  const base = WORKSPACE_TOOL_CONFIG[mode];
  const sourceText = overrides.sourceText ?? "";

  return {
    mode,
    title: overrides.title ?? getDefaultWorkspaceRunTitle(mode, sourceText),
    sourceText,
    instructions: overrides.instructions ?? "",
    outputText: overrides.outputText ?? "",
    targetLanguage: overrides.targetLanguage ?? "",
    status: overrides.status ?? "draft",
    creditCost: overrides.creditCost ?? base.cost,
    tokenCount: overrides.tokenCount ?? 0,
    sourceFileName: overrides.sourceFileName ?? "",
    sourceMimeType: overrides.sourceMimeType ?? "",
    lastError: overrides.lastError ?? "",
    thumbnailBase64: overrides.thumbnailBase64 ?? null,
  };
}

export function buildWorkspacePrompt(input: {
  mode: WorkspaceToolMode;
  sourceText: string;
  instructions: string;
  targetLanguage?: string;
  sourceFileName?: string;
}) {
  const sourceText = input.sourceText.trim();
  const instructions = input.instructions.trim();

  switch (input.mode) {
    case "write_rewrite":
      return [
        "You are an expert writing assistant for practical business work.",
        "Rewrite the source material into a cleaner, stronger version while preserving the core meaning.",
        "Return only the final rewritten output.",
        instructions ? `Extra instructions: ${instructions}` : "",
        `Source material:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

    case "summarize":
      return [
        "You are an expert summarization assistant.",
        "Create a concise but useful summary with clear sections for key points and action items when relevant.",
        "Return only the summary.",
        instructions ? `Extra instructions: ${instructions}` : "",
        `Document:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

    case "transcribe":
      return [
        "You are an expert transcription assistant.",
        "Transcribe the attached audio into readable text.",
        "If multiple speakers are obvious, label them consistently.",
        "If cleanup instructions are provided, apply them after the base transcript is accurate.",
        "Return only the transcript.",
        input.sourceFileName ? `File name: ${input.sourceFileName}` : "",
        instructions ? `Extra instructions: ${instructions}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

    case "translate":
      return [
        `Translate the source material into ${input.targetLanguage?.trim() || "the requested language"}.`,
        "Preserve meaning, keep product names intact, and make the result sound natural.",
        "Return only the translated text.",
        instructions ? `Extra instructions: ${instructions}` : "",
        `Source material:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

    case "generate_image":
      return [
        "Create an optimized prompt for an AI image generator based on the description below.",
        "Make it vivid and specific — describe subject, composition, lighting, style, and color palette.",
        "Return only the refined image prompt, nothing else.",
        instructions ? `Style guidance: ${instructions}` : "",
        `Description: ${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

    case "create_document":
      return [
        "You are an expert business document writer.",
        "Create a complete, professional document in clean markdown format.",
        "Use proper structure: title (# heading), sections (## heading), subsections (### heading).",
        "Include bullet points, numbered lists, and formatted tables where relevant.",
        "The document should be publication-ready and well-organized.",
        "Return only the document content in markdown — no meta-commentary or code fences.",
        instructions ? `Document requirements: ${instructions}` : "",
        `Document brief:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

    case "create_presentation":
      return [
        "You are an expert presentation designer.",
        "Generate a complete slide deck as a valid JSON array.",
        'Each slide object must have exactly these fields: "title" (string), "content" (array of 1-5 strings), "notes" (string with speaker notes), "layout" (one of: "title", "content", "two-column", "quote", "closing").',
        'Layout rules: first slide must use "title" layout, last slide must use "closing" layout, use "quote" for single impactful statements, use "two-column" for comparisons.',
        "Aim for 8–12 slides unless instructed otherwise.",
        'Return ONLY the raw JSON array — no markdown code fences, no explanation, no comments.',
        'Example: [{"title":"Intro","content":["Point one","Point two"],"notes":"Welcome the audience","layout":"title"}]',
        instructions ? `Presentation requirements: ${instructions}` : "",
        `Presentation brief:\n${sourceText}`,
      ]
        .filter(Boolean)
        .join("\n\n");
  }
}

export function createStarterWorkspaceRuns() {
  return [
    createWorkspaceRunDraft("write_rewrite", {
      title: "Homepage Value Prop",
      sourceText:
        "We help small teams use AI for daily content work. The product feels broad right now and the message needs to sound clearer.",
      instructions:
        "Rewrite this into a sharper two-paragraph product positioning draft with confident but grounded language.",
      outputText:
        "AI Content Studio gives small teams a focused set of AI tools for everyday content work.\n\nInstead of stitching together separate apps for rewriting, summaries, transcripts, and translation, you work from one authenticated workspace with predictable credit-based usage.",
      status: "completed",
    }),
    createWorkspaceRunDraft("summarize", {
      title: "Customer Call Summary",
      sourceText:
        "The customer likes the writing quality but says the current dashboard feels scattered. They want one place to rewrite text, summarize docs, transcribe meetings, and translate content without jumping between sections.",
      instructions:
        "Summarize this as product feedback for a founder review.",
      outputText:
        "Key takeaway: the customer values the output quality but finds the product structure too fragmented.\n\nKey points:\n- They want one primary workspace instead of many disconnected sections.\n- The most important jobs are rewrite, summarize, transcribe, and translate.\n- Navigation clarity matters as much as raw AI quality.\n\nAction items:\n- Make the dashboard a shared work canvas.\n- Reduce primary navigation to the essential product surfaces.",
      status: "completed",
    }),
    createWorkspaceRunDraft("transcribe", {
      title: "Kickoff Interview",
      instructions:
        "Label speakers if obvious and end with a short recap paragraph.",
      sourceFileName: "kickoff-interview.m4a",
      sourceMimeType: "audio/mp4",
    }),
    createWorkspaceRunDraft("translate", {
      title: "Pricing FAQ Translation",
      sourceText:
        "Purchased credits never expire and remain available until they are used. If you need more, new credits are added to your existing balance.",
      instructions: "Keep the tone simple and customer-facing.",
      targetLanguage: "Spanish",
      outputText:
        "Los creditos comprados no vencen y siguen disponibles hasta que se usen. Si necesitas mas, los nuevos creditos se agregan a tu saldo actual.",
      status: "completed",
    }),
  ];
}

export function countWorkspaceRunsByMode(
  runs: Array<Pick<WorkspaceRunRecord, "mode">>,
) {
  return WORKSPACE_TOOL_MODES.reduce(
    (acc, mode) => {
      acc[mode] = runs.filter((run) => run.mode === mode).length;
      return acc;
    },
    {
      write_rewrite: 0,
      summarize: 0,
      transcribe: 0,
      translate: 0,
      generate_image: 0,
      create_document: 0,
      create_presentation: 0,
    } as Record<WorkspaceToolMode, number>,
  );
}

export function normalizeWorkspaceToolMode(
  value: string | null | undefined,
): WorkspaceToolMode {
  return WORKSPACE_TOOL_MODES.find((mode) => mode === value) ?? "write_rewrite";
}

export function getWorkspaceToolHref(mode: WorkspaceToolMode) {
  return `/dashboard?tool=${mode}`;
}
