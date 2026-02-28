'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthToken } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingDown, 
  Settings, 
  LogOut,
  School,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // 退出登录
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      clearAuthToken();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // 导航模块配置
  const modules = [
    {
      title: '学校收费费用',
      description: '学生费用管理、班级费用统计、批量录入交费记录、代办费管理',
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      cardBorder: 'border-green-200 hover:border-green-400',
      hoverShadow: 'hover:shadow-green-100',
      href: '/fees',
    },
    {
      title: '学校支出费用',
      description: '日常公用支出、人员支出管理、支出记录统计与导出',
      icon: TrendingDown,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      cardBorder: 'border-red-200 hover:border-red-400',
      hoverShadow: 'hover:shadow-red-100',
      href: '/expenses',
    },
    {
      title: '后台管理',
      description: '数据统计报表、数据备份恢复、系统设置',
      icon: Settings,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      cardBorder: 'border-purple-200 hover:border-purple-400',
      hoverShadow: 'hover:shadow-purple-100',
      href: '/admin',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <School className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                学校收支管理系统
              </h1>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-gray-400 text-gray-600 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 欢迎区域 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            欢迎使用学校收支管理系统
          </h2>
          <p className="text-gray-600 text-lg">
            请选择要进入的功能模块
          </p>
        </div>

        {/* 导航卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.title}
                className={`cursor-pointer transition-all duration-300 ${module.cardBorder} ${module.hoverShadow} hover:shadow-xl hover:-translate-y-1`}
                onClick={() => router.push(module.href)}
              >
                <CardHeader className="pb-4">
                  <div className={`w-16 h-16 rounded-2xl ${module.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`h-8 w-8 ${module.iconColor}`} />
                  </div>
                  <CardTitle className="text-xl flex items-center justify-between">
                    {module.title}
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600">
                    {module.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 快捷入口 */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm mb-4">快捷入口</p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/stats')}
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              查看收支统计
            </Button>
          </div>
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          学校收支管理系统 · 安全可靠 · 数据本地存储
        </div>
      </footer>
    </div>
  );
}
