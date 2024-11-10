import { createHashRouter } from 'react-router-dom';
import MainWindow from './windows/MainWindow';
import SettingsWindow from './windows/SettingsWindow';
import CountdownWindow from './windows/CountdownWindow';

export const router = createHashRouter([
  {
    path: '/',
    element: <MainWindow />
  },
  {
    path: '/settings',
    element: <SettingsWindow />
  },
  {
    path: '/countdown',
    element: <CountdownWindow />
  }
]);
