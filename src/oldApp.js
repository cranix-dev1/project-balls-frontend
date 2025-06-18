import { useEffect, useState } from 'react';
import Chat from './pages/Chat';
import { initSocket } from './utils/socket';

function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const handleTempLogin = () => {
    fetch('https://ix.nickyboi.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ciaran@ciaranmoore.com',
        password: '22Chiltern'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          console.log('Token saved!');
          initSocket(
            msg => setMessages(prev => [...prev, msg]),
            status => setConnected(status === 'connected')
          );
        } else {
          alert('Login failed');
        }
      });
  };

  return (
    <div>
      <button onClick={handleTempLogin}>Temp Login</button>
      <p>Status: {connected ? '✅ Connected' : '❌ Not connected'}</p>
      <Chat messages={messages} />
    </div>
  );
}

export default App;
