import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-1 px-4 py-2 animate-fade-in">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-[bounce_1s_ease-in-out_0s_infinite]" />
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
};

export default TypingIndicator;