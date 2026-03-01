'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthToken, authFetch } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    { name: '应交收费', value: stats.totalFee },
    { name: '已交收费', value: stats.totalPaid },
    { name: '总支出', value: stats.totalExpense },
  ] : [];

  // 导航模块配置
  const modules = [
    {
      title: '收费管理',
      description: '学生费用管理、班级费用统计、批量录入',
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
      description: '日常公用支出、人员支出管理',
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
      description: '数据备份恢复、系统设置',
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 顶部导航栏 */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="h-7 w-7 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">学校收支管理系统</h1>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700"
            title="退出登录"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 主内容区域 - 自适应填充 */}
      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-6 py-4 flex flex-col gap-4">
        {/* 统计概览区域 - 左右布局 */}
        <div className="flex-shrink-0 flex gap-4 h-48">
          {/* 左侧：图表 */}
          <Card className="flex-1 shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                收支概览
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              {loading ? (
                <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
                  加载中...
                </div>
              ) : stats ? (
                <div className="flex h-28">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis 
                          tickFormatter={(v) => formatAmount(v)} 
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          width={45}
                        />
                        <Tooltip 
                          formatter={(v: number) => [`¥${v.toLocaleString()}`, '金额']}
                          contentStyle={{ fontSize: 12, borderRadius: 6 }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          <Cell fill="#3b82f6" />
                          <Cell fill="#22c55e" />
                          <Cell fill="#ef4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：数字统计 */}
          <Card className="w-72 shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">数据统计</CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              {stats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500">应交收费</p>
                    <p className="text-lg font-bold text-blue-600">¥{formatAmount(stats.totalFee)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500">已交收费</p>
                    <p className="text-lg font-bold text-green-600">¥{formatAmount(stats.totalPaid)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500">总支出</p>
                    <p className="text-lg font-bold text-red-600">¥{formatAmount(stats.totalExpense)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500">欠费金额</p>
                    <p className="text-lg font-bold text-orange-600">¥{formatAmount(stats.totalUnpaid)}</p>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                  加载中...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 功能模块卡片 */}
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.title}
                className={`cursor-pointer transition-all duration-300 flex flex-col ${module.cardBorder} ${module.hoverShadow} hover:shadow-lg hover:-translate-y-0.5`}
                onClick={() => router.push(module.href)}
              >
                <CardHeader className="py-4 px-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${module.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-6 w-6 ${module.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{module.title}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 mt-0.5 truncate">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 px-4 pb-4 flex-1 flex items-end">
                  {module.stats.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {module.stats.map((stat, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-2 text-center">
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
      </main>

      {/* 底部信息 */}
      <footer className="flex-shrink-0 py-2 border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-400">
          学校收支管理系统 · 安全可靠 · 数据本地存储
        </div>
      </footer>
    </div>
  );
}
