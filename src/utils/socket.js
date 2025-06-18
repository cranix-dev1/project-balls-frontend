import useStore from '../store/useStore';

// === Global Socket State ===
let socket = null;
let pingInterval;
let reconnectTimeout;
let reconnectAttempts = 0;

const WS_URL = 'ws://ix.nickyboi.com:3000';

// === Getter to safely access socket ===
export function getSocket() {
  return socket;
}

// === Initialize WebSocket connection ===
export function initSocket(onMessage, onStatusChange) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    const token = localStorage.getItem('token');
    if (token) {
      socket.send(JSON.stringify({ type: 'auth', token }));
    }

    reconnectAttempts = 0;

    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 10000);

    onStatusChange?.('connecting');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'auth_success':
          onStatusChange?.('connected');
          break;
        case 'auth_error':
          onStatusChange?.('error');
          socket.close();
          break;
        case 'mention':
          alert(`You were mentioned in a message: "${data.content}"`);
          break;
        case 'dm': {
          const addMessage = useStore.getState().addMessage;
          const currentUserId = useStore.getState().user?._id || localStorage.getItem('userId');
          addMessage({
            _id: data._id || `${Date.now()}-${Math.random()}`,
            from: String(data.from),
            content: data.content,
            createdAt: data.createdAt ?? new Date().toISOString(),
            replyTo: data.replyTo ?? null, // ✅ include this line
          });
          break;
        }

        case 'edit_dm':
          useStore.getState().updateMessages((msgs) =>
            msgs.map((m) =>
              m._id === data.messageId
                ? { ...m, content: data.content, edited: true, editedAt: data.editedAt }
                : m
            )
          );
          break;
        case 'delete_dm':
          useStore.getState().updateMessages((msgs) =>
            msgs.filter((m) => m._id !== data.messageId)
          );
          break;
        case 'group_message':
          useStore.getState().addGroupMessage(data.groupId, data);
          break;
        case 'update_reactions':
          useStore.getState().updateMessages((msgs) =>
            msgs.map((m) =>
              m._id === data.messageId
                ? { ...m, reactions: data.reactions }
                : m
            )
          );
          break;
        default:
          console.warn('Unhandled WS message:', data);
      }
    } catch (err) {
      console.error('Invalid WS message:', event.data);
    }
  };

  socket.onclose = () => {
    onStatusChange?.('disconnected');
    clearInterval(pingInterval);
    attemptReconnect(onMessage, onStatusChange);
  };

  socket.onerror = () => {
    onStatusChange?.('error');
    clearInterval(pingInterval);
    attemptReconnect(onMessage, onStatusChange);
  };
}

function attemptReconnect(onMessage, onStatusChange) {
  if (reconnectTimeout) return;

  const delay = Math.min(10000, 1000 * 2 ** reconnectAttempts);
  reconnectAttempts += 1;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    initSocket(onMessage, onStatusChange);
  }, delay);
}

// === Outbound DM ===
export const sendDM = (toUserId, content, replyTo = null) => {
  const socket = getSocket();
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'dm',
      to: toUserId,
      content,
      replyTo,
    }));
  }
};


// === Outbound group message ===
export function sendGroupMessage(groupId, content) {
  const s = getSocket();
  if (s && s.readyState === WebSocket.OPEN) {
    s.send(JSON.stringify({
      type: 'group_message',
      groupId,
      content,
    }));
  }
}
