import React from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import UserSelection from './components/UserSelection';
import ChatContainer from './components/ChatContainer';

const ChatApp: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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