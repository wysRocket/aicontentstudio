import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  ensureWorkspaceSeedData,
  scheduleContentItem,
  subscribeToContentItems,
  validateContentDraft,
  type ContentRecord,
} from "../lib/firestore";

function toInputDate(value?: ContentRecord["scheduledFor"]) {
  if (!value) return "";
  const date = value.toDate();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function Calendar() {
  const { user, isAuthReady } = useFirebase();
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
    setIsLoading(true);
    setError(null);

    ensureWorkspaceSeedData(user.uid)
      .then(() => {
        if (!active) return;
        unsubscribe = subscribeToContentItems(user.uid, (records) => {
          if (!active) return;
          setItems(records.filter((record) => record.kind === "post_draft"));
          setIsLoading(false);
        });
      })
      .catch((err) => {
        console.error("Failed to load content calendar", err);
        if (active) {
          setError("We couldn't load your content calendar.");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isAuthReady, user]);

  const [scheduledItems, approvedItems, readyItems, needsFixItems] = useMemo(() => {
    const scheduled = items
      .filter((item) => item.scheduledFor)
      .sort(
        (a, b) =>
          (a.scheduledFor?.toMillis() ?? 0) - (b.scheduledFor?.toMillis() ?? 0),
      );
    const unscheduled = items.filter((item) => !item.scheduledFor);
    const approved = unscheduled.filter(
      (item) =>
        validateContentDraft(item).length === 0 &&
        item.workflowStatus === "approved",
    );
    const ready = unscheduled.filter(
      (item) =>
        validateContentDraft(item).length === 0 &&
        item.workflowStatus !== "approved",
    );
    const needsFix = unscheduled.filter(
      (item) => validateContentDraft(item).length > 0,
    );
    return [scheduled, approved, ready, needsFix];
  }, [items]);

  const handleSchedule = async (contentId: string, value: string) => {
    if (!user) return;
    const target = items.find((item) => item.id === contentId);
    if (!target) return;

    const issues = validateContentDraft(target);
    if (issues.length > 0 && value) {
      setError(issues[0]);
      return;
    }

    setSavingId(contentId);
    setError(null);
    try {
      await scheduleContentItem(
        user.uid,
        contentId,
        value ? new Date(`${value}T12:00:00`) : null,
      );
    } catch (err) {
      console.error("Failed to schedule content", err);
      setError(
        err instanceof Error && err.message.includes("content_not_approved")
          ? "Approve the draft before scheduling it."
          : "We couldn't update that scheduled date.",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8 h-[calc(100vh-80px)] overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500 mt-2">
          Schedule saved drafts so your queue becomes an actual content calendar.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
          Loading calendar...
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Scheduled</h2>
            </div>

            {scheduledItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
                Nothing is scheduled yet. Pick dates for your drafts below.
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{item.title}</p>
                        <p className="mt-2 text-sm text-gray-500">
                          {item.platforms.join(", ")} · {item.status}
                        </p>
                        <p className="mt-3 text-sm text-gray-700 line-clamp-3">
                          {item.body}
                        </p>
                      </div>
                      <div className="min-w-[220px]">
                        <label className="block text-sm font-medium text-gray-800 mb-1.5">
                          Scheduled date
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={toInputDate(item.scheduledFor)}
                            onChange={(e) =>
                              handleSchedule(item.id, e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {savingId === item.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Approved For Scheduling</h2>
            </div>

            {approvedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
                No approved drafts are waiting for a date.
              </div>
            ) : (
              <div className="space-y-4">
                {approvedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{item.title}</p>
                        <p className="mt-2 text-sm text-gray-500">
                          {item.platforms.join(", ")} · {item.status}
                        </p>
                      </div>
                      <div className="min-w-[220px]">
                        <label className="block text-sm font-medium text-gray-800 mb-1.5">
                          Pick a date
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value=""
                            onChange={(e) =>
                              handleSchedule(item.id, e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {savingId === item.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-violet-600" />
              <h2 className="text-xl font-semibold text-gray-900">Ready But Not Approved</h2>
            </div>

            {readyItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
                Nothing is waiting on approval right now.
              </div>
            ) : (
              <div className="space-y-4">
                {readyItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm"
                  >
                    <p className="text-lg font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      {item.platforms.join(", ") || "No platforms"} · {item.status} ·{" "}
                      {item.workflowStatus || "ready"}
                    </p>
                    <p className="mt-4 text-sm text-violet-900">
                      This draft passes the basic checks but still needs approval
                      before it can be scheduled.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-gray-900">Needs Fixes</h2>
            </div>

            {needsFixItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
                Every remaining draft currently passes the validation checks.
              </div>
            ) : (
              <div className="space-y-4">
                {needsFixItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
                  >
                    <p className="text-lg font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      {item.platforms.join(", ") || "No platforms"} · {item.status}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-amber-900">
                      {validateContentDraft(item).map((issue) => (
                        <li key={`${item.id}-${issue}`}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
