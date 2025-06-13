import React from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import UserSelection from './components/UserSelection';
import ChatContainer from './components/ChatContainer';

const ChatApp: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      
      {currentUser ? (
        <ChatContainer currentUser={currentUser} />
      ) : (
        <UserSelection />
      )}
    </div>
  );
};

function App() {
  return (
    <UserProvider>
      <ChatApp />
    </UserProvider>
  );
}

export default App;