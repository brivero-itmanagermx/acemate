import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ace-green':    '#C5F135',
        'lime-light':   '#EEFF88',
        'rally-orange': '#FF7F2D',
        'orange-light': '#FFB380',
        'am-grass':     '#4a8c3f',
        'am-surface':   '#222222',
        'am-card':      '#1a1a1a',
        'am-border':    '#333333',
        'am-bg':        '#111111',
      },
    },
  },
  plugins: [],
};

export default config;
