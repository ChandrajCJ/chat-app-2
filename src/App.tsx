import React from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import UserSelection from './components/UserSelection';
import ChatContainer from './components/ChatContainer';

const ChatApp: React.FC = () => {
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen transition-colors duration-300"
         style={{
           background: currentUser 
             ? 'transparent' 
             : 'linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50, var(--primary-100)) 100%)',
           color: 'var(--primary-900)'
         }}>
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