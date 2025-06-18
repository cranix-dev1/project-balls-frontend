import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useStore from '../store/useStore';

function Profile() {
  // ===== Zustand Global State Access =====
  const user = useStore(state => state.user); // Logged-in user
  const updateUserProfile = useStore(state => state.updateUserProfile); // Function to update user in global state

  // ===== Local Component State =====
  const [bio, setBio] = useState('');       // Bio input
  const [avatar, setAvatar] = useState(''); // Avatar URL input
  const [saving, setSaving] = useState(false); // Saving status

  // ===== Sync local state with Zustand on mount/user change =====
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  // ===== Handle Save Button Click =====
  const handleSave = async () => {
    try {
      setSaving(true); // UI feedback during save
      const token = localStorage.getItem('token'); // Get auth token

      // Send profile update request to backend
      const res = await axios.put('/api/users/profile', { bio, avatar }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update global state on success
      if (res.data?.success) {
        updateUserProfile(bio, avatar);
      }
    } catch (err) {
      console.error('Failed to update profile', err); // Handle error
    } finally {
      setSaving(false); // Reset saving state
    }
  };

  // ===== Component JSX =====
  return (
    <div className="max-w-md mx-auto mt-10 bg-gray-900 p-6 rounded-xl shadow-md text-white">
      <h2 className="text-xl font-semibold mb-4">Your Profile</h2>

      <div className="flex flex-col items-center gap-4">
        {/* Avatar preview */}
        {avatar && (
          <img
            src={avatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border"
          />
        )}

        {/* Avatar input field */}
        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          type="text"
          placeholder="Avatar Image URL"
          value={avatar}
          onChange={e => setAvatar(e.target.value)}
        />

        {/* Bio input field */}
        <textarea
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          placeholder="Your bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
        />

        {/* Save button */}
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default Profile;
