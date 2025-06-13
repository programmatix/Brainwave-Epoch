import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import { AppEEG } from './AppEEG';
import './index.css';
import reportWebVitals from './reportWebVitals';

// Connect to React DevTools if available
if (process.env.REACT_APP_DEV_TOOLS === 'true' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('React DevTools detected and enabled');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppEEG />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
