import { useFirebase } from "../../contexts/FirebaseContext";
import { LogOut } from "lucide-react";

export function Profile() {
  const { user, signOut } = useFirebase();

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your personal information and account settings.
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full mr-4" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4 text-gray-600 font-bold text-xl">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{user?.displayName || 'User'}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-red-600 mb-4">Danger Zone</h3>
            <button
              onClick={signOut}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
