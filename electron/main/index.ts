import { electronApp } from '@electron-toolkit/utils';
import { exec } from 'child_process';
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray, nativeImage } from 'electron';
import Store from 'electron-store';
import { createRequire } from 'module';
import dayjs from 'dayjs';
import schedule from 'node-schedule';
import os from 'node:os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readConfig, writeConfig, type AppSettings } from '../utils/config';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const icon = path.join(__dirname, '../../resources/icon.ico');
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

// 使用配置文件中的设置
const settings = readConfig();

// Store 类型定义
interface StoreType {
  shutdownTime?: string;
}

// 初始化 Store
const store = new Store<StoreType>({
  defaults: {
    shutdownTime: undefined
  }
}) as any;

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let countdownWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let shutdownJob: schedule.Job | null = null;
let forceShutdownInterval: NodeJS.Timeout | null = null;
const indexHtml = path.join(RENDERER_DIST, 'index.html');

// 创建主窗口
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 515,
    show: false,
    frame: false,
    resizable: settings.debugMode === 1,
    autoHideMenuBar: true,
    icon: icon,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    const shutdownTime = store.get('shutdownTime');
    !shutdownTime && mainWindow?.show();
  });

  // 加载主页面
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(indexHtml);
  }
}

// 创建设置窗口
function createSettingsWindow(): void {
  if (settingsWindow?.isDestroyed()) {
    settingsWindow = null;
  }

  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 515,
    frame: false,
    resizable: settings.debugMode === 1,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/#settings`);
  } else {
    settingsWindow.loadFile(indexHtml, {
      hash: 'settings'
    });
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// 设置关机任务
function scheduleShutdown(time: string): void {
  try {
    // 取消现有任务
    if (shutdownJob) {
      shutdownJob.cancel();
      shutdownJob = null;
    }

    // 清除现有的强制关机检查
    if (forceShutdownInterval) {
      clearInterval(forceShutdownInterval);
      forceShutdownInterval = null;
    }

    const settings = readConfig();
    const shutdownTime = dayjs(time);
    const reminderTime = shutdownTime.subtract(settings.reminderMinutes, 'minute');
    const now = dayjs();

    // 存储关机时间
    store.set('shutdownTime', time);

    // 如果存在倒计时窗口，需要更新或关闭
    if (countdownWindow && !countdownWindow.isDestroyed()) {
      // 如果新的关机时间在提醒时间之后，更新倒计时
      if (now.isAfter(reminderTime) && now.isBefore(shutdownTime)) {
        countdownWindow.webContents.send('update-countdown', {
          shutdownTime: time,
          settings
        });
      } else {
        // 如果不在提醒时间范围内，关闭倒计时窗口
        countdownWindow.close();
        countdownWindow = null;
      }
    }
    // 如果不存在倒计时窗口，但时间在提醒范围内，创建新窗口
    else if (now.isAfter(reminderTime) && now.isBefore(shutdownTime)) {
      createCountdownWindow();
    }

    // 如果提醒时间还未到，设置提醒任务
    if (now.isBefore(reminderTime)) {
      schedule.scheduleJob(reminderTime.toDate(), () => {
        createCountdownWindow();
      });
    }

    // 设置关机任务
    shutdownJob = schedule.scheduleJob(shutdownTime.toDate(), () => {
      executeShutdown();
      startForceShutdownCheck();
    });

    // 启动强制关机检查
    startForceShutdownCheck();
  } catch (error) {
    console.error('设置关机任务失败:', error);
  }
}

// 启动强制关机检查
function startForceShutdownCheck(): void {
  // 清除现有的检查
  if (forceShutdownInterval) {
    clearInterval(forceShutdownInterval);
  }

  // 每1s检查一次
  forceShutdownInterval = setInterval(checkForceShutdown, 10 * 1000);

  // 立即执行一次检查
  checkForceShutdown();
}

// 检查是否应该强制关机
function checkForceShutdown(): void {
  const shutdownTime = store.get('shutdownTime');
  if (!shutdownTime) return;
  const config = readConfig();
  const now = dayjs();
  const scheduledTime = dayjs(shutdownTime);
  const lastDayShutdownTime = dayjs(shutdownTime).subtract(1, 'day');
  // 如果当前时间已过关机时间，执行关机
  if (
    (now.isAfter(lastDayShutdownTime) && now.isBefore(lastDayShutdownTime.add(config.forbiddenHours, 'hour'))) ||
    (now.isAfter(scheduledTime) && now.isBefore(scheduledTime.add(config.forbiddenHours, 'hour')))
  ) {
    executeShutdown();
  }
}

// 创建倒计时窗口
function createCountdownWindow(): void {
  // 如果已存在窗口但已被销毁，清除引用
  if (countdownWindow?.isDestroyed()) {
    countdownWindow = null;
  }

  // 如果窗口已存在且未被销毁，直接返回
  if (countdownWindow) {
    return;
  }

  const shutdownTime = store.get('shutdownTime');
  if (!shutdownTime) return;

  countdownWindow = new BrowserWindow({
    width: 600,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  // 设置窗口位置在右下角
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  countdownWindow.setPosition(width - 620, height - 350);

  // 在加载URL时传递关机时间参数
  const urlParams = new URLSearchParams();
  urlParams.set('shutdownTime', shutdownTime);

  if (process.env.VITE_DEV_SERVER_URL) {
    countdownWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/#/countdown?${urlParams.toString()}`);
  } else {
    countdownWindow.loadFile(indexHtml, {
      hash: `countdown?${urlParams.toString()}`
    });
  }

  countdownWindow.on('closed', () => {
    countdownWindow = null;
  });
}

// 创建系统托盘
function createTray(): void {
  try {
    // 确保图标路径正确
    const iconPath = path.join(__dirname, '../../resources/icon.png');
    console.log('Tray icon path:', iconPath); // 调试用

    // 创建托盘图标
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);

    // 设置托盘图标提示文字
    tray.setToolTip('自动关机助手');

    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          mainWindow?.show();
        }
      }
    ]);

    // 设置托盘菜单
    tray.setContextMenu(contextMenu);

    // 添加点击事件
    tray.on('click', () => {
      mainWindow?.show();
    });

    // 移除错误的错误事件监听
    tray.on('double-click', () => {
      mainWindow?.show();
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// 应用初始化
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron');

  initShutdownTime();
  // 创建窗口和托盘
  createMainWindow();
  createTray();

  const shutdownTime = store.get('shutdownTime');
  shutdownTime && scheduleShutdown(shutdownTime);

  // 添加快捷键：Ctrl+Shift+I (Windows/Linux) 或 Cmd+Shift+I (macOS) 打开开发者工具
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });

  // 同步设置到渲染进程
  const currentSettings = settings;
  mainWindow?.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('sync-settings', currentSettings);
  });
});

const initShutdownTime = () => {
  const now = dayjs();
  const shutdownTime = store.get('shutdownTime');
  if (shutdownTime && dayjs(shutdownTime).isBefore(now)) {
    // 拼接当前+ 关机时间的时间
    const oldTime = dayjs(shutdownTime);
    const newTime = now.startOf('day').add(oldTime.hour(), 'hour').add(oldTime.minute(), 'minute');
    scheduleShutdown(newTime.format('YYYY-MM-DD HH:mm:ss'));
    store.set('shutdownTime', newTime.format('YYYY-MM-DD HH:mm:ss'));
  }
};

// 确保在应用退出时注销快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC 通信处理
ipcMain.on('set-shutdown-time', (_, time: string) => {
  scheduleShutdown(time);
});

ipcMain.on('get-shutdown-time', event => {
  const time = store.get('shutdownTime');
  event.reply('shutdown-time', time);
});

ipcMain.on('clear-shutdown-time', () => {
  store.delete('shutdownTime');
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// 监听设置保存请求
ipcMain.on('save-settings', (event, settings: AppSettings) => {
  try {
    writeConfig(settings);
    const newConfig = readConfig();
    // 通知所有窗口设置已更新
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('settings-updated', newConfig);
    });

    // 重新检查关机时间和倒计时
    const shutdownTime = store.get('shutdownTime');
    if (shutdownTime) {
      scheduleShutdown(shutdownTime);
    }

    event.reply('settings-saved');
  } catch (error: any) {
    event.reply('settings-error', error.message);
  }
});

// 窗口关闭处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (countdownWindow) {
      countdownWindow.close();
      countdownWindow = null;
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-close', () => {
  mainWindow?.hide();
});

ipcMain.on('settings-window-close', () => {
  settingsWindow?.close();
});

// 改执行关机的函数
function executeShutdown(): void {
  try {
    const settings = readConfig();

    // 如果是调试模式，只打印日志
    if (settings.debugMode === 1) {
      console.log('debugMode: shutdown pc');
      return;
    }

    // 实际执行关机
    const { exec } = require('child_process');
    const isWindows = process.platform === 'win32';
    const shutdownCommand = isWindows ? 'shutdown /s /t 0' : 'shutdown now';

    exec(shutdownCommand, (error: any) => {
      if (error) {
        console.error('关机命令执行失败:', error);
      }
    });
  } catch (error) {
    console.error('执行关机操作失败:', error);
  }
}

// 添加 IPC 监器来处理倒计时窗口的关闭
ipcMain.on('close-countdown-window', () => {
  if (countdownWindow) {
    countdownWindow.close();
    countdownWindow = null;
  }
});

// 添加 IPC 处理程序来同步设置
ipcMain.on('request-settings', event => {
  try {
    const settings = readConfig();
    event.reply('settings-updated', settings);
  } catch (error: any) {
    event.reply('settings-error', error.message);
  }
});

// 确保应用退出时清理托盘
app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (forceShutdownInterval) {
    clearInterval(forceShutdownInterval);
    forceShutdownInterval = null;
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
    settingsWindow = null;
  }
});

// 监听倒计时窗口请求关机时间
ipcMain.on('request-countdown-info', event => {
  const shutdownTime = store.get('shutdownTime');
  if (shutdownTime) {
    event.reply('countdown-info', {
      shutdownTime,
      settings: readConfig()
    });
  }
});

// 监听倒计时窗口准备就绪
ipcMain.on('countdown-ready', () => {
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.show();
  }
});
