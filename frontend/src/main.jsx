import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from "react-router-dom";
import { MotionConfig } from 'framer-motion';
import './index.css'

import router from './router/router';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { UploadProvider } from './context/UploadContext';
import { HomeFeedProvider } from './context/HomeFeedContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user" makes every framer-motion animation in Devs Mode
        respect the visitor's OS "reduce motion" setting automatically */}
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <UploadProvider>
                <HomeFeedProvider>
                  <RouterProvider router={router} />
                </HomeFeedProvider>
              </UploadProvider>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>
);