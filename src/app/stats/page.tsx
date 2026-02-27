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
  LogOut,
  FileSpreadsheet
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
  agency_fee: number;
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
  agency_fee: number;
}

interface CompletionStats {
  tuition: { total: number; completed: number };
  lunch: { total: number; completed: number };
  nap: { total: number; completed: number };
  after_school: { total: number; completed: number };
  club: { total: number; completed: number };
  agency: { total: number; completed: number };
}

interface ClassProjectStats {
  class_name: string;
  total_students: number;
  tuition_count: number;
  lunch_count: number;
  nap_count: number;
  after_school_count: number;
  club_count: number;
  agency_count: number;
}

interface SchoolProjectStats {
  total_students: number;
  tuition: number;
  lunch: number;
  nap: number;
  after_school: number;
  club: number;
  agency: number;
}

interface Statistics {
  classStats: ClassStat[];
  monthlyStats: MonthlyStat[];
  schoolTotal: SchoolTotal;
  completionStats: CompletionStats;
  classProjectStats: ClassProjectStats[];
  schoolProjectStats: SchoolProjectStats;
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
  const handleExport = async (type: string, className?: string) => {
    setExporting(type);
    try {
      let url = `/api/export/stats?type=${type}`;
      if (className) {
        url += `&class_name=${encodeURIComponent(className)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      // 获取文件 blob
      const blob = await response.blob();
      
      // 从响应头获取文件名
      const disposition = response.headers.get('Content-Disposition');
      let filename = '统计数据.xlsx';
      if (disposition) {
        const filenameMatch = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      
      // 创建下载链接
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    全校汇总
                  </CardTitle>
                  <Button
                    onClick={() => handleExport('school_summary')}
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                  >
                    {exporting === 'school_summary' ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    导出
                  </Button>
                </div>
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
                      <div className="font-semibold text-gray-700">代办费</div>
                      <div className="text-lg text-green-600 font-medium">{statistics.schoolTotal.agency_fee.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">一次性收齐</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 各费用项目缴费完成人数统计 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    各费用项目缴费完成人数
                  </CardTitle>
                  <Button
                    onClick={() => handleExport('completion_stats')}
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                  >
                    {exporting === 'completion_stats' ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    导出
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { key: 'tuition', label: '学费', color: 'blue' },
                    { key: 'lunch', label: '午餐费', color: 'orange' },
                    { key: 'nap', label: '午托费', color: 'purple' },
                    { key: 'after_school', label: '课后服务', color: 'teal' },
                    { key: 'club', label: '社团费', color: 'pink' },
                    { key: 'agency', label: '代办费', color: 'gray' },
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

            {/* 全校各项目参与人数统计 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    全校各项目参与人数
                  </CardTitle>
                  <Button
                    onClick={() => handleExport('project_stats')}
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                  >
                    {exporting === 'project_stats' ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    导出
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">学生总数</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {statistics.schoolProjectStats.total_students}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">学费</div>
                    <div className="text-3xl font-bold text-green-600">
                      {statistics.schoolProjectStats.tuition}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人参与</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">午餐费</div>
                    <div className="text-3xl font-bold text-orange-600">
                      {statistics.schoolProjectStats.lunch}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人参与</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">午托费</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {statistics.schoolProjectStats.nap}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人参与</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">课后服务</div>
                    <div className="text-3xl font-bold text-teal-600">
                      {statistics.schoolProjectStats.after_school}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人参与</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">社团费</div>
                    <div className="text-3xl font-bold text-pink-600">
                      {statistics.schoolProjectStats.club}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人参与</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="font-semibold text-gray-700 mb-2">代办费</div>
                    <div className="text-3xl font-bold text-gray-600">
                      {statistics.schoolProjectStats.agency}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">人参与</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 各班级各项目参与人数统计 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    各班级各项目参与人数
                  </CardTitle>
                  <Button
                    onClick={() => handleExport('class_project_stats')}
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                  >
                    {exporting === 'class_project_stats' ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    导出
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {statistics.classProjectStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">暂无数据</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">班级</TableHead>
                          <TableHead className="font-semibold text-center">学生数</TableHead>
                          <TableHead className="font-semibold text-center">学费</TableHead>
                          <TableHead className="font-semibold text-center">午餐费</TableHead>
                          <TableHead className="font-semibold text-center">午托费</TableHead>
                          <TableHead className="font-semibold text-center">课后服务</TableHead>
                          <TableHead className="font-semibold text-center">社团费</TableHead>
                          <TableHead className="font-semibold text-center">代办费</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.classProjectStats.map((stat) => (
                          <TableRow key={stat.class_name} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{stat.class_name}</TableCell>
                            <TableCell className="text-center font-semibold">{stat.total_students}</TableCell>
                            <TableCell className="text-center">
                              <span className="text-green-600 font-medium">{stat.tuition_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-orange-600 font-medium">{stat.lunch_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-purple-600 font-medium">{stat.nap_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-teal-600 font-medium">{stat.after_school_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-pink-600 font-medium">{stat.club_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-gray-600 font-medium">{stat.agency_count}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* 合计行 */}
                        <TableRow className="bg-blue-50 font-semibold">
                          <TableCell>全校合计</TableCell>
                          <TableCell className="text-center">{statistics.schoolProjectStats.total_students}</TableCell>
                          <TableCell className="text-center text-green-600">{statistics.schoolProjectStats.tuition}</TableCell>
                          <TableCell className="text-center text-orange-600">{statistics.schoolProjectStats.lunch}</TableCell>
                          <TableCell className="text-center text-purple-600">{statistics.schoolProjectStats.nap}</TableCell>
                          <TableCell className="text-center text-teal-600">{statistics.schoolProjectStats.after_school}</TableCell>
                          <TableCell className="text-center text-pink-600">{statistics.schoolProjectStats.club}</TableCell>
                          <TableCell className="text-center text-gray-600">{statistics.schoolProjectStats.agency}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 各班级交费情况 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    各班级交费情况
                  </CardTitle>
                  <Button
                    onClick={() => handleExport('class')}
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                  >
                    {exporting === 'class' ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    导出全部
                  </Button>
                </div>
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
                          <TableHead className="font-semibold text-right">代办费<br/><span className="font-normal text-xs text-gray-400">总额</span></TableHead>
                          <TableHead className="font-semibold text-right">合计<br/><span className="font-normal text-xs text-gray-400">已交/应交</span></TableHead>
                          <TableHead className="font-semibold text-right">收缴率</TableHead>
                          <TableHead className="font-semibold text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.classStats.map((stat) => (
                          <TableRow key={stat.class_name} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{stat.class_name}</TableCell>
                            <TableCell className="text-center">{stat.student_count}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{stat.tuition_paid.toLocaleString()}</span>
                              <span className="text-gray-400"> / {stat.tuition_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{stat.lunch_paid.toLocaleString()}</span>
                              <span className="text-gray-400"> / {stat.lunch_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{stat.nap_paid.toLocaleString()}</span>
                              <span className="text-gray-400"> / {stat.nap_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{stat.after_school_paid.toLocaleString()}</span>
                              <span className="text-gray-400"> / {stat.after_school_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{stat.club_paid.toLocaleString()}</span>
                              <span className="text-gray-400"> / {stat.club_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{stat.agency_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600 font-semibold">{stat.total_paid.toLocaleString()}</span>
                              <span className="text-gray-400"> / {stat.total_fee.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {stat.total_fee > 0 ? (
                                <span className={`font-semibold ${((stat.total_paid / stat.total_fee) * 100) >= 90 ? 'text-green-600' : ((stat.total_paid / stat.total_fee) * 100) >= 70 ? 'text-blue-600' : ((stat.total_paid / stat.total_fee) * 100) >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {((stat.total_paid / stat.total_fee) * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                onClick={() => handleExport('class_detail', stat.class_name)}
                                variant="ghost"
                                size="sm"
                                disabled={exporting !== null}
                                className="h-8 px-2"
                              >
                                <FileSpreadsheet className="h-4 w-4 mr-1" />
                                导出
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* 合计行 */}
                        <TableRow className="bg-blue-50 font-semibold">
                          <TableCell>全校合计</TableCell>
                          <TableCell className="text-center">{statistics.schoolTotal.student_count}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.tuition_paid.toLocaleString()}</span>
                            <span className="text-gray-500"> / {statistics.schoolTotal.tuition_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.lunch_paid.toLocaleString()}</span>
                            <span className="text-gray-500"> / {statistics.schoolTotal.lunch_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.nap_paid.toLocaleString()}</span>
                            <span className="text-gray-500"> / {statistics.schoolTotal.nap_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.after_school_paid.toLocaleString()}</span>
                            <span className="text-gray-500"> / {statistics.schoolTotal.after_school_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.club_paid.toLocaleString()}</span>
                            <span className="text-gray-500"> / {statistics.schoolTotal.club_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.agency_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{statistics.schoolTotal.total_paid.toLocaleString()}</span>
                            <span className="text-gray-500"> / {statistics.schoolTotal.total_fee.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {statistics.schoolTotal.total_fee > 0 ? (
                              <span className="text-green-600">
                                {((statistics.schoolTotal.total_paid / statistics.schoolTotal.total_fee) * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 月度交费统计 */}
            {statistics.monthlyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                      月度交费统计
                    </CardTitle>
                    <Button
                      onClick={() => handleExport('month')}
                      variant="outline"
                      size="sm"
                      disabled={exporting !== null}
                    >
                      {exporting === 'month' ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      导出
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
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
                          <TableHead className="font-semibold text-right">代办费</TableHead>
                          <TableHead className="font-semibold text-right">月度合计</TableHead>
                          <TableHead className="font-semibold text-right">交费笔数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.monthlyStats.map((stat) => (
                          <TableRow key={stat.month} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{stat.month}</TableCell>
                            <TableCell className="text-right">{stat.payments.tuition?.amount?.toLocaleString() || 0}</TableCell>
                            <TableCell className="text-right">{stat.payments.lunch?.amount?.toLocaleString() || 0}</TableCell>
                            <TableCell className="text-right">{stat.payments.nap?.amount?.toLocaleString() || 0}</TableCell>
                            <TableCell className="text-right">{stat.payments.after_school?.amount?.toLocaleString() || 0}</TableCell>
                            <TableCell className="text-right">{stat.payments.club?.amount?.toLocaleString() || 0}</TableCell>
                            <TableCell className="text-right text-gray-400">-</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">{stat.total.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {Object.values(stat.payments).reduce((sum: number, p: any) => sum + (p.count || 0), 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">暂无统计数据</div>
        )}
      </main>
    </div>
  );
}
