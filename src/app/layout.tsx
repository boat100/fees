import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '学校收支管理系统',
    template: '%s | 学校收支管理系统',
  },
  description:
    '学校收支管理系统 - 学生费用收取、学校支出记录与统计、数据管理的综合平台',
  keywords: [
    '学校收支管理',
    '学生收费',
    '支出管理',
    '财务管理',
    '学校管理',
  ],
  authors: [{ name: 'School Finance Team' }],
  openGraph: {
    title: '学校收支管理系统',
    description:
      '学校收支管理系统 - 学生费用收取、学校支出记录与统计、数据管理的综合平台',
    siteName: '学校收支管理系统',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
