import { create } from 'zustand';

// Zustand global state store
const useStore = create((set) => ({

  // Direct messages (1-on-1)
  messages: [],

  // Group messages organized by groupId
  groupMessages: {},

  // The currently selected user for direct messaging
  selectedUser: null,

  // The currently selected group DM
  selectedGroupDM: null,

  // All group DMs the current user is a part of
  groupDMs: [],

  // The logged-in user's profile (bio, avatar, keys, etc.)
  user: null,

  showPinnedModal: false,


  // === Setters for direct messages ===

  
  setShowPinnedModal: (val) => set({ showPinnedModal: val }),
  // Replace the full direct message list
  setMessages: (msgs) => set({ messages: msgs }),

  // Append a new direct message
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  // Select a user for DM view
  setSelectedUser: (user) => set({ selectedUser: user }),

  // Set the logged-in user profile
  setUser: (user) => set({ user }),

  // Update bio and avatar for the logged-in user
  updateUserProfile: (bio, avatar) =>
    set((state) => ({
      user: {
        ...state.user,
        bio,
        avatar,
      },
    })),

  // Update the messages array via a custom function
  updateMessages: (updater) =>
    set((state) => ({ messages: updater(state.messages) })),

  

  // Store the user's private key securely in state
  setUserPrivateKey: (privateKey) =>
    set((state) => ({
      user: {
        ...(state.user || {}),
        privateKey,
      },
    })),

  // === Setters for group DMs ===

  // Replace the full list of group DMs
  setGroupDMs: (groupDMs) => set({ groupDMs }),

  // Select a group DM to view
  setSelectedGroupDM: (group) => set({ selectedGroupDM: group }),

  // Set messages for a specific group
  setGroupMessages: (groupId, messages) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: messages,
      },
    })),

  // Add a message to a specific group DM
  addGroupMessage: (groupId, message) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: [
          ...(state.groupMessages[groupId] || []),
          message,
        ],
      },
    })),
}));

export default useStore;
