import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="glass-message rounded-3xl rounded-tl-lg px-4 py-3 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-400/20">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-white/60 ml-2 font-medium">typing...</span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;