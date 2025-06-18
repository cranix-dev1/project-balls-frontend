import React, { useEffect, useState } from 'react';
import DMList from '../components/DMList';
import DMWindow from '../components/DMWindow';
import DMHeader from '../components/DMHeader';
import axios from 'axios';
import useStore from '../store/useStore';
import { sendGroupMessage, sendDM } from '../utils/socket';

// === Page: Direct Messages (DMs) and Group DMs ===
function DMs() {
  // === Zustand state ===
  const selectedUser = useStore(state => state.selectedUser);
  const setSelectedUser = useStore(state => state.setSelectedUser);
  const messages = useStore(state => state.messages);
  const setMessages = useStore(state => state.setMessages);
  const addMessage = useStore(state => state.addMessage);
  const groupDMs = useStore(state => state.groupDMs);
  const selectedGroup = useStore(state => state.selectedGroupDM);
  const setSelectedGroup = useStore(state => state.setSelectedGroupDM);
  const groupMessagesMap = useStore(state => state.groupMessages); 
  const groupMessages = groupMessagesMap[selectedGroup?._id] || []; 
  const user = useStore(state => state.user);
  const privateKey = useStore(state => state.user?.privateKey);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const showPinnedModal = useStore(state => state.showPinnedModal);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');



  // === Local state ===
  const [dmUsers, setDmUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showGroupAddModal, setShowGroupAddModal] = useState(false);
  const [newGroupId, setNewGroupId] = useState(null);
  const userId = localStorage.getItem('userId');

  // === Fetch user's DM contact list ===
const fetchDmList = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch('http://ix.nickyboi.com:3000/api/users/dm-list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setDmUsers(data);

    // ✅ Auto-select first DM contact if none selected yet
    if (data.length > 0 && !selectedUser) {
      setSelectedUser(data[0]);
    }
  } catch (error) {
    console.error('Error fetching DM list:', error);
  }
};


  // === Fetch user's group DM list ===
  const fetchGroups = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://ix.nickyboi.com:3000/api/groupdms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    useStore.getState().setGroupDMs(data);
  };

  // === Initial data load ===
  useEffect(() => {
    fetchGroups();
    fetchDmList();
  }, []);


  useEffect(() => {
  if (showPinnedModal) fetchPinnedMessages();
}, [showPinnedModal]);

  // === Fetch all users (used for DM & group additions) ===
  const fetchAllUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('http://ix.nickyboi.com:3000/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllUsers(data);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  // === Fetch messages between the current user and selectedUser ===
useEffect(() => {
  if (!selectedUser || !selectedUser._id || !user) return;

  async function fetchMessages() {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/messages/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data.map(m => ({
        ...m,
        from: m.from || m.sender || m.receiver,
      })));
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }

  fetchMessages();
}, [selectedUser?._id, user]);

const fetchPinnedMessages = async () => {
  const token = localStorage.getItem('token');
  if (!token || !selectedUser) return;

  try {
    const res = await axios.get(`/api/messages/${selectedUser._id}/pinned`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPinnedMessages(res.data);
  } catch (err) {
    console.error('Failed to fetch pinned messages:', err);
  }
};


const handleSend = (text, replyToId = null) => {
  if (!text.trim()) return;

  if (selectedUser) {
    sendDM(selectedUser._id, text, replyToId); // ONLY this
  } else if (selectedGroup) {
    const timestamp = new Date().toISOString();
    useStore.getState().addGroupMessage(selectedGroup._id, {
      _id: `${Date.now()}-${Math.random()}`,
      from: userId,
      content: text,
      createdAt: timestamp,
    });
    sendGroupMessage(selectedGroup._id, text);
  }
};


  // === Add a user to the selected group ===
  const handleAddUserToGroup = async (userIdToAdd) => {
    const token = localStorage.getItem('token');
    if (!selectedGroup) return;

    try {
      const res = await fetch(`http://ix.nickyboi.com:3000/api/groupdms/${selectedGroup._id}/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIdToAdd }),
      });

      if (!res.ok) throw new Error('Failed to add user');
      const updated = await res.json();
      alert(`${updated.username} added to group.`);
      setShowGroupAddModal(false);
      fetchGroups(); // refresh group list
    } catch (err) {
      console.error(err);
      alert('Failed to add user to group.');
    }
  };

  // === Add a user to the DM contact list ===
  const addUserToDmList = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('http://ix.nickyboi.com:3000/api/users/dm-list/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIdToAdd: userId }),
      });
      await fetchDmList();
      setShowAddUser(false);
    } catch (err) {
      console.error(err);
    }
  };

  // === Create a new group DM and open the modal to add members ===
  const handleCreateGroupAndOpenModal = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://ix.nickyboi.com:3000/api/groupdms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: `New Group ${Date.now()}`, participants: [] }),
    });
    const group = await res.json();
    setSelectedGroup(group);
    setNewGroupId(group._id);
    setShowGroupAddModal(true);
    fetchAllUsers();
  };

const setShowPinnedModal = useStore(state => state.setShowPinnedModal);

  // === Component layout ===
  return (
    

    <div className="flex flex-grow overflow-hidden">
      {/* Sidebar with DM and group DM lists */}
      <DMList
        dmUsers={dmUsers}
        groupDMs={groupDMs}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        setSelectedUser={setSelectedUser}
        setSelectedGroup={setSelectedGroup}
        onAddToGroupClick={handleCreateGroupAndOpenModal}
      />

      {/* Group member addition modal */}
      {showGroupAddModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
          <div className="bg-gray-900 p-6 rounded w-96 relative">
            <h2 className="text-white text-lg font-semibold mb-4">Add Users to Group</h2>
            <button className="absolute top-2 right-3 text-white text-xl" onClick={() => setShowGroupAddModal(false)}>
              &times;
            </button>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {allUsers
                .filter(user => !selectedGroup.participants.some(p => p._id === user._id))
                .map(user => (
                  <div key={user._id} className="flex justify-between items-center text-white border-b border-gray-700 py-1">
                    <span>{user.username}</span>
                    <button
                      className="text-green-500 hover:underline"
                      onClick={() => handleAddUserToGroup(user._id)}
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Main DM view (Header + Messages + Footer) */}
      <div className="flex flex-col flex-grow overflow-hidden">
<div className="sticky top-0 z-40 bg-black">
  <DMHeader
    onToggleSearch={() => setShowSearch(!showSearch)}
    isSearchOpen={showSearch}
    searchTerm={searchTerm}
    setSearchTerm={setSearchTerm}
  />
</div>

<DMWindow
  messages={selectedGroup ? groupMessages : messages}
  onSend={handleSend}
  isSearchOpen={showSearch}
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
/>


        {/* Add new DM contact UI */}
        <div className="p-4 border-t border-gray-800 bg-gray-800">
          {showAddUser ? (
            <div>
              <button onClick={() => setShowAddUser(false)} className="mb-2 px-3 py-1 bg-red-600 rounded">Close</button>
              <div className="max-h-40 overflow-y-auto bg-black p-2 rounded">
                {allUsers.length === 0 ? (
                  <button onClick={fetchAllUsers} className="px-3 py-1 bg-blue-600 rounded">Load Users</button>
                ) : (
                  allUsers.map(user => (
                    <div key={user._id} className="flex justify-between items-center p-2 border-b border-gray-700">
                      <span>{user.username}</span>
                      <button
                        onClick={() => addUserToDmList(user._id)}
                        className="bg-green-600 px-2 py-1 rounded"
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddUser(true)} className="px-4 py-2 bg-blue-600 rounded mt-4">
              Add DM Contact
            </button>
          )}
        </div>
      </div>
      {/* === Pinned Messages Modal === */}
{showPinnedModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
    <div className="bg-gray-900 p-6 rounded w-[400px] max-h-[80vh] overflow-y-auto relative">
      <h2 className="text-white text-lg font-semibold mb-4">📌 Pinned Messages</h2>
      <button
        className="absolute top-2 right-3 text-white text-xl"
        onClick={() => setShowPinnedModal(false)}
      >
        ×
      </button>

      {pinnedMessages.length === 0 ? (
        <p className="text-gray-400">No pinned messages.</p>
      ) : (
        pinnedMessages.map((msg) => (
          <div key={msg._id} className="text-white border-b border-gray-700 py-2">
            <p>{msg.content}</p>
            <p className="text-xs text-gray-500">
              {new Date(msg.createdAt).toLocaleString()}
            </p>
            {/* 🔻 Unpin Button */}
            <button
              className="text-red-400 text-sm hover:underline mt-1"
              onClick={async () => {
                const token = localStorage.getItem('token');
                try {
                  await fetch(`/api/messages/${msg._id}/unpin`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  setPinnedMessages(prev => prev.filter(m => m._id !== msg._id));
                } catch (err) {
                  console.error('Unpin failed:', err);
                }
              }}
            >
              Unpin
            </button>
          </div>
        ))
      )}
    </div>
  </div>
)}


    </div>
  );
}

export default DMs;
