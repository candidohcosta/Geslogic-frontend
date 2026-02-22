import { getSocket } from './lib/socketClient';   // ✔ pode vir logo após os outros imports
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { TelemetryService } from './lib/telemetry';
import { Quill } from 'react-quill-new';

// --------------------------------------------------------
// DEBUG SOCKETS (remover em produção)
// --------------------------------------------------------
declare global {
  interface Window {
    getSocket: typeof getSocket;
  }
}
window.getSocket = getSocket;
// --------------------------------------------------------

window.Quill = Quill;

TelemetryService.initErrorCapture();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);

reportWebVitals();