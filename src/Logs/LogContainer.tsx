import React, { useEffect, useRef } from 'react';

interface LogContainerProps {
  logs: string[];
}

const LogContainer: React.FC<LogContainerProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-1/4 mt-4 border rounded-lg p-2">
      <h3 className="text-lg font-semibold mb-2">Loading Logs</h3>
      <div ref={logContainerRef} className="h-full overflow-y-auto text-sm">
        {logs.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
      </div>
    </div>
  );
};

export default LogContainer;