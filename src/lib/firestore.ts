import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import promptsData from "../prompts_data.json";
import {
  createStarterWorkspaceRuns,
  createWorkspaceRunDraft,
  type WorkspaceRunInput,
  type WorkspaceRunRecord,
} from "./workspace";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export type PromptType = "TEXT" | "IMAGE" | "VIDEO";
export type ContentStatus = "draft" | "published" | "failed";
export type ContentKind = "post_draft" | "video_generation" | "coach_analysis";
export type WorkflowStatus =
  | "draft"
  | "ready"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";
export type SourceType =
  | "website"
  | "brief"
  | "transcript"
  | "notion"
  | "drive"
  | "other";
export type SourceTypeDetail =
  | "url"
  | "pasted_text"
  | "youtube"
  | "pdf"
  | "transcript"
  | "manual";
export type SourceStatus = "raw" | "processing" | "ready" | "failed";

export interface PromptRecord {
  id: string;
  title: string;
  description: string;
  content: string;
  type: PromptType;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface InspirationRecord {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  platform: string;
  mediaType: "image" | "video" | "none";
  mediaUrl: string;
  note: string;
  tags: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ContentRecord {
  id: string;
  title: string;
  body: string;
  platforms: string[];
  status: ContentStatus;
  workflowStatus?: WorkflowStatus;
  kind: ContentKind;
  sourcePromptId: string;
  inspirationId: string;
  sourceId?: string;
  remixMode?: string;
  validationIssues?: string[];
  publishFailureReason?: string;
  scheduledFor?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SourceRecord {
  id: string;
  title: string;
  type: SourceType;
  url: string;
  description: string;
  status?: SourceStatus;
  sourceTypeDetail?: SourceTypeDetail;
  contentText?: string;
  analysisSummary?: string;
  analysisKeyPoints?: string[];
  analysisHooks?: string[];
  analysisQuotes?: string[];
  analysisCtaIdeas?: string[];
  analysisAudience?: string;
  analysisRisks?: string[];
  lastProcessedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WorkspaceSettings {
  brandName: string;
  brandVoice: string;
  brandColors: string;
  brandKeywords: string;
  brandAudience: string;
  ctaStyle: string;
  bannedPhrases: string;
  preferredTextModel: string;
  preferredVideoModel: string;
  apiBaseUrl: string;
  webhookUrl: string;
  supportEmail: string;
  updatedAt?: Timestamp | null;
}

export interface WorkspaceStats {
  promptCount: number;
  inspirationCount: number;
  draftCount: number;
  readyCount: number;
  approvedCount: number;
  scheduledCount: number;
  publishedCount: number;
  failedCount: number;
}

export type CreditTransactionKind = "usage" | "top_up" | "grant" | "adjustment";

export type CreditTransactionStatus = "completed" | "pending";

export interface CreditTransactionRecord {
  id: string;
  amount: number;
  balanceAfter: number;
  kind: CreditTransactionKind;
  status: CreditTransactionStatus;
  description: string;
  source: string;
  createdAt?: Timestamp | null;
}

type PromptInput = Omit<PromptRecord, "id" | "createdAt" | "updatedAt">;
type InspirationInput = Omit<
  InspirationRecord,
  "id" | "createdAt" | "updatedAt"
>;
type ContentInput = Omit<ContentRecord, "id" | "createdAt" | "updatedAt">;
type SourceInput = Omit<SourceRecord, "id" | "createdAt" | "updatedAt">;

type PromptSeed = {
  title: string;
  description: string;
  content: string;
  type: PromptType;
};

const MAX_PROMPT_CONTENT_LENGTH = 50000;

const starterPrompts: PromptInput[] = (promptsData as PromptSeed[]).map(
  (prompt) => ({
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    type: prompt.type,
  }),
);

const starterInspiration: InspirationInput[] = [
  {
    authorName: "AiContentStudio",
    authorAvatar: "https://i.pravatar.cc/80?u=aicontentstudio-starter-1",
    content:
      "Strong creator posts often start with a specific moment, then widen into one practical lesson.",
    platform: "LinkedIn",
    mediaType: "none",
    mediaUrl: "",
    note: "Good example of a story-first hook with a clear lesson.",
    tags: ["story", "hook", "linkedin"],
  },
  {
    authorName: "AiContentStudio",
    authorAvatar: "https://i.pravatar.cc/80?u=aicontentstudio-starter-2",
    content:
      "Before-and-after transformations work when the before state is concrete and the after state is measurable.",
    platform: "X",
    mediaType: "none",
    mediaUrl: "",
    note: "Useful template for proof-driven product marketing.",
    tags: ["proof", "transformation", "x"],
  },
  {
    authorName: "AiContentStudio",
    authorAvatar: "https://i.pravatar.cc/80?u=aicontentstudio-starter-3",
    content:
      "Posts with one sharp opinion and one supporting example are easier to reuse across channels than broad listicles.",
    platform: "LinkedIn",
    mediaType: "none",
    mediaUrl: "",
    note: "Reusable pattern for audience-building posts.",
    tags: ["opinion", "example", "repurposing"],
  },
];

const starterSources: SourceInput[] = [
  {
    title: "Launch Notes",
    type: "brief",
    url: "",
    description:
      "Core talking points, outcomes, and objections for the next product launch.",
    status: "ready",
    sourceTypeDetail: "manual",
    contentText: "",
    analysisSummary: "",
    analysisKeyPoints: [],
    analysisHooks: [],
    analysisQuotes: [],
    analysisCtaIdeas: [],
    analysisAudience: "",
    analysisRisks: [],
    lastProcessedAt: null,
  },
  {
    title: "Customer Interview Transcript",
    type: "transcript",
    url: "",
    description:
      "Transcript snippets you can turn into proof-led posts, clips, and hooks.",
    status: "ready",
    sourceTypeDetail: "manual",
    contentText: "",
    analysisSummary: "",
    analysisKeyPoints: [],
    analysisHooks: [],
    analysisQuotes: [],
    analysisCtaIdeas: [],
    analysisAudience: "",
    analysisRisks: [],
    lastProcessedAt: null,
  },
];

const defaultWorkspaceSettings: WorkspaceSettings = {
  brandName: "AI Content Studio",
  brandVoice: "Clear, practical, trustworthy, and slightly bold.",
  brandColors: "#D81B60, #7C3AED, #111827",
  brandKeywords: "AI video, workflow, automation, creator growth",
  brandAudience:
    "Founders, operators, and content teams building repeatable growth systems.",
  ctaStyle: "Direct, practical, and low-hype.",
  bannedPhrases: "game-changer, revolutionary, disrupt",
  preferredTextModel: "gemini-2.5-flash",
  preferredVideoModel: "veo-3.1-fast-generate-preview",
  apiBaseUrl: "",
  webhookUrl: "",
  supportEmail: "support@aicontentstudio.net",
  updatedAt: null,
};

type UserProfileSnapshotLike = Partial<{
  uid: unknown;
  email: unknown;
  displayName: unknown;
  photoURL: unknown;
  role: unknown;
  credits: unknown;
  createdAt: unknown;
}>;

function normalizeOptionalString(value: string | null) {
  return value || "";
}

export function buildUserProfilePayload(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  existingData?: UserProfileSnapshotLike,
) {
  const normalizedEmail = normalizeOptionalString(email);
  const normalizedDisplayName = normalizeOptionalString(displayName);
  const normalizedPhotoURL = normalizeOptionalString(photoURL);
  const existingCredits =
    typeof existingData?.credits === "number"
      ? existingData.credits
      : existingData
        ? 0
        : 1000;

  const data = {
    uid,
    email: normalizedEmail,
    displayName: normalizedDisplayName,
    photoURL: normalizedPhotoURL,
    role:
      existingData?.role === "admin" || existingData?.role === "user"
        ? existingData.role
        : "user",
    credits: existingCredits,
    createdAt: existingData?.createdAt,
  };

  const shouldWrite =
    !existingData ||
    existingData.uid !== data.uid ||
    existingData.email !== data.email ||
    existingData.displayName !== data.displayName ||
    existingData.photoURL !== data.photoURL ||
    existingData.role !== data.role ||
    typeof existingData.credits !== "number" ||
    !existingData.createdAt;

  return { data, shouldWrite };
}

function userDoc(uid: string) {
  return doc(db, "users", uid);
}

function promptsCollection(uid: string) {
  return collection(db, "users", uid, "prompts");
}

function inspirationCollection(uid: string) {
  return collection(db, "users", uid, "inspiration");
}

function contentCollection(uid: string) {
  return collection(db, "users", uid, "contentItems");
}

function sourcesCollection(uid: string) {
  return collection(db, "users", uid, "sources");
}

function creditTransactionsCollection(uid: string) {
  return collection(db, "users", uid, "creditTransactions");
}

function workspaceSettingsDoc(uid: string) {
  return doc(db, "users", uid, "settings", "workspace");
}

function workspaceRunsCollection(uid: string) {
  return collection(db, "users", uid, "workspaceRuns");
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function mapPrompt(snapshot: QueryDocumentSnapshot): PromptRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? "",
    description: data.description ?? "",
    content: data.content ?? "",
    type: (data.type ?? "TEXT") as PromptType,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapInspiration(snapshot: QueryDocumentSnapshot): InspirationRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    authorName: data.authorName ?? "",
    authorAvatar: data.authorAvatar ?? "",
    content: data.content ?? "",
    platform: data.platform ?? "X",
    mediaType: (data.mediaType ?? "none") as InspirationRecord["mediaType"],
    mediaUrl: data.mediaUrl ?? "",
    note: data.note ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapContent(snapshot: QueryDocumentSnapshot): ContentRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? "",
    body: data.body ?? "",
    platforms: Array.isArray(data.platforms) ? data.platforms : [],
    status: (data.status ?? "draft") as ContentStatus,
    workflowStatus: (data.workflowStatus ??
      data.status ??
      "draft") as WorkflowStatus,
    kind: (data.kind ?? "post_draft") as ContentKind,
    sourcePromptId: data.sourcePromptId ?? "",
    inspirationId: data.inspirationId ?? "",
    sourceId: data.sourceId ?? "",
    remixMode: data.remixMode ?? "",
    validationIssues: Array.isArray(data.validationIssues)
      ? data.validationIssues
      : [],
    publishFailureReason: data.publishFailureReason ?? "",
    scheduledFor: data.scheduledFor ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapSource(snapshot: QueryDocumentSnapshot): SourceRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? "",
    type: (data.type ?? "other") as SourceType,
    url: data.url ?? "",
    description: data.description ?? "",
    status: (data.status ?? "raw") as SourceStatus,
    sourceTypeDetail: (data.sourceTypeDetail ?? "manual") as SourceTypeDetail,
    contentText: data.contentText ?? "",
    analysisSummary: data.analysisSummary ?? "",
    analysisKeyPoints: Array.isArray(data.analysisKeyPoints)
      ? data.analysisKeyPoints
      : [],
    analysisHooks: Array.isArray(data.analysisHooks) ? data.analysisHooks : [],
    analysisQuotes: Array.isArray(data.analysisQuotes)
      ? data.analysisQuotes
      : [],
    analysisCtaIdeas: Array.isArray(data.analysisCtaIdeas)
      ? data.analysisCtaIdeas
      : [],
    analysisAudience: data.analysisAudience ?? "",
    analysisRisks: Array.isArray(data.analysisRisks) ? data.analysisRisks : [],
    lastProcessedAt: data.lastProcessedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapCreditTransaction(
  snapshot: QueryDocumentSnapshot,
): CreditTransactionRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    amount: typeof data.amount === "number" ? data.amount : 0,
    balanceAfter: typeof data.balanceAfter === "number" ? data.balanceAfter : 0,
    kind: (data.kind ?? "adjustment") as CreditTransactionKind,
    status: (data.status ?? "completed") as CreditTransactionStatus,
    description: data.description ?? "",
    source: data.source ?? "system",
    createdAt: data.createdAt ?? null,
  };
}

function mapWorkspaceRun(snapshot: QueryDocumentSnapshot): WorkspaceRunRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...createWorkspaceRunDraft(
      (data.mode ?? "write_rewrite") as WorkspaceRunRecord["mode"],
      {
        title: data.title ?? "",
        sourceText: data.sourceText ?? "",
        instructions: data.instructions ?? "",
        outputText: data.outputText ?? "",
        targetLanguage: data.targetLanguage ?? "",
        status: data.status ?? "draft",
        creditCost:
          typeof data.creditCost === "number" ? data.creditCost : undefined,
        tokenCount:
          typeof data.tokenCount === "number" ? data.tokenCount : 0,
        sourceFileName: data.sourceFileName ?? "",
        sourceMimeType: data.sourceMimeType ?? "",
        lastError: data.lastError ?? "",
      },
    ),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function validateContentDraft(
  content: Pick<ContentRecord, "title" | "body" | "platforms">,
): string[] {
  const issues: string[] = [];

  if (!content.title.trim()) {
    issues.push("Add a title before scheduling.");
  }
  if (!content.body.trim()) {
    issues.push("Add post copy before scheduling.");
  }
  if (!content.platforms.length) {
    issues.push("Choose at least one platform before scheduling.");
  }

  return issues;
}

export async function createUserProfileIfNotExists(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
) {
  const userRef = userDoc(uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const payload = buildUserProfilePayload(uid, email, displayName, photoURL);
      await setDoc(userRef, {
        ...payload.data,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(creditTransactionsCollection(uid)), {
        amount: payload.data.credits,
        balanceAfter: payload.data.credits,
        kind: "grant",
        status: "completed",
        description: "Starter credits for your new workspace",
        source: "account_setup",
        createdAt: serverTimestamp(),
      });
      return;
    }

    const existingData = userSnap.data();
    const payload = buildUserProfilePayload(
      uid,
      email,
      displayName,
      photoURL,
      existingData,
    );

    if (payload.shouldWrite) {
      await setDoc(
        userRef,
        {
          ...payload.data,
          createdAt: existingData.createdAt ?? serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function getUserCredits(uid: string): Promise<number> {
  const userRef = userDoc(uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return 0;
    const credits = snap.data().credits;
    return typeof credits === "number" ? credits : 0;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export function subscribeToUserCredits(
  uid: string,
  onChange: (credits: number) => void,
): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    (snapshot) => {
      const data = snapshot.data();
      onChange(typeof data?.credits === "number" ? data.credits : 0);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}`),
  );
}

export async function getRecentCreditTransactions(
  uid: string,
  maxRecords = 20,
): Promise<CreditTransactionRecord[]> {
  try {
    const transactionsQuery = query(
      creditTransactionsCollection(uid),
      orderBy("createdAt", "desc"),
      limit(maxRecords),
    );
    const snapshot = await getDocs(transactionsQuery);
    return snapshot.docs.map(mapCreditTransaction);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.LIST,
      `users/${uid}/creditTransactions`,
    );
  }
}

export async function deductCredits(
  uid: string,
  amount: number,
  metadata?: {
    description?: string;
    source?: string;
  },
): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }
  const userRef = userDoc(uid);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("User document not found");
      const current =
        typeof snap.data().credits === "number" ? snap.data().credits : 0;
      if (current < amount) throw new Error("insufficient_credits");
      const nextBalance = current - amount;
      const transactionRef = doc(creditTransactionsCollection(uid));

      transaction.update(userRef, { credits: nextBalance });
      transaction.set(transactionRef, {
        amount: -amount,
        balanceAfter: nextBalance,
        kind: "usage",
        status: "completed",
        description: metadata?.description || "Workflow usage",
        source: metadata?.source || "app",
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "insufficient_credits") {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function getUserByEmail(
  email: string,
): Promise<{ uid: string; email: string; credits: number; displayName: string | null } | null> {
  const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    email: typeof data.email === "string" ? data.email : email,
    credits: typeof data.credits === "number" ? data.credits : 0,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
  };
}

export async function addCredits(uid: string, amount: number, description?: string): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }
  const userRef = userDoc(uid);
  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await createUserProfileIfNotExists(
        uid,
        currentUser.email,
        currentUser.displayName,
        currentUser.photoURL,
      );
    }

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("user_not_found");
      const data = snap.data();
      const currentCredits =
        data && typeof data.credits === "number" ? data.credits : 0;
      const nextBalance = currentCredits + amount;
      const transactionRef = doc(creditTransactionsCollection(uid));

      transaction.update(userRef, { credits: nextBalance });
      transaction.set(transactionRef, {
        amount,
        balanceAfter: nextBalance,
        kind: "top_up",
        status: "completed",
        description: description || "Manual credit top-up",
        source: "admin",
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "user_not_found") {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function purchaseCreditsMock(
  uid: string,
  amount: number,
): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }
  if (amount > 10000) {
    throw new Error("mock_top_up_limit_exceeded");
  }

  const userRef = userDoc(uid);
  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await createUserProfileIfNotExists(
        uid,
        currentUser.email,
        currentUser.displayName,
        currentUser.photoURL,
      );
    }

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("user_not_found");

      const data = snap.data();
      const currentCredits =
        data && typeof data.credits === "number" ? data.credits : 0;
      const nextBalance = currentCredits + amount;
      const transactionRef = doc(creditTransactionsCollection(uid));

      transaction.update(userRef, { credits: nextBalance });
      transaction.set(transactionRef, {
        amount,
        balanceAfter: nextBalance,
        kind: "top_up",
        status: "completed",
        description: `Mock checkout top-up (${amount} credits)`,
        source: "mock_checkout",
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "user_not_found") {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function ensureWorkspaceSeedData(uid: string) {
  try {
    const [
      promptsSnapshot,
      inspirationSnapshot,
      sourcesSnapshot,
      settingsSnapshot,
      workspaceRunsSnapshot,
    ] = await Promise.all([
      getDocs(query(promptsCollection(uid), limit(1))),
      getDocs(query(inspirationCollection(uid), limit(1))),
      getDocs(query(sourcesCollection(uid), limit(1))),
      getDoc(workspaceSettingsDoc(uid)),
      getDocs(query(workspaceRunsCollection(uid), limit(1))),
    ]);

    if (promptsSnapshot.empty) {
      await restoreDefaultPromptLibrary(uid);
    }

    if (inspirationSnapshot.empty) {
      await Promise.all(
        starterInspiration.map(async (item) => {
          const inspirationRef = doc(inspirationCollection(uid));
          await setDoc(inspirationRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }),
      );
    }

    if (sourcesSnapshot.empty) {
      await Promise.all(
        starterSources.map(async (item) => {
          const sourceRef = doc(sourcesCollection(uid));
          await setDoc(sourceRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }),
      );
    }

    if (!settingsSnapshot.exists()) {
      await setDoc(workspaceSettingsDoc(uid), {
        ...defaultWorkspaceSettings,
        updatedAt: serverTimestamp(),
      });
    }

    if (workspaceRunsSnapshot.empty) {
      await Promise.all(
        createStarterWorkspaceRuns().map(async (item) => {
          const runRef = doc(workspaceRunsCollection(uid));
          await setDoc(runRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }),
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export function subscribeToWorkspaceRuns(
  uid: string,
  onChange: (records: WorkspaceRunRecord[]) => void,
): Unsubscribe {
  const workspaceRunsQuery = query(
    workspaceRunsCollection(uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(
    workspaceRunsQuery,
    (snapshot) => onChange(snapshot.docs.map(mapWorkspaceRun)),
    (error) =>
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${uid}/workspaceRuns`,
      ),
  );
}

export async function saveWorkspaceRun(
  uid: string,
  run: Partial<WorkspaceRunRecord> & WorkspaceRunInput,
): Promise<string> {
  const runRef = run.id
    ? doc(workspaceRunsCollection(uid), run.id)
    : doc(workspaceRunsCollection(uid));

  try {
    const existing = run.id ? await getDoc(runRef) : null;
    const normalized = createWorkspaceRunDraft(run.mode, {
      title: run.title,
      sourceText: run.sourceText,
      instructions: run.instructions,
      outputText: run.outputText,
      targetLanguage: run.targetLanguage,
      status: run.status,
      creditCost: run.creditCost,
      sourceFileName: run.sourceFileName,
      sourceMimeType: run.sourceMimeType,
      lastError: run.lastError,
    });

    await setDoc(
      runRef,
      {
        ...normalized,
        createdAt: existing?.exists()
          ? existing.data().createdAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return runRef.id;
  } catch (error) {
    handleFirestoreError(
      error,
      run.id ? OperationType.UPDATE : OperationType.CREATE,
      `users/${uid}/workspaceRuns/${runRef.id}`,
    );
  }
}

export async function deleteWorkspaceRun(uid: string, runId: string) {
  try {
    await deleteDoc(doc(workspaceRunsCollection(uid), runId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${uid}/workspaceRuns/${runId}`,
    );
  }
}

export function subscribeToPrompts(
  uid: string,
  onChange: (records: PromptRecord[]) => void,
): Unsubscribe {
  const promptsQuery = query(
    promptsCollection(uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(
    promptsQuery,
    (snapshot) => onChange(snapshot.docs.map(mapPrompt)),
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/prompts`),
  );
}

export async function savePrompt(
  uid: string,
  prompt: Partial<PromptRecord> & PromptInput,
): Promise<string> {
  if (prompt.content.length > MAX_PROMPT_CONTENT_LENGTH) {
    throw new Error(
      `Prompt content is too large. Keep it under ${MAX_PROMPT_CONTENT_LENGTH.toLocaleString()} characters.`,
    );
  }
  const promptRef = prompt.id
    ? doc(promptsCollection(uid), prompt.id)
    : doc(promptsCollection(uid));
  try {
    const existing = prompt.id ? await getDoc(promptRef) : null;
    await setDoc(
      promptRef,
      {
        title: prompt.title.trim(),
        description: prompt.description.trim(),
        content: prompt.content,
        type: prompt.type,
        createdAt: existing?.exists()
          ? existing.data().createdAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return promptRef.id;
  } catch (error) {
    handleFirestoreError(
      error,
      prompt.id ? OperationType.UPDATE : OperationType.CREATE,
      `users/${uid}/prompts/${promptRef.id}`,
    );
  }
}

export async function restoreDefaultPromptLibrary(
  uid: string,
): Promise<number> {
  try {
    const existingSnapshot = await getDocs(promptsCollection(uid));
    const existingKeys = new Set(
      existingSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return `${data.title ?? ""}::${data.content ?? ""}`;
      }),
    );

    const missingPrompts = starterPrompts.filter(
      (prompt) => !existingKeys.has(`${prompt.title}::${prompt.content}`),
    );

    let restoredCount = 0;
    const failedPrompts: string[] = [];

    for (const prompt of missingPrompts) {
      try {
        if (prompt.content.length > MAX_PROMPT_CONTENT_LENGTH) {
          failedPrompts.push(prompt.title);
          continue;
        }

        const promptRef = doc(promptsCollection(uid));
        await setDoc(promptRef, {
          ...prompt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        restoredCount += 1;
      } catch (error) {
        console.error("Failed to restore starter prompt", prompt.title, error);
        failedPrompts.push(prompt.title);
      }
    }

    if (failedPrompts.length > 0) {
      console.warn(
        `Skipped ${failedPrompts.length} prompt(s) during restore: ${failedPrompts.join(", ")}`,
      );
    }

    return restoredCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/prompts`);
  }
}

export async function deletePrompt(uid: string, promptId: string) {
  try {
    await deleteDoc(doc(promptsCollection(uid), promptId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${uid}/prompts/${promptId}`,
    );
  }
}

export function subscribeToInspiration(
  uid: string,
  onChange: (records: InspirationRecord[]) => void,
): Unsubscribe {
  const inspirationQuery = query(
    inspirationCollection(uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(
    inspirationQuery,
    (snapshot) => onChange(snapshot.docs.map(mapInspiration)),
    (error) =>
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${uid}/inspiration`,
      ),
  );
}

export async function saveInspiration(
  uid: string,
  inspiration: Partial<InspirationRecord> & InspirationInput,
): Promise<string> {
  const inspirationRef = inspiration.id
    ? doc(inspirationCollection(uid), inspiration.id)
    : doc(inspirationCollection(uid));
  try {
    const existing = inspiration.id ? await getDoc(inspirationRef) : null;
    await setDoc(
      inspirationRef,
      {
        authorName: inspiration.authorName.trim(),
        authorAvatar: inspiration.authorAvatar.trim(),
        content: inspiration.content.trim(),
        platform: inspiration.platform.trim() || "X",
        mediaType: inspiration.mediaType,
        mediaUrl: inspiration.mediaUrl.trim(),
        note: inspiration.note.trim(),
        tags: inspiration.tags,
        createdAt: existing?.exists()
          ? existing.data().createdAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return inspirationRef.id;
  } catch (error) {
    handleFirestoreError(
      error,
      inspiration.id ? OperationType.UPDATE : OperationType.CREATE,
      `users/${uid}/inspiration/${inspirationRef.id}`,
    );
  }
}

export async function deleteInspiration(uid: string, inspirationId: string) {
  try {
    await deleteDoc(doc(inspirationCollection(uid), inspirationId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${uid}/inspiration/${inspirationId}`,
    );
  }
}

export async function getInspiration(uid: string, inspirationId: string) {
  try {
    const snapshot = await getDoc(
      doc(inspirationCollection(uid), inspirationId),
    );
    if (!snapshot.exists()) return null;
    return mapInspiration(snapshot as QueryDocumentSnapshot);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `users/${uid}/inspiration/${inspirationId}`,
    );
  }
}

export function subscribeToContentItems(
  uid: string,
  onChange: (records: ContentRecord[]) => void,
): Unsubscribe {
  const contentQuery = query(
    contentCollection(uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(
    contentQuery,
    (snapshot) => onChange(snapshot.docs.map(mapContent)),
    (error) =>
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${uid}/contentItems`,
      ),
  );
}

export async function saveContentItem(
  uid: string,
  content: Partial<ContentRecord> & ContentInput,
): Promise<string> {
  const contentRef = content.id
    ? doc(contentCollection(uid), content.id)
    : doc(contentCollection(uid));
  try {
    const existing = content.id ? await getDoc(contentRef) : null;
    await setDoc(
      contentRef,
      {
        title: content.title.trim(),
        body: content.body,
        platforms: content.platforms,
        status: content.status,
        workflowStatus:
          content.workflowStatus ??
          (existing?.exists() ? existing.data().workflowStatus : undefined) ??
          (content.status === "published"
            ? "published"
            : content.status === "failed"
              ? "failed"
              : content.scheduledFor
                ? "scheduled"
                : validateContentDraft(content).length === 0
                  ? "ready"
                  : "draft"),
        kind: content.kind,
        sourcePromptId: content.sourcePromptId || "",
        inspirationId: content.inspirationId || "",
        sourceId:
          content.sourceId ??
          (existing?.exists() ? existing.data().sourceId : "") ??
          "",
        remixMode:
          content.remixMode ??
          (existing?.exists() ? existing.data().remixMode : "") ??
          "",
        validationIssues:
          content.validationIssues ??
          (existing?.exists() ? existing.data().validationIssues : undefined) ??
          validateContentDraft(content),
        publishFailureReason:
          content.publishFailureReason ??
          (existing?.exists() ? existing.data().publishFailureReason : "") ??
          "",
        scheduledFor: content.scheduledFor ?? null,
        createdAt: existing?.exists()
          ? existing.data().createdAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return contentRef.id;
  } catch (error) {
    handleFirestoreError(
      error,
      content.id ? OperationType.UPDATE : OperationType.CREATE,
      `users/${uid}/contentItems/${contentRef.id}`,
    );
  }
}

export async function updateContentStatus(
  uid: string,
  contentId: string,
  status: ContentStatus,
) {
  try {
    const contentRef = doc(contentCollection(uid), contentId);
    const snapshot = await getDoc(contentRef);
    const existing = snapshot.exists()
      ? mapContent(snapshot as QueryDocumentSnapshot)
      : null;
    const validationIssues = existing ? validateContentDraft(existing) : [];

    await updateDoc(contentRef, {
      status,
      workflowStatus:
        status === "draft"
          ? validationIssues.length === 0
            ? "ready"
            : "draft"
          : status,
      validationIssues,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${uid}/contentItems/${contentId}`,
    );
  }
}

export async function setContentWorkflowStatus(
  uid: string,
  contentId: string,
  workflowStatus: WorkflowStatus,
) {
  const contentRef = doc(contentCollection(uid), contentId);
  try {
    const snapshot = await getDoc(contentRef);
    if (!snapshot.exists()) {
      throw new Error("content_not_found");
    }

    const existing = mapContent(snapshot as QueryDocumentSnapshot);
    const validationIssues = validateContentDraft(existing);

    if (workflowStatus === "approved" && validationIssues.length > 0) {
      throw new Error("content_not_ready_for_approval");
    }

    await updateDoc(contentRef, {
      workflowStatus:
        workflowStatus === "ready" && validationIssues.length > 0
          ? "draft"
          : workflowStatus,
      status:
        workflowStatus === "published"
          ? "published"
          : workflowStatus === "failed"
            ? "failed"
            : "draft",
      validationIssues,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${uid}/contentItems/${contentId}`,
    );
  }
}

export async function scheduleContentItem(
  uid: string,
  contentId: string,
  scheduledFor: Date | null,
) {
  const contentRef = doc(contentCollection(uid), contentId);
  try {
    const snapshot = await getDoc(contentRef);
    if (!snapshot.exists()) {
      throw new Error("content_not_found");
    }

    const existing = mapContent(snapshot as QueryDocumentSnapshot);
    const validationIssues = validateContentDraft(existing);

    if (
      scheduledFor &&
      existing.workflowStatus !== "approved" &&
      validationIssues.length === 0
    ) {
      throw new Error("content_not_approved");
    }

    await updateDoc(contentRef, {
      scheduledFor: scheduledFor ? Timestamp.fromDate(scheduledFor) : null,
      validationIssues,
      workflowStatus: scheduledFor
        ? validationIssues.length === 0
          ? "scheduled"
          : "draft"
        : validationIssues.length === 0
          ? "ready"
          : "draft",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${uid}/contentItems/${contentId}`,
    );
  }
}

export function subscribeToSources(
  uid: string,
  onChange: (records: SourceRecord[]) => void,
): Unsubscribe {
  const sourcesQuery = query(
    sourcesCollection(uid),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(
    sourcesQuery,
    (snapshot) => onChange(snapshot.docs.map(mapSource)),
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/sources`),
  );
}

export async function saveSource(
  uid: string,
  source: Partial<SourceRecord> & SourceInput,
): Promise<string> {
  const sourceRef = source.id
    ? doc(sourcesCollection(uid), source.id)
    : doc(sourcesCollection(uid));
  try {
    const existing = source.id ? await getDoc(sourceRef) : null;
    await setDoc(
      sourceRef,
      {
        title: source.title.trim(),
        type: source.type,
        url: source.url.trim(),
        description: source.description.trim(),
        status:
          source.status ??
          (existing?.exists() ? existing.data().status : undefined) ??
          "raw",
        sourceTypeDetail:
          source.sourceTypeDetail ??
          (existing?.exists() ? existing.data().sourceTypeDetail : undefined) ??
          "manual",
        contentText:
          source.contentText ??
          (existing?.exists() ? existing.data().contentText : undefined) ??
          "",
        analysisSummary:
          source.analysisSummary ??
          (existing?.exists() ? existing.data().analysisSummary : undefined) ??
          "",
        analysisKeyPoints:
          source.analysisKeyPoints ??
          (existing?.exists()
            ? existing.data().analysisKeyPoints
            : undefined) ??
          [],
        analysisHooks:
          source.analysisHooks ??
          (existing?.exists() ? existing.data().analysisHooks : undefined) ??
          [],
        analysisQuotes:
          source.analysisQuotes ??
          (existing?.exists() ? existing.data().analysisQuotes : undefined) ??
          [],
        analysisCtaIdeas:
          source.analysisCtaIdeas ??
          (existing?.exists() ? existing.data().analysisCtaIdeas : undefined) ??
          [],
        analysisAudience:
          source.analysisAudience ??
          (existing?.exists() ? existing.data().analysisAudience : undefined) ??
          "",
        analysisRisks:
          source.analysisRisks ??
          (existing?.exists() ? existing.data().analysisRisks : undefined) ??
          [],
        lastProcessedAt:
          source.lastProcessedAt ??
          (existing?.exists() ? existing.data().lastProcessedAt : undefined) ??
          null,
        createdAt: existing?.exists()
          ? existing.data().createdAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return sourceRef.id;
  } catch (error) {
    handleFirestoreError(
      error,
      source.id ? OperationType.UPDATE : OperationType.CREATE,
      `users/${uid}/sources/${sourceRef.id}`,
    );
  }
}

export async function deleteSource(uid: string, sourceId: string) {
  try {
    await deleteDoc(doc(sourcesCollection(uid), sourceId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${uid}/sources/${sourceId}`,
    );
  }
}

export async function getSource(uid: string, sourceId: string) {
  try {
    const snapshot = await getDoc(doc(sourcesCollection(uid), sourceId));
    if (!snapshot.exists()) return null;
    return mapSource(snapshot as QueryDocumentSnapshot);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `users/${uid}/sources/${sourceId}`,
    );
  }
}

export async function updateSourceAnalysis(
  uid: string,
  sourceId: string,
  analysis: Pick<
    SourceRecord,
    | "title"
    | "description"
    | "status"
    | "contentText"
    | "analysisSummary"
    | "analysisKeyPoints"
    | "analysisHooks"
    | "analysisQuotes"
    | "analysisCtaIdeas"
    | "analysisAudience"
    | "analysisRisks"
    | "lastProcessedAt"
  >,
) {
  try {
    await updateDoc(doc(sourcesCollection(uid), sourceId), {
      ...analysis,
      updatedAt: serverTimestamp(),
      lastProcessedAt: analysis.lastProcessedAt ?? serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${uid}/sources/${sourceId}`,
    );
  }
}

export async function getWorkspaceSettings(
  uid: string,
): Promise<WorkspaceSettings> {
  try {
    const snapshot = await getDoc(workspaceSettingsDoc(uid));
    if (!snapshot.exists()) {
      return defaultWorkspaceSettings;
    }
    const data = snapshot.data();
    return {
      brandName: data.brandName ?? defaultWorkspaceSettings.brandName,
      brandVoice: data.brandVoice ?? defaultWorkspaceSettings.brandVoice,
      brandColors: data.brandColors ?? defaultWorkspaceSettings.brandColors,
      brandKeywords:
        data.brandKeywords ?? defaultWorkspaceSettings.brandKeywords,
      brandAudience:
        data.brandAudience ?? defaultWorkspaceSettings.brandAudience,
      ctaStyle: data.ctaStyle ?? defaultWorkspaceSettings.ctaStyle,
      bannedPhrases:
        data.bannedPhrases ?? defaultWorkspaceSettings.bannedPhrases,
      preferredTextModel:
        data.preferredTextModel ?? defaultWorkspaceSettings.preferredTextModel,
      preferredVideoModel:
        data.preferredVideoModel ??
        defaultWorkspaceSettings.preferredVideoModel,
      apiBaseUrl: data.apiBaseUrl ?? defaultWorkspaceSettings.apiBaseUrl,
      webhookUrl: data.webhookUrl ?? defaultWorkspaceSettings.webhookUrl,
      supportEmail: data.supportEmail ?? defaultWorkspaceSettings.supportEmail,
      updatedAt: data.updatedAt ?? null,
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `users/${uid}/settings/workspace`,
    );
  }
}

export async function saveWorkspaceSettings(
  uid: string,
  settings: Omit<WorkspaceSettings, "updatedAt">,
) {
  try {
    await setDoc(
      workspaceSettingsDoc(uid),
      {
        ...settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${uid}/settings/workspace`,
    );
  }
}

export async function getWorkspaceStats(uid: string): Promise<WorkspaceStats> {
  try {
    const [
      promptSnapshot,
      inspirationSnapshot,
      draftSnapshot,
      readySnapshot,
      approvedSnapshot,
      scheduledSnapshot,
      publishedSnapshot,
      failedSnapshot,
    ] = await Promise.all([
      getCountFromServer(promptsCollection(uid)),
      getCountFromServer(inspirationCollection(uid)),
      getCountFromServer(
        query(contentCollection(uid), where("workflowStatus", "==", "draft")),
      ),
      getCountFromServer(
        query(contentCollection(uid), where("workflowStatus", "==", "ready")),
      ),
      getCountFromServer(
        query(
          contentCollection(uid),
          where("workflowStatus", "==", "approved"),
        ),
      ),
      getCountFromServer(
        query(
          contentCollection(uid),
          where("workflowStatus", "==", "scheduled"),
        ),
      ),
      getCountFromServer(
        query(contentCollection(uid), where("status", "==", "published")),
      ),
      getCountFromServer(
        query(contentCollection(uid), where("status", "==", "failed")),
      ),
    ]);

    return {
      promptCount: promptSnapshot.data().count,
      inspirationCount: inspirationSnapshot.data().count,
      draftCount: draftSnapshot.data().count,
      readyCount: readySnapshot.data().count,
      approvedCount: approvedSnapshot.data().count,
      scheduledCount: scheduledSnapshot.data().count,
      publishedCount: publishedSnapshot.data().count,
      failedCount: failedSnapshot.data().count,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}`);
  }
}
