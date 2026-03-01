'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authFetch, isAuthenticated, clearAuthToken } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  LogOut,
  BarChart3,
  Users,
  RefreshCw
} from 'lucide-react';

// 统计数据类型
interface SchoolSummary {
  student_count: number;
  male_count: number;
  female_count: number;
  nap_count: number;
  day_student_count: number;
  total_fee: number;
  total_paid: number;
  pending_amount: number;
  collection_rate: string;
}

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
  agency_paid: number;
  total_fee: number;
  total_paid: number;
  pending_amount: number;
  collection_rate: string;
}

interface ProjectStats {
  total_students: number;
  tuition: number;
  lunch: number;
  nap: number;
  after_school: number;
  club: number;
  agency: number;
}

interface MonthlyStat {
  month: string;
  payments: Record<string, { amount: number; count: number }>;
  total: number;
}

interface StatsData {
  schoolSummary: SchoolSummary;
  classStats: ClassStat[];
  projectStats: ProjectStats;
  monthlyStats: MonthlyStat[];
  feeTypeMap: Record<string, string>;
}

function StatsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<StatsData | null>(null);

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // 获取统计数据
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/statistics');
      const result = await response.json();
      setStatsData(result);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      toast.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchStats();
  }, []);

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
  const formatMoney = (amount: number) => {
    return amount.toFixed(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/fees')}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回收费管理
              </Button>
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                收费统计
              </h1>
            </div>
            
            <nav className="flex items-center gap-2">
              <Button
                onClick={fetchStats}
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                刷新
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        ) : statsData ? (
          <div className="space-y-6">
            {/* 全校汇总 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  全校汇总
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{statsData.schoolSummary.student_count}</div>
                    <div className="text-sm text-gray-600">学生总数</div>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <div className="text-xl font-semibold text-pink-600">男 {statsData.schoolSummary.male_count} / 女 {statsData.schoolSummary.female_count}</div>
                    <div className="text-sm text-gray-600">男女人数</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-xl font-semibold text-orange-600">走读 {statsData.schoolSummary.day_student_count} / 午托 {statsData.schoolSummary.nap_count}</div>
                    <div className="text-sm text-gray-600">走读/午托</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{statsData.schoolSummary.collection_rate}</div>
                    <div className="text-sm text-gray-600">总体收缴率</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">¥{formatMoney(statsData.schoolSummary.total_fee)}</div>
                    <div className="text-sm text-gray-600">应交总额</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">¥{formatMoney(statsData.schoolSummary.total_paid)}</div>
                    <div className="text-sm text-gray-600">已收金额</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">¥{formatMoney(statsData.schoolSummary.pending_amount)}</div>
                    <div className="text-sm text-gray-600">待收金额</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 班级缴费汇总 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">班级缴费汇总</CardTitle>
                <CardDescription>各班级各项目费用应交/已交统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold sticky left-0 bg-gray-50">班级</TableHead>
                        <TableHead className="text-center font-semibold">人数</TableHead>
                        <TableHead className="text-center font-semibold">学费<br/><span className="font-normal text-xs">应交/已交</span></TableHead>
                        <TableHead className="text-center font-semibold">午餐费<br/><span className="font-normal text-xs">应交/已交</span></TableHead>
                        <TableHead className="text-center font-semibold">午托费<br/><span className="font-normal text-xs">应交/已交</span></TableHead>
                        <TableHead className="text-center font-semibold">课后服务<br/><span className="font-normal text-xs">应交/已交</span></TableHead>
                        <TableHead className="text-center font-semibold">社团费<br/><span className="font-normal text-xs">应交/已交</span></TableHead>
                        <TableHead className="text-center font-semibold">代办费<br/><span className="font-normal text-xs">应交/已交</span></TableHead>
                        <TableHead className="text-center font-semibold">应交总额</TableHead>
                        <TableHead className="text-center font-semibold">已收金额</TableHead>
                        <TableHead className="text-center font-semibold">待收金额</TableHead>
                        <TableHead className="text-center font-semibold">收缴率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statsData.classStats.map((c) => (
                        <TableRow key={c.class_name}>
                          <TableCell className="font-medium sticky left-0 bg-white">{c.class_name}</TableCell>
                          <TableCell className="text-center">{c.student_count}</TableCell>
                          <TableCell className="text-center">
                            <div>{formatMoney(c.tuition_fee)}/{formatMoney(c.tuition_paid)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>{formatMoney(c.lunch_fee)}/{formatMoney(c.lunch_paid)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>{formatMoney(c.nap_fee)}/{formatMoney(c.nap_paid)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>{formatMoney(c.after_school_fee)}/{formatMoney(c.after_school_paid)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>{formatMoney(c.club_fee)}/{formatMoney(c.club_paid)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>{formatMoney(c.agency_fee)}/{formatMoney(c.agency_paid)}</div>
                          </TableCell>
                          <TableCell className="text-center font-medium">¥{formatMoney(c.total_fee)}</TableCell>
                          <TableCell className="text-center font-medium text-green-600">¥{formatMoney(c.total_paid)}</TableCell>
                          <TableCell className="text-center font-medium text-red-600">¥{formatMoney(c.pending_amount)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              parseFloat(c.collection_rate) >= 90 ? 'bg-green-100 text-green-700' :
                              parseFloat(c.collection_rate) >= 70 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {c.collection_rate}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* 合计行 */}
                      <TableRow className="bg-blue-50 font-semibold">
                        <TableCell className="sticky left-0 bg-blue-50">全校合计</TableCell>
                        <TableCell className="text-center">{statsData.schoolSummary.student_count}</TableCell>
                        <TableCell className="text-center">
                          <div>{formatMoney(statsData.classStats.reduce((s, c) => s + c.tuition_fee, 0))}/{formatMoney(statsData.classStats.reduce((s, c) => s + c.tuition_paid, 0))}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>{formatMoney(statsData.classStats.reduce((s, c) => s + c.lunch_fee, 0))}/{formatMoney(statsData.classStats.reduce((s, c) => s + c.lunch_paid, 0))}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>{formatMoney(statsData.classStats.reduce((s, c) => s + c.nap_fee, 0))}/{formatMoney(statsData.classStats.reduce((s, c) => s + c.nap_paid, 0))}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>{formatMoney(statsData.classStats.reduce((s, c) => s + c.after_school_fee, 0))}/{formatMoney(statsData.classStats.reduce((s, c) => s + c.after_school_paid, 0))}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>{formatMoney(statsData.classStats.reduce((s, c) => s + c.club_fee, 0))}/{formatMoney(statsData.classStats.reduce((s, c) => s + c.club_paid, 0))}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>{formatMoney(statsData.classStats.reduce((s, c) => s + c.agency_fee, 0))}/{formatMoney(statsData.classStats.reduce((s, c) => s + c.agency_paid, 0))}</div>
                        </TableCell>
                        <TableCell className="text-center">¥{formatMoney(statsData.schoolSummary.total_fee)}</TableCell>
                        <TableCell className="text-center text-green-600">¥{formatMoney(statsData.schoolSummary.total_paid)}</TableCell>
                        <TableCell className="text-center text-red-600">¥{formatMoney(statsData.schoolSummary.pending_amount)}</TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-700">
                            {statsData.schoolSummary.collection_rate}
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 各项目参与人数 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">各项目参与人数</CardTitle>
                <CardDescription>应交金额大于0则代表参与该项目</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">{statsData.projectStats.total_students}</div>
                    <div className="text-sm text-gray-600">学生总数</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{statsData.projectStats.tuition}</div>
                    <div className="text-sm text-gray-600">学费</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{statsData.projectStats.lunch}</div>
                    <div className="text-sm text-gray-600">午餐费</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{statsData.projectStats.nap}</div>
                    <div className="text-sm text-gray-600">午托费</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{statsData.projectStats.after_school}</div>
                    <div className="text-sm text-gray-600">课后服务</div>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <div className="text-2xl font-bold text-pink-600">{statsData.projectStats.club}</div>
                    <div className="text-sm text-gray-600">社团费</div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">{statsData.projectStats.agency}</div>
                    <div className="text-sm text-gray-600">代办费</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 月度缴费统计 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">月度缴费统计</CardTitle>
                <CardDescription>按月份显示缴费金额</CardDescription>
              </CardHeader>
              <CardContent>
                {statsData.monthlyStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无缴费记录</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">月份</TableHead>
                          <TableHead className="text-right font-semibold">学费</TableHead>
                          <TableHead className="text-right font-semibold">午餐费</TableHead>
                          <TableHead className="text-right font-semibold">午托费</TableHead>
                          <TableHead className="text-right font-semibold">课后服务</TableHead>
                          <TableHead className="text-right font-semibold">社团费</TableHead>
                          <TableHead className="text-right font-semibold">代办费</TableHead>
                          <TableHead className="text-right font-semibold">月度合计</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsData.monthlyStats.map((m) => (
                          <TableRow key={m.month}>
                            <TableCell className="font-medium">{m.month}</TableCell>
                            <TableCell className="text-right">{m.payments['tuition']?.amount.toFixed(0) || '-'}</TableCell>
                            <TableCell className="text-right">{m.payments['lunch']?.amount.toFixed(0) || '-'}</TableCell>
                            <TableCell className="text-right">{m.payments['nap']?.amount.toFixed(0) || '-'}</TableCell>
                            <TableCell className="text-right">{m.payments['after_school']?.amount.toFixed(0) || '-'}</TableCell>
                            <TableCell className="text-right">{m.payments['club']?.amount.toFixed(0) || '-'}</TableCell>
                            <TableCell className="text-right">{m.payments['agency']?.amount.toFixed(0) || '-'}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">¥{m.total.toFixed(0)}</TableCell>
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
          <div className="text-center py-20 text-gray-500">
            暂无统计数据
          </div>
        )}
      </main>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    }>
      <StatsContent />
    </Suspense>
  );
}
