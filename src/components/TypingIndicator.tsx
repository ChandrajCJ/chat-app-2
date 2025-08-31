import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-1 px-4 py-2 animate-fade-in">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full animate-[bounce_1s_ease-in-out_0s_infinite]" 
             style={{ backgroundColor: 'var(--primary-400)' }} />
        <div className="w-2 h-2 rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]" 
             style={{ backgroundColor: 'var(--primary-400)' }} />
        <div className="w-2 h-2 rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" 
             style={{ backgroundColor: 'var(--primary-400)' }} />
      </div>
    </div>
  );
};

export default TypingIndicator;