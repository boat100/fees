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
      if (response.ok) {
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
    {
      name: '应交收费',
      value: stats.totalFee,
      fill: '#3b82f6',
    },
    {
      name: '已交收费',
      value: stats.totalPaid,
      fill: '#22c55e',
    },
    {
      name: '总支出',
      value: stats.totalExpense,
      fill: '#ef4444',
    },
  ] : [];

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: { fill: string } }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p style={{ color: payload[0].payload.fill }}>
            金额: ¥{payload[0].value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  // 导航模块配置
  const modules = [
    {
      title: '收费管理',
      description: '学生费用管理、班级费用统计、批量录入交费记录、代办费管理',
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      cardBorder: 'border-green-200 hover:border-green-400',
      hoverShadow: 'hover:shadow-green-100',
      href: '/fees',
      stats: stats ? [
        { label: '应交总额', value: `¥${formatAmount(stats.totalFee)}`, icon: Wallet, color: 'text-blue-600' },
        { label: '已交总额', value: `¥${formatAmount(stats.totalPaid)}`, icon: DollarSign, color: 'text-green-600' },
      ] : [],
    },
    {
      title: '支出管理',
      description: '日常公用支出、人员支出管理、支出记录统计与导出',
      icon: TrendingDown,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      cardBorder: 'border-red-200 hover:border-red-400',
      hoverShadow: 'hover:shadow-red-100',
      href: '/expenses',
      stats: stats ? [
        { label: '支出总额', value: `¥${formatAmount(stats.totalExpense)}`, icon: TrendingDown, color: 'text-red-600' },
        { label: '支出记录', value: `${stats.expenseRecordCount}条`, icon: FileText, color: 'text-orange-600' },
      ] : [],
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
      stats: stats ? [
        { label: '班级数量', value: `${stats.classCount}个`, icon: Users, color: 'text-purple-600' },
        { label: '学生人数', value: `${stats.studentCount}人`, icon: Users, color: 'text-indigo-600' },
      ] : [],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
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

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎区域 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            欢迎使用学校收支管理系统
          </h2>
          <p className="text-gray-500">
            请选择要进入的功能模块
          </p>
        </div>

        {/* 统计概览卡片 */}
        {!loading && stats && (
          <Card className="mb-8 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                收支概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 14, fill: '#374151' }}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatAmount(value)}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#d1d5db' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      radius={[6, 6, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* 统计数字 */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">应交收费</p>
                  <p className="text-xl font-bold text-blue-600">¥{formatAmount(stats.totalFee)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">已交收费</p>
                  <p className="text-xl font-bold text-green-600">¥{formatAmount(stats.totalPaid)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">总支出</p>
                  <p className="text-xl font-bold text-red-600">¥{formatAmount(stats.totalExpense)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导航卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.title}
                className={`cursor-pointer transition-all duration-300 ${module.cardBorder} ${module.hoverShadow} hover:shadow-lg hover:-translate-y-1`}
                onClick={() => router.push(module.href)}
              >
                <CardHeader className="pb-3">
                  <div className={`w-14 h-14 rounded-xl ${module.iconBg} flex items-center justify-center mb-3`}>
                    <Icon className={`h-7 w-7 ${module.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {module.title}
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm text-gray-500 mb-4">
                    {module.description}
                  </CardDescription>
                  
                  {/* 模块统计 */}
                  {module.stats.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                      {module.stats.map((stat, idx) => {
                        const StatIcon = stat.icon;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <StatIcon className={`h-4 w-4 ${stat.color}`} />
                            <div>
                              <p className="text-xs text-gray-400">{stat.label}</p>
                              <p className={`text-sm font-semibold ${stat.color}`}>{stat.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
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
