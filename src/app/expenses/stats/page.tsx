'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated, clearAuthToken } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  LogOut,
  BarChart3,
  TrendingDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// 时间类型
type TimeType = 'all' | 'year' | 'month';

interface CategoryStat {
  category: string;
  categoryKey: string;
  totalAmount: number;
  recordCount: number;
}

interface ItemStat {
  item: string;
  totalAmount: number;
  recordCount: number;
}

interface StatsData {
  categoryData: CategoryStat[];
  dailyItemData: ItemStat[];
  personnelItemData: ItemStat[];
  yearList: string[];
  monthList: string[];
  totalAmount: number;
  totalRecords: number;
}

export default function ExpensesStatsPage() {
  const router = useRouter();
  
  // 数据状态
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [timeType, setTimeType] = useState<TimeType>('all');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/expenses/stats?';
      url += `timeType=${timeType}`;
      
      if (timeType === 'year' && selectedYear) {
        url += `&year=${selectedYear}`;
      } else if (timeType === 'month' && selectedMonth) {
        url += `&month=${selectedMonth}`;
      }
      
      const response = await authFetch(url);
      const result = await response.json();
      
      if (response.ok) {
        setStatsData(result.data);
      } else {
        console.error('Failed to fetch stats:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, [timeType, selectedYear, selectedMonth]);

  // 初始化
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, [router, fetchStats]);

  // 时间类型变化时重置选择
  useEffect(() => {
    if (timeType === 'all') {
      setSelectedYear('');
      setSelectedMonth('');
    } else if (timeType === 'year') {
      setSelectedMonth('');
    }
  }, [timeType]);

  // 退出登录
  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
      clearAuthToken();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 图表Tooltip格式化
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-red-600">
            金额: ¥{formatAmount(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/expenses')}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回支出管理
              </Button>
              <BarChart3 className="h-8 w-8 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                支出统计
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleLogout} variant="ghost" size="icon">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 时间筛选 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>时间范围筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">统计范围：</span>
                <Select value={timeType} onValueChange={(v) => setTimeType(v as TimeType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="year">按年</SelectItem>
                    <SelectItem value="month">按月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {timeType === 'year' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">选择年份：</span>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {statsData?.yearList.map(year => (
                        <SelectItem key={year} value={year}>{year}年</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {timeType === 'month' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">选择月份：</span>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {statsData?.monthList.map(month => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总支出金额</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                ¥{statsData ? formatAmount(statsData.totalAmount) : '0.00'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>记录总数</CardDescription>
              <CardTitle className="text-2xl">{statsData?.totalRecords || 0} 条</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-6">
            {/* 图表一：类别统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  支出类别统计
                </CardTitle>
                <CardDescription>日常公用支出与人员支出金额对比</CardDescription>
              </CardHeader>
              <CardContent>
                {statsData?.categoryData && statsData.categoryData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statsData.categoryData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="category" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatAmount(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          dataKey="totalAmount" 
                          name="金额" 
                          fill="#ef4444" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 图表二：日常公用支出子项目统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-500" />
                  日常公用支出明细统计
                </CardTitle>
                <CardDescription>日常公用支出各子项目金额分布</CardDescription>
              </CardHeader>
              <CardContent>
                {statsData?.dailyItemData && statsData.dailyItemData.length > 0 ? (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statsData.dailyItemData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number"
                          tickFormatter={(value) => formatAmount(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="item"
                          tick={{ fontSize: 11 }}
                          width={90}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          dataKey="totalAmount" 
                          name="金额" 
                          fill="#f97316" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 图表三：人员支出子项目统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                  人员支出明细统计
                </CardTitle>
                <CardDescription>人员支出各子项目金额分布</CardDescription>
              </CardHeader>
              <CardContent>
                {statsData?.personnelItemData && statsData.personnelItemData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statsData.personnelItemData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number"
                          tickFormatter={(value) => formatAmount(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="item"
                          tick={{ fontSize: 11 }}
                          width={110}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          dataKey="totalAmount" 
                          name="金额" 
                          fill="#3b82f6" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
