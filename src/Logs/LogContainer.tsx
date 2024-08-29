import React, { useState } from 'react';

interface LogContainerProps {
  logs: string[];
}

const LogContainer: React.FC<LogContainerProps> = ({ logs }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`border-t ${isExpanded ? 'h-[200px]' : 'h-8'} transition-all duration-300`}>
      <div className="flex items-center justify-between px-2 h-8 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ▲
        </span>
      </div>
      {isExpanded && (
        <div className="h-[calc(100%-2rem)] overflow-y-auto p-2 text-sm">
          {logs.map((log, index) => (
            <p key={index}>{log}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogContainer;