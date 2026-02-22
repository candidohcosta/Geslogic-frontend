// frontend/src/types/electron-bridge.d.ts
export {};

declare global {
  interface ElectronBridge {
    openSupportFiles(): Promise<string[]>;
    readSupportFile(path: string): Promise<ArrayBuffer | null>;
  }
  interface Window {
    electron?: ElectronBridge;
  }
}