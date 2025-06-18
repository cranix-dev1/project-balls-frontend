import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../utils/socket';
import axios from 'axios';
import { formatMessage } from '../utils/formatMessage';
import { sanitizeHTML } from '../utils/sanitizeHTML';

export function parseMentions(text, loggedInUsername, onMentionClick) {
  const parts = text.split(/(@\w+\b)/g); // Split on @mention boundaries

  return parts.map((part, i) => {
    const match = part.match(/^@(\w+)\b$/);
    if (match) {
      const mentionedName = match[1];
      const isSelf = mentionedName.toLowerCase() === loggedInUsername?.toLowerCase();
      const classes = isSelf
        ? 'mention-highlight'
        : 'mention-clickable text-blue-400 hover:underline cursor-pointer';

      return (
        <span
          key={i}
          className={classes}
          data-mention={mentionedName}
          onClick={() => onMentionClick(mentionedName)}
        >
          @{mentionedName}
        </span>
      );
    }

    return <span key={i}>{part}</span>;
  });
}




function DMWindow({ messages, onSend, isSearchOpen, searchTerm, setSearchTerm }) {
  const [replyTo, setReplyTo] = useState(null);
  const firstMessageRef = useRef(null);
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [userMap, setUserMap] = useState({});
  const [profileUser, setProfileUser] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, id: null, content: '' });
  

  const contextMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [showReportModal, setShowReportModal] = useState(null); // stores message being reported
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');




  const selectedUser = useStore((state) => state.selectedUser);
  const loggedInUser = useStore((state) => state.user);
  const loggedInUserId = loggedInUser?._id || localStorage.getItem('userId');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, id: null, content: '' });
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  useEffect(() => {
  if (firstMessageRef.current) {
    firstMessageRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, []);

useEffect(() => {
const handleMentionClick = async (e) => {
  const el = e.target.closest('.mention-highlight, .mention-clickable');
  if (!el) return;

  const mentionedUsername = el.dataset.mention;
  if (!mentionedUsername) return;

  try {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch all users + self profile in parallel
    const [usersRes, profileRes] = await Promise.all([
      axios.get('/api/users', { headers }),
      axios.get('/api/users/profile', { headers })
    ]);

    const allUsers = [...usersRes.data, profileRes.data.user];

    const user = allUsers.find(
      u => u.username.toLowerCase() === mentionedUsername.toLowerCase()
    );

    if (user) {
      setProfileUser(user);
    } else {
      console.warn('User not found for mention:', mentionedUsername);
    }
  } catch (err) {
    console.error('Failed to fetch mentioned user profile:', err);
  }
};


  document.addEventListener('click', handleMentionClick);
  
  return () => document.removeEventListener('click', handleMentionClick);
}, []);



  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const map = {};
        res.data.forEach((u) => {
          map[String(u._id)] = {
            username: u.username,
            avatar: u.avatar || '/default-avatar.png',
          };
        });

        const payload = JSON.parse(atob(token.split('.')[1]));
        const selfId = payload.id;

        if (!map[selfId]) {
          const profileRes = await axios.get('/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          map[selfId] = {
            username: profileRes.data.user.username,
            avatar: profileRes.data.user.avatar || '/default-avatar.png',
          };
        }

        const loggedInUser = useStore.getState().user;
        if (loggedInUser) {
          map[loggedInUser._id] = {
            username: loggedInUser.username,
            avatar: loggedInUser.avatar || '/default-avatar.png',
          };
        }

        setUserMap((prev) => {
          const changed = Object.keys(map).some(
            (k) => !prev[k] || prev[k].username !== map[k].username
          );
          return changed ? map : prev;
        });
      } catch (err) {
        console.error('Failed to build userMap:', err);
      }
    };
    fetchUsers();
  }, [selectedUser]);

  const handleChange = (e) => {
    setText(e.target.value);
    const socket = getSocket?.();
    if (selectedUser && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'typing', to: selectedUser._id }));
    }
  };

const handleSend = () => {
  if (!text.trim()) return;
  onSend(text, replyTo?._id || null); 
  setText('');
  setReplyTo(null);
};


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      editingMessageId ? saveEdit() : handleSend();
    }
  };

  const startEditing = (id, currentText) => {
    setEditingMessageId(id);
    setEditingText(currentText);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEdit = () => {
    if (!editingText.trim() || !editingMessageId) return;
    const socket = getSocket?.();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'edit_dm',
        messageId: editingMessageId,
        content: editingText,
      }));
    }
    cancelEdit();
  };

  const deleteMessage = (id) => {
    if (!id) return;
    const socket = getSocket?.();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'delete_dm', messageId: id }));
    }
  };

  useEffect(() => {
    const socket = getSocket?.();
    if (!socket) return;

    const handleTyping = ({ from }) => {
      setTypingUsers((prev) => ({ ...prev, [from]: true }));
      setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[from];
          return updated;
        });
      }, 3000);
    };




    const onMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'typing') handleTyping(data);
        if (data.type === 'edit_dm') {
          useStore.getState().updateMessages((msgs) =>
            msgs.map((m) =>
              m._id === data.messageId
                ? { ...m, content: data.content, edited: true, editedAt: data.editedAt }
                : m
            )
          );
        }
        if (data.type === 'delete_dm') {
          useStore.getState().updateMessages((msgs) =>
            msgs.filter((m) => m._id !== data.messageId)
          );
        }
      } catch (err) {
        console.error('Invalid WebSocket message', err);
      }
    };

socket.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);

    if (data.type === 'pin_update') {
      useStore.getState().updateMessages((msgs) =>
        msgs.map((m) =>
          m._id === data.messageId ? { ...m, pinned: data.pinned } : m
        )
      );
    }

    // handle other types...
  } catch (err) {
    console.error('Invalid WS message', err);
  }
});


    return () => socket.removeEventListener('message', onMessage);
  }, [selectedUser]);

  function renderFormatted(content) {
    const formatted = formatMessage(content);
    return sanitizeHTML(formatted);
  }
  // === Profile Modal ===
  const profileModal = profileUser && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 text-white">
        <h2 className="text-lg font-bold mb-2">@{profileUser.username}</h2>
        <img src={profileUser.avatar} className="w-16 h-16 rounded-full mb-4" />
        <p className="text-sm text-gray-300">{profileUser.bio || 'No bio set.'}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          onClick={() => setProfileUser(null)}
        >
          Close
        </button>
      </div>
    </div>
  );


return (
  <>
    {profileModal}

    {isSearchOpen && (
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-gray-800 text-white rounded focus:outline-none"
        />
      </div>
    )}

    <div className="flex flex-col h-full overflow-hidden">

   

    {/* === Message List === */}
    <div className="flex-1 overflow-y-auto p-4 scroll-smooth scroll-pt-16">
      {messages
  .filter((msg) => {
    if (!searchTerm) return true;
    return msg.content?.toLowerCase().includes(searchTerm.toLowerCase());
  })
  .map((msg, idx) => {

        const isFirst = idx === 0;
        const isSelf = msg.from === loggedInUserId;
        const user = userMap[msg.from] || {};
        const showSender = idx === 0 || messages[idx - 1]?.from !== msg.from;
        const time = msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '...';

        return (
          
          <div
            key={msg._id || idx}
            ref={isFirst ? firstMessageRef : null}
            className={`group text-white flex gap-2 px-2 relative mb-1 ${isFirst ? 'scroll-mt-20' : ''}`}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                visible: true,
                x: e.pageX,
                y: e.pageY,
                id: msg._id,
                content: msg.content,
                isSelf,
              });
            }}
          >
            {/* === Left Column === */}
            <div className="w-[3rem] flex-shrink-0 pt-1">
              {showSender && (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover mt-1"
                />
              )}
            </div>

            {/* === Right Column === */}
            <div className="flex-1">
              {showSender && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="text-sm text-gray-400 font-semibold">
                    {isSelf ? 'You' : user.username}
                  </div>
                  <div className="text-xs text-gray-500">{time}</div>
                </div>
              )}

              {/* === Reply reference preview === */}
{msg.replyTo && (
  <div className="text-sm text-gray-400 border-l-4 pl-2 border-blue-500 mb-1">
    <span className="font-medium text-white">
      {msg.replyTo.sender === loggedInUserId ? 'You' : userMap[msg.replyTo.sender]?.username || 'Unknown'}
    </span>: “{msg.replyTo.content || 'Message unavailable'}”
  </div>
)}


              {editingMessageId === msg._id ? (
                <div>
                  <textarea
                    className="w-full p-2 rounded bg-gray-700 text-white resize-none"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex space-x-2 mt-1">
                    <button className="px-2 py-1 bg-green-600 rounded hover:bg-green-700" onClick={saveEdit}>
                      Save
                    </button>
                    <button className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-700" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-0.2">
                  <div className="flex items-baseline gap-2">

{parseMentions(msg.content, loggedInUser?.username, async (mentionedUsername) => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = res.data.find((u) => u.username.toLowerCase() === mentionedUsername.toLowerCase());
    if (user) {
      setProfileUser(user);
    } else {
      console.warn('User not found for mention:', mentionedUsername);
    }
  } catch (err) {
    console.error('Failed to fetch mentioned user profile:', err);
  }
})}




                    <span className="ml-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {time}
                    </span>
                  </div>

                  {/* === Reactions UI === */}
                  <div className="flex flex-wrap gap-2 mt-1 ml-1">
                    {msg.reactions?.length > 0 && (
                      <div className="flex space-x-1 mt-1">
                        {Object.entries(
                          msg.reactions.reduce((acc, { emoji, userId }) => {
                            acc[emoji] = acc[emoji] || { count: 0, users: [] };
                            acc[emoji].count++;
                            acc[emoji].users.push(userId);
                            return acc;
                          }, {})
                        ).map(([emoji, { count, users }]) => {
                          const userId = localStorage.getItem('userId');
                          const isReactedByYou = users.includes(userId);

                          return (
                            <button
                              key={emoji}
                              className={`flex items-center text-sm px-2 py-0.5 rounded-full transition ${
                                isReactedByYou ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200'
                              }`}
                              onClick={() => {
                                getSocket()?.send(JSON.stringify({
                                  type: 'react_message',
                                  messageId: msg._id,
                                  emoji,
                                }));
                              }}
                            >
                              <span className="mr-1">{emoji}</span>
                              <span className="text-xs">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* === Report Modal === */}
{reportTarget && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-gray-800 p-6 rounded shadow-lg max-w-md w-full">
      <h2 className="text-lg font-bold mb-2 text-white">Report Message</h2>
      <p className="text-sm text-gray-300 mb-2">
        <span className="font-semibold text-white">Message:</span> {reportTarget.content}
      </p>
      <textarea
        placeholder="Describe the issue..."
        className="w-full p-2 bg-gray-700 text-white rounded mb-3"
        rows={4}
        value={reportReason}
        onChange={(e) => setReportReason(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <button
          className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-500"
          onClick={() => {
            setReportTarget(null);
            setReportReason('');
          }}
        >
          Cancel
        </button>
        <button
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              await axios.post('/api/reports', {
                messageId: reportTarget._id,
                reason: reportReason,
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              alert('Message reported successfully.');
            } catch (err) {
              console.error('Report failed:', err);
              alert('Failed to submit report.');
            }
            setReportTarget(null);
            setReportReason('');
          }}
          disabled={!reportReason.trim()}
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}


            {/* === Context Menu === */}
            {contextMenu.visible && contextMenu.id === msg._id && (
              <div
                ref={contextMenuRef}
                className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg text-sm"
                style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
              >
                <div className="flex flex-wrap justify-start px-2 py-2 border-b border-gray-700">
                  {['👍', '😂', '❤️', '😮', '😢', '😡'].map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg px-1 hover:scale-110 transition"
                      onClick={() => {
                        getSocket()?.send(JSON.stringify({
                          type: 'react_message',
                          messageId: contextMenu.id,
                          emoji,
                        }));
                        setContextMenu({ visible: false, x: 0, y: 0, id: null });
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {contextMenu.isSelf && (
                  <>
                    <button
                      className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
                      onClick={() => {
                        startEditing(contextMenu.id, contextMenu.content);
                        setContextMenu({ visible: false, x: 0, y: 0, id: null });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="block w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700"
                      onClick={() => {
                        deleteMessage(contextMenu.id);
                        setContextMenu({ visible: false, x: 0, y: 0, id: null });
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}

                {/* === Reply Option === */}
                <button
                  className="block w-full px-4 py-2 text-left text-green-400 hover:bg-gray-700"
                  onClick={() => {
                    const msg = messages.find(m => m._id === contextMenu.id);
                    if (msg) {
                      setReplyTo({ _id: msg._id, content: msg.content, sender: msg.from });
                    }
                    setContextMenu({ visible: false, x: 0, y: 0, id: null });
                  }}
                >
                  Reply
                </button>

                {/* === Pin Option === */}
                <button
                  className="block w-full px-4 py-2 text-left text-yellow-400 hover:bg-gray-700"
                  onClick={() => {
                    getSocket()?.send(JSON.stringify({
                      type: 'pin_message',
                      messageId: contextMenu.id,
                      pinned: !contextMenu.pinned,
                    }));
                    setContextMenu({ visible: false, x: 0, y: 0, id: null });
                  }}
                >
                  {contextMenu.pinned ? 'Unpin Message' : 'Pin Message'}
                </button>
                {/* === Report Option === */}
                  <button
                    className="block w-full px-4 py-2 text-left text-red-500 hover:bg-gray-700"
                    onClick={() => {
                      const msg = messages.find(m => m._id === contextMenu.id);
                      if (msg) {
                        setReportTarget({ _id: msg._id, content: msg.content, from: msg.from });
                      }
                      setContextMenu({ visible: false, x: 0, y: 0, id: null });
                    }}
                  >
                    Report Message
                  </button>

              </div>
            )}
          </div>
        );
      })}

      {selectedUser && typingUsers[selectedUser._id] && (
        <div className="text-sm text-gray-400 italic">Typing...</div>
      )}
      <div ref={messagesEndRef} />
    </div>

    {/* === Replying Banner === */}
    {replyTo && (
      <div className="bg-gray-800 text-sm text-gray-300 px-3 py-2 rounded-t-md flex items-center justify-between">
        <span>
          Replying to <strong>{replyTo.sender === loggedInUserId ? 'You' : userMap[replyTo.sender]?.username}</strong>: “{replyTo.content}”
        </span>
        <button onClick={() => setReplyTo(null)} className="text-red-400 ml-4 text-lg font-bold">×</button>
      </div>
    )}

    {/* === Message input === */}
    <div className="flex items-center border-t border-gray-700 bg-gray-900 px-4 py-3 shrink-0">
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-grow resize-none rounded bg-gray-700 p-2 text-white focus:outline-none"
        rows={1}
      />
      <button
        onClick={handleSend}
        className="ml-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        disabled={!text.trim()}
      >
        Send
      </button>
    </div>
  </div>
  </>
);





}

export default DMWindow;