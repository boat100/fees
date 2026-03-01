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
      description: '学生费用管理、班级费用统计、批量录入、代办费管理',
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      cardBorder: 'border-green-200 hover:border-green-400',
      href: '/fees',
      stats: stats ? [
        { label: '应交总额', value: `¥${formatAmount(stats.totalFee)}`, color: 'text-blue-600' },
        { label: '已交总额', value: `¥${formatAmount(stats.totalPaid)}`, color: 'text-green-600' },
      ] : [],
    },
    {
      title: '支出管理',
      description: '日常公用支出、人员支出管理、支出记录统计与导出',
      icon: TrendingDown,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      cardBorder: 'border-red-200 hover:border-red-400',
      href: '/expenses',
      stats: stats ? [
        { label: '支出总额', value: `¥${formatAmount(stats.totalExpense)}`, color: 'text-red-600' },
        { label: '支出记录', value: `${stats.expenseRecordCount}条`, color: 'text-orange-600' },
      ] : [],
    },
    {
      title: '后台管理',
      description: '数据统计报表、数据备份恢复、系统设置',
      icon: Settings,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      cardBorder: 'border-purple-200 hover:border-purple-400',
      href: '/admin',
      stats: stats ? [
        { label: '班级数量', value: `${stats.classCount}个`, color: 'text-purple-600' },
        { label: '学生人数', value: `${stats.studentCount}人`, color: 'text-indigo-600' },
      ] : [],
    },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-2">
              <School className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">
                学校收支管理系统
              </h1>
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
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-col overflow-hidden">
        {/* 统计概览卡片 */}
        <Card className="mb-3 shadow-sm flex-shrink-0">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              收支概览
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            {loading ? (
              <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
                加载中...
              </div>
            ) : stats ? (
              <div className="flex items-center gap-4">
                {/* 图表区域 */}
                <div className="w-64 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis 
                        tickFormatter={(value) => formatAmount(value)}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        width={40}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`¥${value.toLocaleString('zh-CN')}`, '金额']}
                        contentStyle={{ fontSize: 12, borderRadius: '6px', padding: '6px 10px' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 统计数字 */}
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="text-center bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-0.5">应交收费</p>
                    <p className="text-base font-bold text-blue-600">¥{formatAmount(stats.totalFee)}</p>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-0.5">已交收费</p>
                    <p className="text-base font-bold text-green-600">¥{formatAmount(stats.totalPaid)}</p>
                  </div>
                  <div className="text-center bg-red-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-0.5">总支出</p>
                    <p className="text-base font-bold text-red-600">¥{formatAmount(stats.totalExpense)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-28 flex flex-col items-center justify-center text-gray-400">
                <Wallet className="h-8 w-8 mb-1 opacity-50" />
                <p className="text-sm">暂无收支数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 导航卡片 */}
        <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.title}
                className={`cursor-pointer transition-all duration-300 ${module.cardBorder} hover:shadow-md hover:-translate-y-0.5 flex flex-col`}
                onClick={() => router.push(module.href)}
              >
                <CardHeader className="py-3 px-4 flex-shrink-0">
                  <div className={`w-10 h-10 rounded-lg ${module.iconBg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${module.iconColor}`} />
                  </div>
                  <CardTitle className="text-base flex items-center justify-between">
                    {module.title}
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-3 flex-1 flex flex-col justify-between">
                  <CardDescription className="text-xs text-gray-500 mb-2 line-clamp-2">
                    {module.description}
                  </CardDescription>
                  
                  {/* 模块统计 */}
                  {module.stats.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100">
                      {module.stats.map((stat, idx) => (
                        <div key={idx}>
                          <p className="text-[10px] text-gray-400">{stat.label}</p>
                          <p className={`text-xs font-semibold ${stat.color}`}>{stat.value}</p>
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
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          学校收支管理系统 · 安全可靠 · 数据本地存储
        </div>
      </footer>
    </div>
  );
}
