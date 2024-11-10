import React, { useState, useEffect } from 'react';
import {
  SettingOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Select, Button, Typography, Card, message, Statistic } from 'antd';
import dayjs from 'dayjs';
import { setShutdownTime, getShutdownTime, type AppSettings, getSettings } from '../utils/settings';

const { Title, Text } = Typography;
const { Option } = Select;
const { ipcRenderer } = window.require('electron');

const MainWindow: React.FC = () => {
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [selectedMinute, setSelectedMinute] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getSettings();
        setCurrentSettings(settings);

        const shutdownTime = await getShutdownTime();
        if (shutdownTime) {
          const time = dayjs(shutdownTime);
          setSelectedHour(time.format('HH'));
          setSelectedMinute(time.format('mm'));
          setSelectedTime(shutdownTime);
        }

        checkTimeLock(settings);
      } catch (error) {
        message.error('加载设置失败');
      }
    };

    loadData();

    const handleSettingsUpdate = (_: any, settings: AppSettings) => {
      setCurrentSettings(settings);
      checkTimeLock(settings);
    };

    ipcRenderer.on('settings-updated', handleSettingsUpdate);

    return () => {
      ipcRenderer.removeListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  const checkTimeLock = async (settings: AppSettings) => {
    const shutdownTime = await getShutdownTime();
    const lockHours = settings.lockHours;

    if (lockHours === 0 || !shutdownTime) {
      setIsDisabled(false);
      return;
    }

    const shutdownMoment = dayjs(shutdownTime);
    const now = dayjs();
    const lockTime = shutdownMoment.subtract(lockHours, 'hour');

    setIsDisabled(now.isAfter(lockTime));
  };

  const handleTimeChange = (hour: string, minute: string) => {
    if (hour && minute) {
      const today = dayjs().format('YYYY-MM-DD');
      let finalDateTime = dayjs(`${today} ${hour}:${minute}:00`);

      if (finalDateTime.isBefore(dayjs())) {
        finalDateTime = finalDateTime.add(1, 'day');
      }

      setSelectedTime(finalDateTime.format('YYYY-MM-DDTHH:mm:ss'));
    }
  };

  const handleSubmit = () => {
    if (selectedTime && currentSettings) {
      setShutdownTime(selectedTime);
      message.success('关机时间设置成功！');
      checkTimeLock(currentSettings);
    }
  };

  const handleHourChange = (value: string) => {
    setSelectedHour(value);
    if (selectedMinute) {
      handleTimeChange(value, selectedMinute);
    }

    const minuteSelect = document.querySelector('.minute-select .ant-select-selector') as HTMLElement;
    if (minuteSelect) {
      setTimeout(() => {
        minuteSelect.click();
      }, 100);
    }
  };

  const handleMinuteChange = (value: string) => {
    setSelectedMinute(value);
    if (selectedHour) {
      handleTimeChange(selectedHour, value);
    }
  };

  const openSettings = () => {
    ipcRenderer.send('open-settings');
  };

  const handleClose = () => {
    ipcRenderer.send('window-close');
  };

  const handleReload = () => {
    window.location.reload();
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="flex flex-col w-screen h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div
        className="flex items-center justify-between px-4 py-2 bg-white border-b select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="text-sm font-medium text-gray-700">自动关机助手</div>
        <div className="flex items-center space-x-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {currentSettings?.debugMode === 1 && (
            <button
              onClick={handleReload}
              className="p-1 text-blue-500 transition-colors rounded-sm hover:bg-blue-50"
              title="刷新页面"
            >
              <ReloadOutlined />
            </button>
          )}
          <button
            onClick={openSettings}
            className="p-1 text-gray-600 transition-colors rounded-sm hover:bg-gray-100"
            title="设置"
          >
            <SettingOutlined />
          </button>
          <button onClick={handleClose} className="p-1 text-red-500 transition-colors rounded-sm hover:bg-red-50">
            <CloseOutlined />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center flex-1 p-4">
        <Card className="w-full h-full rounded-sm shadow">
          <div className="mb-4 text-center">
            <PoweroffOutlined className="text-5xl text-blue-500 " />
            <Title className="mt-3" level={4}>
              定时关机
            </Title>
          </div>
          {selectedTime ? (
            <div className="p-4 bg-blue-50">
              <Statistic
                title={<Text className="text-gray-600">预计关机时间</Text>}
                value={dayjs(selectedTime).format('HH:mm')}
                prefix={<ClockCircleOutlined />}
                className="text-center"
              />
              <Text type="secondary" className="block mt-2 text-center">
                {dayjs(selectedTime).format('YYYY年MM月DD日')}
              </Text>
            </div>
          ) : (
            <div className="p-4 bg-blue-50">
              <div className="mb-4 text-center">
                <Text className="text-gray-600">预计关机时间</Text>
              </div>
              <div className="text-center" style={{ height: '32px' }}>
                <Text type="secondary">
                  <ClockCircleOutlined className="mr-2" />
                  请选择关机时间
                </Text>
              </div>
              <div className="mt-2 text-center">
                <Text type="secondary">&nbsp;</Text>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center flex-1 p-2 rounded-sm bg-gray-50">
                <Select
                  placeholder="00"
                  onChange={handleHourChange}
                  value={selectedHour || undefined}
                  disabled={isDisabled}
                  size="large"
                  bordered={false}
                  className="flex-1 text-center hour-select"
                >
                  {hours.map(hour => (
                    <Option key={hour} value={hour}>
                      {hour}
                    </Option>
                  ))}
                </Select>
                <span className="mx-1 text-xl text-gray-400">:</span>
                <Select
                  placeholder="00"
                  onChange={handleMinuteChange}
                  value={selectedMinute || undefined}
                  disabled={isDisabled}
                  size="large"
                  bordered={false}
                  className="flex-1 text-center minute-select"
                >
                  {minutes.map(minute => (
                    <Option key={minute} value={minute}>
                      {minute}
                    </Option>
                  ))}
                </Select>
              </div>
              <Button
                type="primary"
                icon={<PoweroffOutlined />}
                onClick={handleSubmit}
                disabled={isDisabled}
                size="large"
                className="h-[56px]  rounded-sm"
                danger
              >
                确认设置
              </Button>
            </div>

            {isDisabled && (
              <div className="p-3 text-center bg-red-50">
                <Text type="danger">
                  <ClockCircleOutlined className="mr-1" />
                  距离关机时间太近，无法修改设置
                </Text>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MainWindow;
