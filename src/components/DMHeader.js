import React from 'react';
import useStore from '../store/useStore'; // Zustand store for app state

function DMHeader({ onLogout, onToggleSearch, isSearchOpen }) {
  const selectedUser = useStore(state => state.selectedUser);

  if (!selectedUser) return null;

  return (
    <div className="sticky top-0 z-10 bg-black text-white p-4 border-b border-gray-800 flex items-center justify-between">
      {/* Left side: Username + Pinned */}
      <div className="flex items-center gap-4">
        <div className="font-semibold text-lg">
          {selectedUser?.username}
        </div>
        <button
          onClick={() => useStore.getState().setShowPinnedModal(true)}
          className="text-yellow-400 text-sm hover:underline"
        >
          📌
        </button>
      </div>

      {/* Right side: Search toggle + optional logout */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSearch}
          className="text-sm bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600"
        >
          {isSearchOpen ? 'Close Search' : 'Search'}
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="bg-red-600 px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

export default DMHeader;
