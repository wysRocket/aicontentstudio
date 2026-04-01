import { useState } from "react";
import { deleteUser } from "firebase/auth";
import { LogOut, Trash2 } from "lucide-react";
import { useFirebase } from "../../contexts/FirebaseContext";

export function Profile() {
  const { user, signOut } = useFirebase();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account.";
      if (message.includes("requires-recent-login")) {
        setDeleteError(
          "For security, please sign out and sign back in before deleting your account.",
        );
      } else {
        setDeleteError(message);
      }
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };
  const profileInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white">
            Profile information
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Review your account identity and active sign-in details.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-16 w-16 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#D81B60] to-[#7c3aed] text-3xl font-bold text-white shadow-md">
                {profileInitial}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {user?.displayName || "Workspace user"}
              </h3>
              <p className="text-sm text-white/60">{user?.email}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Email verified
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {user?.emailVerified ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Account UID
              </p>
              <p className="mt-1 truncate text-sm font-medium text-white">
                {user?.uid}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="mb-2 text-sm font-semibold text-red-400">
              Danger zone
            </h3>
            <p className="mb-4 text-sm text-white/60">
              Signing out ends this browser session. Deleting your account is
              permanent and cannot be undone.
            </p>

            {deleteError && (
              <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {deleteError}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={signOut}
                className="flex items-center rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </button>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center rounded-lg border border-red-500/20 bg-white/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete account
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2">
                  <span className="text-sm font-medium text-red-300">
                    Are you sure? This cannot be undone.
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="ml-1 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
