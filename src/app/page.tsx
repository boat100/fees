'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, clearAuthToken, authFetch } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingDown, 
  Settings, 
  LogOut,
  School,
  Users,
  FileText,
  Wallet,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// 统计数据类型
interface DashboardStats {
  totalFee: number;
  totalPaid: number;
  totalUnpaid: number;
  studentCount: number;
  classCount: number;
  totalExpense: number;
  expenseRecordCount: number;
  feeBreakdown: {
    tuition: { fee: number; paid: number };
    lunch: { fee: number; paid: number };
    nap: { fee: number; paid: number };
    afterSchool: { fee: number; paid: number };
    club: { fee: number; paid: number };
    agency: { fee: number; paid: number };
  };
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      fetchStats();
    }
  }, [router]);

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const response = await authFetch('/api/dashboard/stats');
      const result = await response.json();
      if (response.ok && result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // 准备图表数据
  const chartData = stats ? [
    { name: '应交收费', value: stats.totalFee },
    { name: '已交收费', value: stats.totalPaid },
    { name: '总支出', value: stats.totalExpense },
  ] : [];

  // 导航菜单配置
  const navItems = [
    {
      title: '收费管理',
      subtitle: '学生费用',
      href: '/fees',
      icon: DollarSign,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-50',
      hoverShadow: 'hover:shadow-emerald-200',
      borderColor: 'border-emerald-300',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-green-500',
    },
    {
      title: '支出管理',
      subtitle: '财务支出',
      href: '/expenses',
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-600',
      bgGradient: 'from-rose-50 to-red-50',
      hoverShadow: 'hover:shadow-rose-200',
      borderColor: 'border-rose-300',
      iconBg: 'bg-gradient-to-br from-rose-400 to-red-500',
    },
    {
      title: '后台管理',
      subtitle: '系统设置',
      href: '/admin',
      icon: Settings,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
      hoverShadow: 'hover:shadow-violet-200',
      borderColor: 'border-violet-300',
      iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左侧：Logo + 系统名称 */}
            <div className="flex items-center gap-3">
              <School className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                学校收支管理系统
              </h1>
            </div>
            
            {/* 右侧：退出按钮 */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="退出登录"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 醒目的模块导航区域 */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-xl border-2 
                    bg-gradient-to-r ${item.bgGradient} ${item.borderColor} ${item.hoverShadow}
                    hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5
                    transition-all duration-200 ease-out
                    ${isActive ? 'ring-2 ring-offset-2 ring-blue-400' : ''}
                  `}
                >
                  {/* 图标区域 */}
                  <div className={`
                    flex-shrink-0 w-14 h-14 rounded-xl ${item.iconBg}
                    flex items-center justify-center shadow-md
                  `}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  
                  {/* 文字区域 */}
                  <div className="flex-1 text-left">
                    <h3 className={`text-lg font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{item.subtitle}</p>
                  </div>
                  
                  {/* 箭头图标 */}
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 移动端导航菜单 - 简化版 */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-2">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                onClick={() => router.push(item.href)}
                className={`gap-1.5 shrink-0 ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* 主内容区域 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎区域 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            欢迎使用学校收支管理系统
          </h2>
          <p className="text-gray-500">
            通过顶部导航栏进入各功能模块
          </p>
        </div>

        {/* 统计概览卡片 */}
        <Card className="mb-8 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              收支概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">
                加载中...
              </div>
            ) : stats ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 13, fill: '#374151' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatAmount(value)}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`¥${value.toLocaleString('zh-CN')}`, '金额']}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Bar 
                        dataKey="value" 
                        name="金额"
                        radius={[6, 6, 0, 0]}
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 统计数字 */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">应交收费</p>
                    <p className="text-2xl font-bold text-blue-600">¥{formatAmount(stats.totalFee)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">已交收费</p>
                    <p className="text-2xl font-bold text-green-600">¥{formatAmount(stats.totalPaid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">总支出</p>
                    <p className="text-2xl font-bold text-red-600">¥{formatAmount(stats.totalExpense)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <Wallet className="h-12 w-12 mb-3 opacity-50" />
                <p>暂无收支数据</p>
                <p className="text-sm mt-1">请先添加学生或支出记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快捷统计卡片 */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/fees')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">学生人数</p>
                    <p className="text-xl font-bold text-gray-900">{stats.studentCount}人</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/fees')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <School className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">班级数量</p>
                    <p className="text-xl font-bold text-gray-900">{stats.classCount}个</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/fees')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">欠费金额</p>
                    <p className="text-xl font-bold text-orange-600">¥{formatAmount(stats.totalUnpaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/expenses')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">支出记录</p>
                    <p className="text-xl font-bold text-gray-900">{stats.expenseRecordCount}条</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* 底部信息 */}
      <footer className="mt-8 py-6 border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          学校收支管理系统 · 安全可靠 · 数据本地存储
        </div>
      </footer>
    </div>
  );
}
