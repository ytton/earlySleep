import * as fs from 'fs';
import * as ini from 'ini';
import * as path from 'path';
import { app } from 'electron';

export interface AppSettings {
  lockHours: number;
  forbiddenHours: number;
  reminderMinutes: number;
  weatherKey: string;
  weatherLocation: string;
  debugMode: number;
}

// 获取配置文件路径
function getConfigPath(): string {
  // 开发环境下从项目根目录读取
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'config.ini');
  }
  // 生产环境下从应用目录读取
  return path.join(app.getPath('exe'), '../config.ini');
}

// 读取配置文件
export function readConfig(): AppSettings {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error('配置文件不存在！');
  }

  const config = ini.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!config.Settings || !config.Debug) {
    throw new Error('配置文件格式错误！');
  }

  return {
    lockHours: Number(config.Settings.lockHours),
    forbiddenHours: Number(config.Settings.forbiddenHours),
    reminderMinutes: Number(config.Settings.reminderMinutes),
    weatherKey: config.Settings.weatherKey,
    weatherLocation: config.Settings.weatherLocation,
    debugMode: Number(config.Debug.debugMode)
  };
}

// 保存配置文件
export function writeConfig(newSettings: Partial<AppSettings>): void {
  const configPath = getConfigPath();

  // 读取现有配置
  const existingConfig = ini.parse(fs.readFileSync(configPath, 'utf-8')) as {
    Settings: {
      lockHours: number;
      forbiddenHours: number;
      reminderMinutes: number;
      weatherKey: string;
      weatherLocation: string;
      debugMode: number;
    };
    Debug: {
      debugMode: number;
    };
  };

  // 准备新的配置对象
  const config = {
    Settings: {
      ...existingConfig.Settings,
      ...(newSettings.lockHours !== undefined && { lockHours: newSettings.lockHours }),
      ...(newSettings.forbiddenHours !== undefined && { forbiddenHours: newSettings.forbiddenHours }),
      ...(newSettings.reminderMinutes !== undefined && { reminderMinutes: newSettings.reminderMinutes }),
      ...(newSettings.weatherKey !== undefined && { weatherKey: newSettings.weatherKey }),
      ...(newSettings.weatherLocation !== undefined && { weatherLocation: newSettings.weatherLocation })
    },
    Debug: {
      ...existingConfig.Debug,
      ...(newSettings.debugMode !== undefined && { debugMode: newSettings.debugMode })
    }
  };

  // 写入配置文件
  fs.writeFileSync(configPath, ini.stringify(config));
}
