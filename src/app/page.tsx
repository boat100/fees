'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthToken, authFetch } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingDown, 
  Settings, 
  LogOut,
  School,
  ArrowRight,
  Users,
  FileText,
  Wallet
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
    { name: '应交', value: stats.totalFee, fill: '#3b82f6' },
    { name: '已交', value: stats.totalPaid, fill: '#22c55e' },
    { name: '支出', value: stats.totalExpense, fill: '#ef4444' },
  ] : [];

  // 导航模块配置
  const modules = [
    {
      title: '收费管理',
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      cardBorder: 'border-green-200 hover:border-green-400',
      hoverShadow: 'hover:shadow-green-100',
      href: '/fees',
      stats: stats ? [
        { label: '应交', value: `¥${formatAmount(stats.totalFee)}`, color: 'text-blue-600' },
        { label: '已交', value: `¥${formatAmount(stats.totalPaid)}`, color: 'text-green-600' },
      ] : [],
    },
    {
      title: '支出管理',
      icon: TrendingDown,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      cardBorder: 'border-red-200 hover:border-red-400',
      hoverShadow: 'hover:shadow-red-100',
      href: '/expenses',
      stats: stats ? [
        { label: '支出', value: `¥${formatAmount(stats.totalExpense)}`, color: 'text-red-600' },
        { label: '记录', value: `${stats.expenseRecordCount}条`, color: 'text-orange-600' },
      ] : [],
    },
    {
      title: '后台管理',
      icon: Settings,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      cardBorder: 'border-purple-200 hover:border-purple-400',
      hoverShadow: 'hover:shadow-purple-100',
      href: '/admin',
      stats: stats ? [
        { label: '班级', value: `${stats.classCount}个`, color: 'text-purple-600' },
        { label: '学生', value: `${stats.studentCount}人`, color: 'text-indigo-600' },
      ] : [],
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* 顶部导航栏 - 固定高度 */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <School className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">学校收支管理系统</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-8 w-8"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* 主内容区域 - 自适应填充 */}
      <main className="flex-1 overflow-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 h-full flex flex-col gap-4">
          
          {/* 上部：收支概览 */}
          <Card className="shadow-md flex-shrink-0">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                收支概览
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {loading ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                  加载中...
                </div>
              ) : stats ? (
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* 图表区域 */}
                  <div className="h-32 lg:h-36 lg:w-1/2 xl:w-3/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} />
                        <YAxis 
                          tickFormatter={(value) => formatAmount(value)}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          width={50}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`¥${value.toLocaleString('zh-CN')}`, '金额']}
                          contentStyle={{ borderRadius: '6px', fontSize: '12px' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* 统计数字 */}
                  <div className="flex-1 grid grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-3 content-center">
                    <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
                      <p className="text-xs text-gray-500">应交收费</p>
                      <p className="text-sm lg:text-base font-bold text-blue-600">¥{formatAmount(stats.totalFee)}</p>
                    </div>
                    <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
                      <p className="text-xs text-gray-500">已交收费</p>
                      <p className="text-sm lg:text-base font-bold text-green-600">¥{formatAmount(stats.totalPaid)}</p>
                    </div>
                    <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
                      <p className="text-xs text-gray-500">总支出</p>
                      <p className="text-sm lg:text-base font-bold text-red-600">¥{formatAmount(stats.totalExpense)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                  <Wallet className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 下部：功能模块 - 自适应填充 */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Card
                  key={module.title}
                  className={`cursor-pointer transition-all duration-300 ${module.cardBorder} ${module.hoverShadow} hover:shadow-lg hover:-translate-y-0.5 flex flex-col`}
                  onClick={() => router.push(module.href)}
                >
                  <CardHeader className="py-3 px-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${module.iconBg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${module.iconColor}`} />
                        </div>
                        <CardTitle className="text-base">{module.title}</CardTitle>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4 flex-1 flex items-end">
                    {module.stats.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        {module.stats.map((stat, idx) => (
                          <div key={idx} className="text-center">
                            <p className="text-xs text-gray-400">{stat.label}</p>
                            <p className={`text-sm font-semibold ${stat.color}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 底部信息 - 固定高度 */}
          <footer className="flex-shrink-0 text-center text-xs text-gray-400 py-2">
            学校收支管理系统 · 数据本地存储
          </footer>
        </div>
      </main>
    </div>
  );
}
