import React from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import UserSelection from './components/UserSelection';
import ChatContainer from './components/ChatContainer';

const ChatApp: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-100 transition-colors duration-300">
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
    <ThemeProvider>
      <UserProvider>
        <ChatApp />
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;