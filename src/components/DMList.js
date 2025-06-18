import React from 'react';

// DMList component: Renders sidebar list of DM users and group DMs
function DMList({
  dmUsers,              // Array of direct message user objects
  groupDMs,             // Array of group DM objects
  selectedUser,         // Currently selected DM user
  selectedGroup,        // Currently selected group chat
  setSelectedUser,      // Setter for selected user
  setSelectedGroup,     // Setter for selected group
  onAddToGroupClick     // Callback for '+' button to trigger group DM modal
}) {
  return (
    <div className="w-64 bg-black border-r border-gray-800 flex flex-col h-full">
      
      {/* Header: Direct Messages */}
      <h2 className="text-xl font-bold text-white p-4 border-b border-gray-800">
        Direct Messages
      </h2>

      <div className="flex-1 overflow-y-auto">
        {/* Render 1:1 DM Users */}
        {dmUsers.map(user => (
          <div
            key={user._id}
            onClick={() => {
              setSelectedUser(user);   // Set current user for DM view
              setSelectedGroup(null);  // Clear any selected group
            }}
            className={`p-4 cursor-pointer text-gray-300 hover:bg-gray-900 hover:text-red-500 ${
              selectedUser?._id === user._id ? 'bg-gray-700 text-red-500 font-semibold' : ''
            }`}
          >
            {user.username}
          </div>
        ))}

        {/* Header: Group DMs + '+' button */}
        <div className="flex justify-between items-center px-4 pt-6">
          <h2 className="text-md font-bold text-white">Group DMs</h2>
          <button
            onClick={onAddToGroupClick}                 // Open modal to create/add to group
            title="Add users to a group"
            className="text-white text-lg hover:text-green-400"
          >
            +
          </button>
        </div>

        {/* Render Group DMs */}
        {groupDMs.map(group => (
          <div
            key={group._id}
            onClick={() => {
              setSelectedUser(null);      // Deselect user
              setSelectedGroup(group);    // Select group
            }}
            className={`p-4 cursor-pointer text-gray-300 hover:bg-gray-900 hover:text-purple-400 ${
              selectedGroup?._id === group._id ? 'bg-gray-700 text-purple-400 font-semibold' : ''
            }`}
          >
            {group.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DMList;
