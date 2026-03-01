'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthToken, authFetch } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingDown, 
  Settings, 
  LogOut,
  School
} from 'lucide-react';

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

  // 导航菜单配置
  const navItems = [
    {
      title: '收费管理',
      href: '/fees',
      icon: DollarSign,
      description: '学生费用收取与管理',
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
      lightBg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      stats: stats ? {
        label: '已收/应收',
        value: `¥${formatAmount(stats.totalPaid)} / ¥${formatAmount(stats.totalFee)}`,
        subValue: `${stats.studentCount}名学生`
      } : null
    },
    {
      title: '支出管理',
      href: '/expenses',
      icon: TrendingDown,
      description: '学校支出记录与统计',
      color: 'red',
      gradient: 'from-red-500 to-rose-600',
      lightBg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      stats: stats ? {
        label: '累计支出',
        value: `¥${formatAmount(stats.totalExpense)}`,
        subValue: `${stats.expenseRecordCount}条记录`
      } : null
    },
    {
      title: '后台管理',
      href: '/admin',
      icon: Settings,
      description: '系统设置与数据维护',
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
      lightBg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      stats: stats ? {
        label: '班级数量',
        value: `${stats.classCount}个班级`,
        subValue: '点击进入管理'
      } : null
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
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

      {/* 主内容区域 */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* 功能入口卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card 
                key={item.href}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 overflow-hidden"
                onClick={() => router.push(item.href)}
              >
                {/* 顶部渐变色条 */}
                <div className={`h-2 bg-gradient-to-r ${item.gradient}`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-7 w-7 ${item.iconColor}`} />
                    </div>
                    <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`text-sm ${item.iconColor}`}>进入 →</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{item.description}</p>
                  {loading ? (
                    <div className="h-12 flex items-center">
                      <div className="animate-pulse bg-gray-200 h-4 w-24 rounded" />
                    </div>
                  ) : item.stats && (
                    <div className={`mt-auto pt-4 border-t ${item.lightBg} -mx-6 -mb-6 px-6 py-4`}>
                      <p className="text-xs text-gray-500 mb-1">{item.stats.label}</p>
                      <p className={`text-lg font-bold ${item.iconColor}`}>{item.stats.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.stats.subValue}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="py-4 border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          学校收支管理系统 · 安全可靠 · 数据本地存储
        </div>
      </footer>
    </div>
  );
}
