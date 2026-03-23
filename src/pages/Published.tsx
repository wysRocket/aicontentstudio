import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { useFirebase } from "../contexts/FirebaseContext";
import { ensureWorkspaceSeedData, subscribeToContentItems, type ContentRecord } from "../lib/firestore";

function getWorkflowTone(status?: ContentRecord["workflowStatus"]) {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-700";
    case "scheduled":
      return "bg-blue-50 text-blue-700";
    case "ready":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Published() {
  const { user, isAuthReady } = useFirebase();
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const publishedItems = useMemo(
    () => items.filter((item) => item.status === "published"),
    [items],
  );

  return (
    <div className="space-y-6 h-[calc(100vh-80px)] overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Published Posts</h1>
        <p className="text-gray-500 mt-2">
          Review the drafts you marked as shipped and reuse them as future references.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
          Loading published posts...
        </div>
      ) : publishedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">No published posts yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Mark a draft as published from Create Post and it will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {publishedItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Published
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
                  <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap leading-6">
                    {item.body}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(item.body)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
