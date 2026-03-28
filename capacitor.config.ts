import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.happydate.app',
  appName: 'HappyDate',
  webDir: 'public',
  server: {
    url: 'https://happydate.vercel.app',
    cleartext: true,
  },
};

export default config;