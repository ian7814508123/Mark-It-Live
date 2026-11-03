import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ian.markitlive',
  appName: 'Mark It Live',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
