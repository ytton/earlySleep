import React, { useState, useEffect } from 'react';
import { CloseOutlined, FieldTimeOutlined, LockOutlined, BellOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Card, InputNumber, Typography, Button, Form, message, Divider, Input, Tooltip } from 'antd';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { getSettings, type AppSettings, saveSettings } from '../utils/settings';

const { Title, Text, Link } = Typography;
const { ipcRenderer } = window.require('electron');
const { shell } = window.require('electron');

const SettingsWindow: React.FC = () => {
  const [form] = Form.useForm<AppSettings>();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        form.setFieldsValue(settings);
      } catch (error) {
        message.error('加载设置失败');
      }
    };

    loadSettings();

    // 监听设置更新
    const handleSettingsUpdate = (_: any, settings: AppSettings) => {
      form.setFieldsValue(settings);
    };

    ipcRenderer.on('settings-updated', handleSettingsUpdate);

    return () => {
      ipcRenderer.removeListener('settings-updated', handleSettingsUpdate);
    };
  }, [form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await saveSettings(values);
      message.success('设置保存成功！');
      handleClose();
    } catch (error) {
      message.error('保存设置失败！');
    }
  };

  const handleClose = () => {
    ipcRenderer.send('settings-window-close');
  };

  // 添加链接处理函数
  const handleLinkClick = (e: React.MouseEvent<HTMLElement, MouseEvent>, url: string) => {
    e.preventDefault();
    shell.openExternal(url);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* 自定义标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b select-none">
        <div className="text-sm font-medium text-gray-700">详细设置</div>
        <button
          onClick={handleClose}
          className="p-1 text-red-500 transition-colors rounded-sm hover:bg-red-50"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <CloseOutlined />
        </button>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <PerfectScrollbar
          options={{
            suppressScrollX: false,
            wheelPropagation: false
          }}
          className="h-full"
        >
          <div className="p-4">
            <Card className="w-full rounded-sm shadow">
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  lockHours: 3,
                  forbiddenHours: 5,
                  reminderMinutes: 5
                }}
                size="large"
                className="w-full"
              >
                <div className="space-y-6">
                  <Title level={4} className="mb-6 text-center">
                    额外设置
                  </Title>

                  <Form.Item
                    label={
                      <span className="flex items-center">
                        <LockOutlined className="mr-2" />
                        <Text>禁止修改时间（小时）</Text>
                        <Tooltip title="在设置该值后，在关机时间前的指定时间范围内不能重新设置关机时间。例如：设置为3小时，则在关机前3小时内无法修改关机时间。">
                          <InfoCircleOutlined className="ml-2 text-gray-400 cursor-help" />
                        </Tooltip>
                      </span>
                    }
                    name="lockHours"
                    rules={[{ required: true, message: '请输入禁止修改时间！' }]}
                  >
                    <InputNumber className="w-full rounded-sm" min={0} max={24} placeholder="请输入小时数" />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span className="flex items-center">
                        <FieldTimeOutlined className="mr-2" />
                        <Text>二次开机时间（小时）</Text>
                        <Tooltip title="在系统关机后的指定时间内重新开机，系统会自动执行关机操作。这可以防止在设定的休息时间内重新开机工作。">
                          <InfoCircleOutlined className="ml-2 text-gray-400 cursor-help" />
                        </Tooltip>
                      </span>
                    }
                    name="forbiddenHours"
                    rules={[{ required: true, message: '请输入二次开机时间！' }]}
                  >
                    <InputNumber className="w-full rounded-sm" min={0} max={24} placeholder="请输入小时数" />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span className="flex items-center">
                        <BellOutlined className="mr-2" />
                        <Text>提前提醒时间（分钟）</Text>
                      </span>
                    }
                    name="reminderMinutes"
                    rules={[{ required: true, message: '请输入提醒时间！' }]}
                  >
                    <InputNumber className="w-full rounded-sm" min={1} max={60} placeholder="请输入分钟数" />
                  </Form.Item>

                  <Divider orientation="left">天气设置</Divider>
                  <Form.Item
                    label={
                      <span className="flex items-center">
                        <Text>和风天气 API Key</Text>
                        <Tooltip
                          title={
                            <div>
                              <p>请前往和风天气开发平台注册并获取 API Key</p>
                              <Link
                                href="https://dev.qweather.com/"
                                target="_blank"
                                className="text-blue-400 hover:text-blue-500"
                                onClick={e => handleLinkClick(e, 'https://dev.qweather.com/')}
                              >
                                立即前往注册 →
                              </Link>
                            </div>
                          }
                        >
                          <InfoCircleOutlined className="ml-2 text-gray-400 cursor-help" />
                        </Tooltip>
                      </span>
                    }
                    name="weatherKey"
                    rules={[{ required: true, message: '请输入和风天气 API Key' }]}
                  >
                    <Input placeholder="请输入和风天气 API Key" />
                  </Form.Item>
                  <Form.Item
                    label="城市 ID"
                    name="weatherLocation"
                    rules={[{ required: true, message: '请输入城市 ID' }]}
                    extra={
                      <span className="text-gray-500">
                        城市 ID 可在
                        <Link
                          href="https://github.com/qwd/LocationList/blob/master/China-City-List-latest.csv"
                          target="_blank"
                          className="mx-1"
                          onClick={e =>
                            handleLinkClick(
                              e,
                              'https://github.com/qwd/LocationList/blob/master/China-City-List-latest.csv'
                            )
                          }
                        >
                          和风天气城市列表
                        </Link>
                        中查询获取
                      </span>
                    }
                  >
                    <Input placeholder="请输入城市 ID" />
                  </Form.Item>

                  <Button type="primary" onClick={handleSubmit} size="large" className="w-full rounded-sm">
                    保存设置
                  </Button>
                </div>
              </Form>
            </Card>
          </div>
        </PerfectScrollbar>
      </div>
    </div>
  );
};

export default SettingsWindow;
