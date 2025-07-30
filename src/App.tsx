import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Chat from './components/Chat';
import ChannelManager from './components/ChannelManager';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ChannelProvider } from './contexts/ChannelContext';

function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <ChannelProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Chat />} />
                <Route path="/manage-channels" element={<ChannelManager />} />
              </Routes>
            </div>
          </Router>
        </ChannelProvider>
      </AuthProvider>
    </SocketProvider>
  );
}

export default App; 