import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './index.css';
// 设置 dayjs 的语言为中文（antd 的 TimePicker 等组件依赖 dayjs）
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { router } from './renderer/src/router';
dayjs.locale('zh-cn');

// Ant Design 5 主题配置
const theme = {
  token: {
    borderRadius: 2, // 统一设置圆角大小
    colorPrimary: '#1677ff'
  }
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>
);
