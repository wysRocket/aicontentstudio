import { useFirebase } from "../../contexts/FirebaseContext";
import { LogOut } from "lucide-react";

export function Profile() {
  const { user, signOut } = useFirebase();
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
              Signing out will end this browser session for your account.
            </p>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
