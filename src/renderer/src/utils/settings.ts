const { ipcRenderer } = window.require('electron');

export interface AppSettings {
  lockHours: number;
  forbiddenHours: number;
  reminderMinutes: number;
  weatherKey: string;
  weatherLocation: string;
  debugMode: number;
}

// 获取设置
export function getSettings(): Promise<AppSettings> {
  return new Promise((resolve, reject) => {
    ipcRenderer.once('settings-updated', (_, settings) => {
      resolve(settings);
    });
    ipcRenderer.once('settings-error', (_, error) => {
      reject(error);
    });
    ipcRenderer.send('request-settings');
  });
}

// 保存设置
export function saveSettings(settings: AppSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    ipcRenderer.once('settings-updated', () => {
      resolve();
    });
    ipcRenderer.once('settings-error', (_, error) => {
      reject(error);
    });
    ipcRenderer.send('save-settings', settings);
  });
}

// 获取关机时间
export function getShutdownTime(): Promise<string | undefined> {
  return new Promise((resolve) => {
    ipcRenderer.once('shutdown-time', (_, time) => {
      resolve(time);
    });
    ipcRenderer.send('get-shutdown-time');
  });
}

// 保存关机时间
export function setShutdownTime(time: string): void {
  ipcRenderer.send('set-shutdown-time', time);
}

// 清除关机时间
export function clearShutdownTime(): void {
  ipcRenderer.send('clear-shutdown-time');
}
