import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import useStore from './store/useStore';
import { initSocket, getSocket } from './utils/socket';
import Auth from './components/Auth';
import DMs from './pages/DMs';
import Profile from './pages/Profile';
import Servers from './pages/Servers';
import './index.css';
import axios from 'axios';

axios.defaults.baseURL = 'http://ix.nickyboi.com:3000';

function App() {
  const [connected, setConnected] = useState(false);
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'));

  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const setMessages = useStore(state => state.setMessages);
  const addMessage = useStore(state => state.addMessage);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const res = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.user;
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    if (authed && !user) {
      fetchUserProfile().then((profile) => {
        if (profile) setUser(profile);
      });
    }
  }, [authed, user, setUser]);

  // ✅ NEW: Connect WebSocket on app load
  useEffect(() => {
    if (authed && user) {
      console.log('[INIT] Connecting socket on app load...');
      initSocket(
        (data) => {
          if (data.type === 'dm') {
            addMessage({
              from: data.from,
              content: data.content,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          } else if (data.type === 'message') {
            addMessage({
              from: data.from || 'server',
              content: data.content,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          } else if (data.type === 'system') {
            addMessage({ from: 'system', content: data.message });
          }
        },
        (status) => setConnected(status === 'connected')
      );
    }
  }, [authed, user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setMessages([]);
    setConnected(false);
    setAuthed(false);
  };

  const handleAuthSuccess = async () => {
    const profile = await fetchUserProfile();
    if (profile) {
      setUser(profile);
      setAuthed(true);

      // Close stale socket if open
      const s = getSocket();
      if (s && s.readyState !== WebSocket.CLOSED) {
        try { s.close(); } catch (e) {}
      }

      // Reinitialize WebSocket connection
      setTimeout(() => {
        console.log('[DEBUG] Calling initSocket after login');
        initSocket(
          (data) => {
            if (data.type === 'dm') {
              addMessage({
                from: data.from,
                content: data.content,
                createdAt: data.createdAt || new Date().toISOString(),
              });
            } else if (data.type === 'message') {
              addMessage({
                from: data.from || 'server',
                content: data.content,
                createdAt: data.createdAt || new Date().toISOString(),
              });
            } else if (data.type === 'system') {
              addMessage({ from: 'system', content: data.message });
            }
          },
          (status) => setConnected(status === 'connected')
        );
      }, 0);
    }
  };

  return (
    <Router>
      <div className="h-full bg-gray-900 text-white flex flex-col">
        {/* === App Header === */}
        <header className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-800">
          <div>
            Status: {connected ? '✅ Connected' : '❌ Not connected'}
            {user && (
              <div className="text-sm text-gray-300">
                {user.username} ({user.email})
              </div>
            )}
          </div>

          <div className="flex gap-4 items-center">
            {authed && (
              <>
                <Link to="/profile" className="text-sm text-blue-400 underline">Profile</Link>
                <Link to="/" className="text-sm text-blue-400 underline">DMs</Link>
                <Link to="/servers" className="text-sm text-blue-400 underline">Servers</Link>
                <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
              </>
            )}
          </div>
        </header>

        <main className="flex flex-grow overflow-hidden">
          {!authed ? (
            <Auth onAuth={handleAuthSuccess} />
          ) : !connected ? (
            <div className="p-4">Status: ❌ Not connected (trying...)</div>
          ) : (
            <Routes>
              <Route path="/" element={<DMs />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/servers" element={<Servers />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
}

export default App;
