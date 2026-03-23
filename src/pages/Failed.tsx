import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  ensureWorkspaceSeedData,
  subscribeToContentItems,
  updateContentStatus,
  type ContentRecord,
} from "../lib/firestore";

function getWorkflowTone(status?: ContentRecord["workflowStatus"]) {
  switch (status) {
    case "failed":
      return "bg-rose-50 text-rose-700";
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "ready":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Failed() {
  const { user, isAuthReady } = useFirebase();
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setItems([]);
        setIsLoading(false);
      }
      return;
    }

    let active = true;
    let unsubscribe = () => {};

    ensureWorkspaceSeedData(user.uid).then(() => {
      if (!active) return;
      unsubscribe = subscribeToContentItems(user.uid, (records) => {
        if (!active) return;
        setItems(records);
        setIsLoading(false);
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isAuthReady, user]);

  const failedItems = useMemo(
    () => items.filter((item) => item.status === "failed"),
    [items],
  );

  const retryDraft = async (contentId: string) => {
    if (!user) return;
    setRetryingId(contentId);
    try {
      await updateContentStatus(user.uid, contentId, "draft");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-80px)] overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Failed Posts</h1>
        <p className="text-gray-500 mt-2">
          Recover draft ideas that stalled or need another pass before shipping.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
          Loading failed posts...
        </div>
      ) : failedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">No failed posts</p>
          <p className="text-sm text-gray-500 mt-2">
            Mark a draft as failed when it needs a reset, then send it back to draft from here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {failedItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    Failed
                  </div>
                  <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getWorkflowTone(item.workflowStatus)}`}>
                    workflow: {item.workflowStatus || item.status}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h2>
                  <p className="mt-2 text-sm text-gray-500">{item.platforms.join(", ")}</p>
                  {(item.sourceId || item.remixMode) && (
                    <p className="mt-2 text-sm text-gray-500">
                      {item.sourceId ? `Source linked` : "No source"}{" "}
                      {item.remixMode ? `· ${item.remixMode}` : ""}
                    </p>
                  )}
                  {item.validationIssues && item.validationIssues.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-rose-700">
                      {item.validationIssues.map((issue) => (
                        <li key={`${item.id}-${issue}`}>{issue}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap leading-6">
                    {item.body}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => retryDraft(item.id)}
                    disabled={retryingId === item.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-70"
                  >
                    {retryingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Return to draft
                  </button>
                  <Link
                    to={`/dashboard/create${item.sourceId ? `?source=${encodeURIComponent(item.sourceId)}` : ""}`}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Open in Create Post
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
