import { contextBridge, ipcRenderer } from 'electron';

export type ElectronAPI = {
  on(channel: string, func: (...args: any[]) => void): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
};

const electronAPI: ElectronAPI = {
  on: (channel, func) => {
    ipcRenderer.on(channel, (_, ...args) => func(...args));
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
};

contextBridge.exposeInMainWorld('electron', electronAPI);