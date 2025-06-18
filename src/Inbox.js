import { useEffect, useState } from 'react';
import axios from 'axios';
import useStore from '../store/useStore'; // Zustand global store (used for privateKey)
import { decryptMessage } from '../utils/crypto'; // RSA decryption utility

// === Inbox Component: Displays list of recent conversations (DM previews) ===
export default function Inbox({ onSelectUser }) {
  const [conversations, setConversations] = useState([]); // Local state: array of conversation previews

  const token = localStorage.getItem('token'); // JWT token for API requests

  // === Fetch conversation previews on mount ===
  useEffect(() => {
    const privateKey = useStore.getState().user?.privateKey; // In-memory CryptoKey from Zustand

    if (!privateKey) {
      console.warn('[Inbox] Private key not loaded, skipping decryption.');
      return;
    }

    axios.get('/api/dms/conversations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        // Attempt to decrypt each conversation's last message
        const decrypted = await Promise.all(
          res.data.map(async (c) => {
            try {
              const text = await decryptMessage(c.lastMessage, privateKey);
              return { ...c, lastMessage: text }; // Replace with decrypted message
            } catch {
              return { ...c, lastMessage: '[Encrypted]' }; // Fallback if decryption fails
            }
          })
        );
        setConversations(decrypted); // Update local state
      })
      .catch(err => console.error(err));
  }, [token]);

  // === Render ===
  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl mb-4 font-bold">Inbox</h2>

      {/* Render a preview card for each conversation */}
      {conversations.map(c => (
        <div
          key={c.userId}
          onClick={() => onSelectUser(c)} // Pass user info to parent on click
          className="cursor-pointer border-b py-2"
        >
          <div className="font-semibold">{c.username}</div>           {/* Display username */}
          <div className="text-sm text-gray-600 truncate">{c.lastMessage}</div> {/* Message preview */}
        </div>
      ))}
    </div>
  );
}
