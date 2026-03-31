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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf6_100%)] shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Profile information
          </h2>
          <p className="mt-1 text-sm text-gray-500">
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
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.displayName || "Workspace user"}
              </h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Email verified
              </p>
              <p className="mt-1 text-sm font-medium text-gray-800">
                {user?.emailVerified ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Account UID
              </p>
              <p className="mt-1 truncate text-sm font-medium text-gray-800">
                {user?.uid}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-2 text-sm font-semibold text-red-600">
              Danger zone
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Signing out ends this browser session. Deleting your account is
              permanent and cannot be undone.
            </p>

            {deleteError && (
              <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {deleteError}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={signOut}
                className="flex items-center rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </button>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete account
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2">
                  <span className="text-sm font-medium text-red-700">
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
                    className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
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
