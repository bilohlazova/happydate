import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.happydate.app',
  appName: 'HappyDate',
  webDir: 'public',
  loggingBehavior: 'debug',
  server: {
    url: 'https://happydate.vercel.app',
    cleartext: false,
    errorPath: 'native-offline.html',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
};

export default config;
