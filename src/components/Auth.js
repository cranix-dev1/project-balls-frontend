import React, { useState } from 'react';

// Auth component: handles both login and registration
function Auth({ onAuth }) {
  // === Component state ===
  const [mode, setMode] = useState('login');       // 'login' or 'register' mode
  const [username, setUsername] = useState('');    // Username input
  const [email, setEmail] = useState('');          // Email input
  const [password, setPassword] = useState('');    // Password input
  const [error, setError] = useState('');          // Error message

  // === Submit handler for login/register ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // API endpoint based on current mode
    const endpoint = `http://ix.nickyboi.com:3000/api/auth/${mode}`;

    // Trim inputs before sending
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // === Request body depending on auth mode ===
    let body;

    if (mode === 'register') {
      body = {
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
      };
    } else {
      // Login allows either username or email
      const identifier = trimmedEmail || trimmedUsername;
      body = {
        identifier,
        password: trimmedPassword,
      };
    }

    try {
      // Send auth request
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        // Save token to localStorage
        localStorage.setItem('token', data.token);
        console.log('[AUTH] Token saved.');

        // Callback to parent with user info
        onAuth && onAuth({ username: data.username, email: data.email });
      } else {
        // Show error from server
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  };

  // === Component JSX ===
  return (
    <div className="max-w-xs mx-auto mt-32 bg-gray-900 text-white p-8 rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold mb-4">
        {mode === 'login' ? 'Login' : 'Register'}
      </h2>

      {/* Auth form */}
      <form onSubmit={handleSubmit} className="flex flex-col">

        {/* Email field - only required for registration */}
        <input
          className="mb-3 p-2 rounded text-black"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={mode === 'register'}
        />

        {/* Username field - always required */}
        <input
          className="mb-3 p-2 rounded text-black"
          type="text"
          placeholder="Username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {/* Password field */}
        <input
          className="mb-3 p-2 rounded text-black"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        

        {/* Submit button */}
        <button
          className="mb-2 p-2 bg-blue-600 rounded font-bold hover:bg-blue-700 transition"
          type="submit"
        >
          {mode === 'login' ? 'Login' : 'Register'}
        </button>

        {/* Toggle login/register mode */}
        <span
          className="text-sm underline cursor-pointer text-gray-300"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? "Need an account? Register" : "Have an account? Login"}
        </span>

        {/* Error message display */}
        {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}
      </form>
    </div>
  );
}

export default Auth;
