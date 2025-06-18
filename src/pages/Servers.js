import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';

// === Servers Page: Server list + placeholder content ===
function Servers() {
  // === Local state ===
  const [servers, setServers] = useState([]); // List of available servers (currently static)

  // === Zustand state ===
  const selectedServer = useStore(state => state.selectedServer);     // Currently selected server
  const setSelectedServer = useStore(state => state.setSelectedServer); // Setter for selected server

  // === Simulate server list fetch on mount ===
  useEffect(() => {
    // TODO: Replace with real API call later
    setServers([
      { id: '1', name: 'Test Server' },
      { id: '2', name: 'Dev Hub' }
    ]);
  }, []);

  return (
    <div className="flex h-full">

      {/* === Sidebar: Server List === */}
      <div className="w-60 bg-zinc-900 p-3 space-y-2">
        <h2 className="text-white font-bold">Servers</h2>

        {/* Render each server as clickable item */}
        {servers.map(server => (
          <div
            key={server.id}
            className={`p-2 rounded cursor-pointer text-white hover:bg-zinc-700 ${
              selectedServer?.id === server.id ? 'bg-zinc-700' : ''
            }`}
            onClick={() => setSelectedServer(server)}
          >
            {server.name}
          </div>
        ))}

        {/* Create Server Button (non-functional placeholder) */}
        <button className="w-full mt-4 bg-blue-600 text-white p-2 rounded">
          + Create Server
        </button>
      </div>

      {/* === Main Content Area === */}
      <div className="flex-1 bg-zinc-800 text-white p-4">
        {selectedServer ? (
          <div>
            <h1 className="text-2xl font-bold">{selectedServer.name}</h1>
            <p>Server channels and chat coming soon...</p>
          </div>
        ) : (
          <div className="text-zinc-400">
            Select a server to view content.
          </div>
        )}
      </div>
    </div>
  );
}

export default Servers;
