'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  RefreshCw,
  Users,
  DollarSign,
  Download,
  LogOut
} from 'lucide-react';

// 类型定义
interface ClassStat {
  class_name: string;
  student_count: number;
  tuition_fee: number;
  tuition_paid: number;
  lunch_fee: number;
  lunch_paid: number;
  nap_fee: number;
  nap_paid: number;
  after_school_fee: number;
  after_school_paid: number;
  club_fee: number;
  club_paid: number;
  other_fee: number;
  other_paid: number;
  total_fee: number;
  total_paid: number;
}

interface MonthlyStat {
  month: string;
  payments: Record<string, { amount: number; count: number }>;
  total: number;
}

interface SchoolTotal {
  student_count: number;
  total_fee: number;
  total_paid: number;
  tuition_fee: number;
  tuition_paid: number;
  lunch_fee: number;
  lunch_paid: number;
  nap_fee: number;
  nap_paid: number;
  after_school_fee: number;
  after_school_paid: number;
  club_fee: number;
  club_paid: number;
  other_fee: number;
  other_paid: number;
}

interface CompletionStats {
  tuition: { total: number; completed: number };
  lunch: { total: number; completed: number };
  nap: { total: number; completed: number };
  after_school: { total: number; completed: number };
  club: { total: number; completed: number };
  other: { total: number; completed: number };
}

interface Statistics {
  classStats: ClassStat[];
  monthlyStats: MonthlyStat[];
  schoolTotal: SchoolTotal;
  completionStats: CompletionStats;
}

export default function StatsPage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // 获取统计数据
  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/statistics');
      const result = await response.json();
      if (response.ok) {
        setStatistics(result);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // 导出统计数据
  const handleExport = async (type: 'class' | 'month') => {
    setExporting(type);
    try {
      const response = await fetch(`/api/export/stats?type=${type}`);
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      // 获取文件 blob
      const blob = await response.blob();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'class' ? '班级费用统计.xlsx' : '月度费用统计.xlsx';
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchStatistics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                费用统计
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchStatistics}
                variant="outline"
                size="icon"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => handleExport('class')}
                variant="outline"
                disabled={exporting !== null || loading}
              >
                {exporting === 'class' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                导出班级统计
              </Button>
              <Button
                onClick={() => handleExport('month')}
                variant="outline"
                disabled={exporting !== null || loading}
              >
                {exporting === 'month' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                导出月度统计
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : statistics ? (
          <div className="space-y-6">
            {/* 全校汇总卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  全校汇总
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {statistics.schoolTotal.student_count}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">学生总数</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      ¥{statistics.schoolTotal.total_paid.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">已收金额</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-600">
                      ¥{(statistics.schoolTotal.total_fee - statistics.schoolTotal.total_paid).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">待收金额</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600">
                      {statistics.schoolTotal.total_fee > 0 
                        ? ((statistics.schoolTotal.total_paid / statistics.schoolTotal.total_fee) * 100).toFixed(1) 
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-500 mt-1">总体收缴率</div>
                  </div>
                </div>
                
                {/* 各项目汇总 */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">各费用项目汇总</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-700">学费</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.tuition_paid.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {statistics.schoolTotal.tuition_fee.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-700">午餐费</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.lunch_paid.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {statistics.schoolTotal.lunch_fee.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-700">午托费</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.nap_paid.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {statistics.schoolTotal.nap_fee.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-700">课后服务</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.after_school_paid.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {statistics.schoolTotal.after_school_fee.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-700">社团费</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.club_paid.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {statistics.schoolTotal.club_fee.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-700">其他</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.other_paid.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">/ {statistics.schoolTotal.other_fee.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 各费用项目缴费完成人数统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  各费用项目缴费完成人数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { key: 'tuition', label: '学费', color: 'blue' },
                    { key: 'lunch', label: '午餐费', color: 'orange' },
                    { key: 'nap', label: '午托费', color: 'purple' },
                    { key: 'after_school', label: '课后服务', color: 'teal' },
                    { key: 'club', label: '社团费', color: 'pink' },
                    { key: 'other', label: '其他', color: 'gray' },
                  ].map(item => {
                    const stat = statistics.completionStats[item.key as keyof CompletionStats];
                    const percentage = stat.total > 0 ? ((stat.completed / stat.total) * 100).toFixed(1) : '0';
                    return (
                      <div key={item.key} className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="font-semibold text-gray-700 mb-2">{item.label}</div>
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {stat.completed}/{stat.total}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">完成人数/应交人数</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-sm font-medium text-green-600 mt-1">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 各班级交费情况 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  各班级交费情况
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics.classStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">暂无数据</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">班级</TableHead>
                          <TableHead className="font-semibold text-center">人数</TableHead>
                          <TableHead className="font-semibold text-right">学费<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">午餐费<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">午托费<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">课后服务<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">社团费<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">其他<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">合计<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">收缴率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.classStats.map((stat) => (
                          <TableRow key={stat.class_name} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{stat.class_name}</TableCell>
                            <TableCell className="text-center">{stat.student_count}</TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-green-600">{stat.tuition_paid.toLocaleString()}</span>/<span>{stat.tuition_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-green-600">{stat.lunch_paid.toLocaleString()}</span>/<span>{stat.lunch_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-green-600">{stat.nap_paid.toLocaleString()}</span>/<span>{stat.nap_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-green-600">{stat.after_school_paid.toLocaleString()}</span>/<span>{stat.after_school_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-green-600">{stat.club_paid.toLocaleString()}</span>/<span>{stat.club_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className="text-green-600">{stat.other_paid.toLocaleString()}</span>/<span>{stat.other_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className="text-green-600">{stat.total_paid.toLocaleString()}</span>/<span>{stat.total_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                stat.total_fee > 0 && stat.total_paid >= stat.total_fee 
                                  ? 'bg-green-100 text-green-700' 
                                  : stat.total_paid / stat.total_fee >= 0.8
                                  ? 'bg-blue-100 text-blue-700'
                                  : stat.total_paid / stat.total_fee >= 0.5
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {stat.total_fee > 0 ? ((stat.total_paid / stat.total_fee) * 100).toFixed(1) : 0}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* 合计行 */}
                        <TableRow className="bg-blue-50 font-semibold">
                          <TableCell>全校合计</TableCell>
                          <TableCell className="text-center">{statistics.schoolTotal.student_count}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.tuition_paid.toLocaleString()}</span>/{statistics.schoolTotal.tuition_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.lunch_paid.toLocaleString()}</span>/{statistics.schoolTotal.lunch_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.nap_paid.toLocaleString()}</span>/{statistics.schoolTotal.nap_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.after_school_paid.toLocaleString()}</span>/{statistics.schoolTotal.after_school_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.club_paid.toLocaleString()}</span>/{statistics.schoolTotal.club_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.other_paid.toLocaleString()}</span>/{statistics.schoolTotal.other_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-lg">
                            <span className="text-green-600">{statistics.schoolTotal.total_paid.toLocaleString()}</span>/{statistics.schoolTotal.total_fee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              {statistics.schoolTotal.total_fee > 0 
                                ? ((statistics.schoolTotal.total_paid / statistics.schoolTotal.total_fee) * 100).toFixed(1) 
                                : 0}%
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 每月交费情况 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  每月交费情况
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics.monthlyStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">暂无交费记录</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">月份</TableHead>
                          <TableHead className="font-semibold text-right">学费</TableHead>
                          <TableHead className="font-semibold text-right">午餐费</TableHead>
                          <TableHead className="font-semibold text-right">午托费</TableHead>
                          <TableHead className="font-semibold text-right">课后服务</TableHead>
                          <TableHead className="font-semibold text-right">社团费</TableHead>
                          <TableHead className="font-semibold text-right">其他</TableHead>
                          <TableHead className="font-semibold text-right">月度合计</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.monthlyStats.map((stat) => (
                          <TableRow key={stat.month} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{stat.month}</TableCell>
                            <TableCell className="text-right">
                              {stat.payments['tuition'] ? (
                                <span className="text-green-600">¥{stat.payments['tuition'].amount.toLocaleString()}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.payments['lunch'] ? (
                                <span className="text-green-600">¥{stat.payments['lunch'].amount.toLocaleString()}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.payments['nap'] ? (
                                <span className="text-green-600">¥{stat.payments['nap'].amount.toLocaleString()}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.payments['after_school'] ? (
                                <span className="text-green-600">¥{stat.payments['after_school'].amount.toLocaleString()}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.payments['club'] ? (
                                <span className="text-green-600">¥{stat.payments['club'].amount.toLocaleString()}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.payments['other'] ? (
                                <span className="text-green-600">¥{stat.payments['other'].amount.toLocaleString()}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ¥{stat.total.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">加载失败，请刷新重试</div>
        )}
      </main>
    </div>
  );
}
