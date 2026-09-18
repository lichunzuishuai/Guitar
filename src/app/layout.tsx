import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stringline Studio · 在线吉他谱编辑器',
  description: '创建、编辑、播放和保存你的吉他曲谱。',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
