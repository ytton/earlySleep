import { CloudOutlined, CompassOutlined, PoweroffOutlined } from '@ant-design/icons';
import { Button, Progress, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { getTomorrowWeather, type WeatherData } from '../services/weather';
import { AppSettings, getSettings } from '../utils/settings';

const { Text } = Typography;
const { ipcRenderer } = window.require('electron');

const SLEEP_QUOTES = [
  '早睡早起，让明天的自己更加精力充沛',
  '优质的睡眠是最好的养生方式',
  '早睡是送给自己最好的礼物',
  '规律作息，让生活更有质量',
  '今天早睡，明天早起，开启美好的一天',
  '好的睡眠是健康生活的基石',
  '早睡让身心都得到最好的休息',
  '珍惜睡眠时光，为明天储备能量',
  '保持良好作息，让生活更有规律',
  '早睡让大脑得到充分休息，提高工作效率',
  '睡个好觉，让明天的自己更加出色',
  '规律作息是对自己最好的投资',
  '早睡让身体和心灵都得到滋养',
  '好的作息习惯让生活更加美好',
  '珍惜每一个早睡的机会，让生活更有质量',
  '熬夜是在透支未来，早睡是在投资人生',
  '充足的睡眠让你的皮肤更加年轻',
  '早睡是一种自我关爱的表现',
  '想要明天更有活力，今晚就要早点休息',
  '睡眠质量决定生活质量，早睡很重要',
  '给自己一个舒适的睡眠时间，你值得拥有',
  '早睡是对身体最温柔的关怀',
  '让睡眠成为每天最美好的期待',
  '规律作息，让生活更有节奏感',
  '早睡是一种生活智慧，也是一种健康习惯',
  '今晚早睡，明天精神百倍',
  '睡眠是身体最好的修复时光',
  '拒绝熬夜，选择健康，从早睡开始',
  '早睡让你的大脑得到充分休息，记忆力更好',
  '好的睡眠让你的免疫力更强',
  '早睡是对自己最温柔的承诺',
  '每一个早睡的夜晚，都是对健康的投资',
  '让早睡成为生活中最甜蜜的习惯',
  '早睡让你的心情更加愉悦',
  '充足的睡眠是保持身心健康的秘诀',
  '早睡让你的生活更有规律，工作更有效率',
  '给自己一个优质的睡眠，让明天更美好',
  '早睡是一种生活态度，也是一种健康选择',
  '好的作息让你的生活更有质感',
  '早睡是对自己负责，也是对家人负责'
];

const CountdownWindow: React.FC = () => {
  const [countdown, setCountdown] = useState<number>(0);
  const [percent, setPercent] = useState<number>(100);
  const [quote, setQuote] = useState<string>("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 创建更新倒计时的函数
  const setupCountdown = useCallback((shutdownTime: string, settings: AppSettings) => {
    // 清除现有的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 计算初始倒计时
    const now = dayjs();
    const end = dayjs(shutdownTime);
    const secondsLeft = end.diff(now, 'second');
    const totalSeconds = settings.reminderMinutes * 60;
    
    // 设置初始值
    setCountdown(secondsLeft);
    setPercent(Math.min((secondsLeft / totalSeconds) * 100, 100));
    
    // 设置新的定时器
    intervalRef.current = setInterval(() => {
      const now = dayjs();
      const end = dayjs(shutdownTime);
      const secondsLeft = end.diff(now, 'second');
      
      if (secondsLeft <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setCountdown(0);
        setPercent(0);
      } else {
        setCountdown(secondsLeft);
        const percentLeft = Math.min((secondsLeft / totalSeconds) * 100, 100);
        setPercent(percentLeft);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    // 随机选择一条鼓励文案
    setQuote(SLEEP_QUOTES[Math.floor(Math.random() * SLEEP_QUOTES.length)]);

    // 监听倒计时更新
    ipcRenderer.on('update-countdown', (_, data: { shutdownTime: string, settings: AppSettings }) => {
      const { shutdownTime, settings } = data;
      setupCountdown(shutdownTime, settings);
    });

    // 获取关机时间和设置
    const initializeCountdown = async () => {
      try {
        ipcRenderer.send('request-countdown-info');
        
        ipcRenderer.once('countdown-info', (_, data: { shutdownTime: string, settings: AppSettings }) => {
          const { shutdownTime, settings } = data;
          setupCountdown(shutdownTime, settings);
          setIsInitialized(true);
          ipcRenderer.send('countdown-ready');
        });

        // 获取天气数据
        const settings = await getSettings();
        if (settings.weatherKey && settings.weatherLocation) {
          const data = await getTomorrowWeather({
            key: settings.weatherKey,
            location: settings.weatherLocation
          });
          setWeatherData(data);
        }
      } catch (error) {
        console.error('初始化倒计时失败:', error);
      }
    };

    initializeCountdown();

    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      ipcRenderer.removeAllListeners('update-countdown');
    };
  }, [setupCountdown]);

  // 只在初始化完成后渲染内容
  if (!isInitialized) {
    return null;
  }

  const handleClose = () => {
    ipcRenderer.send('close-countdown-window');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex w-screen h-screen bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-sm">
      {/* 左侧倒计时区域 */}
      <div className="flex flex-col w-[160px] border-r border-white/10">
        <div className="flex flex-col items-center justify-center flex-1 px-6">
          <div className="relative w-24 h-24 mb-4">
            <Progress
              type="circle"
              percent={percent}
              showInfo={false}
              strokeColor="#fff"
              trailColor="rgba(255,255,255,0.2)"
              strokeWidth={4}
              size={96}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <PoweroffOutlined className="text-3xl text-white" />
            </div>
          </div>

          <Text className="mb-2 text-2xl font-medium text-white">{formatTime(countdown)}</Text>
          <Text className="text-white/80">系统即将关机</Text>
        </div>
      </div>

      {/* 右侧天气和提示区域 */}
      <div className="flex-1 bg-white/95">
        <PerfectScrollbar
          options={{
            suppressScrollX: true,
            wheelPropagation: false
          }}
          className="h-full"
        >
          <div className="p-4 space-y-4">
            {/* 天气信息卡片 */}
            <div className="p-4 transition-all border-0 rounded-sm shadow-lg bg-gradient-to-br from-blue-50 via-white to-blue-50">
              <div className="flex items-center mb-3">
                <CloudOutlined className="mr-2 text-xl text-blue-500" />
                <Text className="text-lg font-medium text-gray-800">明日天气</Text>
              </div>
              {weatherData ? (
                <div className="space-y-3">
                  <Text className="block text-xl font-medium text-gray-700">
                    {weatherData.text} {weatherData.temp}
                  </Text>
                  <div className="pt-2 space-y-2 border-t border-blue-100">
                    <Text className="block text-gray-600">
                      <CompassOutlined className="mr-2 text-blue-400" />
                      {weatherData.windDir} {weatherData.windScale}级
                    </Text>
                    <Text className="block text-gray-600">
                      <span className="inline-block w-5 h-5 mr-2 text-center text-blue-400">💧</span>
                      相对湿度 {weatherData.humidity}%
                    </Text>
                  </div>
                </div>
              ) : (
                <Text className="text-gray-400">暂无天气数据</Text>
              )}
            </div>

            {/* 早睡提示卡片 */}
            <div className="p-4 transition-all border-0 rounded-sm shadow-lg bg-gradient-to-br from-purple-50 via-white to-blue-50">
              <div className="relative">
                <div className="absolute text-4xl -top-1 -right-1 opacity-20">✨</div>
                <div className="absolute right-0 text-3xl -bottom-1 opacity-15">🌙</div>
                <Text
                  className="block text-lg font-medium leading-relaxed text-gray-700"
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    letterSpacing: '0.5px',
                    lineHeight: 1.6
                  }}
                >
                  {quote}
                </Text>
              </div>
            </div>
          </div>
        </PerfectScrollbar>
      </div>
    </div>
  );
};

export default CountdownWindow;
