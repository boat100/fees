'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Plus, 
  Trash2, 
  Calendar,
  DollarSign,
  User,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { FEE_TYPE_MAP, FEE_ITEMS } from '@/lib/constants';

interface StudentDetail {
  id: number;
  class_name: string;
  student_name: string;
  tuition_fee: number;
  lunch_fee: number;
  nap_fee: number;
  after_school_fee: number;
  club_fee: number;
  other_fee: number;
  remark: string | null;
  created_at: string;
  updated_at: string | null;
  paymentsByType: Record<string, { records: PaymentRecord[]; total: number }>;
  paymentRecords: PaymentRecord[];
}

interface PaymentRecord {
  id: number;
  student_id: number;
  fee_type: string;
  amount: number;
  payment_date: string;
  remark: string | null;
  created_at: string;
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 交费对话框状态
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedFeeType, setSelectedFeeType] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentRemark, setPaymentRemark] = useState<string>('');
  const [paymentWarning, setPaymentWarning] = useState<string>('');
  
  // 获取学生详情
  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/student-fees/${resolvedParams.id}`);
      const result = await response.json();
      if (result.data) {
        setStudent(result.data);
      } else {
        alert('学生不存在');
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch student:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [resolvedParams.id]);

  // 获取今天的日期
  const getTodayString = (): string => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // 打开交费对话框
  const openPaymentDialog = (feeType: string) => {
    setSelectedFeeType(feeType);
    setPaymentAmount(0);
    setPaymentDate(getTodayString());
    setPaymentRemark('');
    setPaymentWarning('');
    setPaymentDialogOpen(true);
  };

  // 计算已交金额和检查是否超额
  const checkPaymentAmount = (amount: number) => {
    if (!student || !selectedFeeType) return;
    
    const feeItem = FEE_ITEMS.find(item => item.key === selectedFeeType);
    if (!feeItem) return;
    
    const expectedFee = student[feeItem.field] as number;
    const currentPaid = student.paymentsByType[selectedFeeType]?.total || 0;
    const newTotal = currentPaid + amount;
    
    if (amount > 0 && newTotal > expectedFee) {
      setPaymentWarning(`⚠️ 缴费金额超出应交金额！应交 ${expectedFee}，已交 ${currentPaid}，本次 ${amount}，合计 ${newTotal}`);
    } else {
      setPaymentWarning('');
    }
  };

  // 提交交费记录
  const submitPayment = async () => {
    if (!selectedFeeType || paymentAmount <= 0 || !paymentDate) {
      alert('请填写完整的交费信息');
      return;
    }
    
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student?.id,
          feeType: selectedFeeType,
          amount: paymentAmount,
          paymentDate: paymentDate,
          remark: paymentRemark || null,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        setPaymentDialogOpen(false);
        fetchStudent();
      } else {
        alert(result.error || '交费失败');
      }
    } catch (error) {
      console.error('Failed to submit payment:', error);
      alert('交费失败');
    }
  };

  // 删除交费记录
  const deletePayment = async (recordId: number) => {
    if (!confirm('确定要删除这条交费记录吗？')) return;
    
    try {
      const response = await fetch(`/api/payments/${recordId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchStudent();
      } else {
        const result = await response.json();
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete payment:', error);
      alert('删除失败');
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">学生不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.push('/')}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                返回
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <User className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {student.student_name} - 费用详情
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>{student.class_name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 学生信息卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              学生信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-500">姓名</Label>
                <div className="font-semibold text-lg">{student.student_name}</div>
              </div>
              <div>
                <Label className="text-gray-500">班级</Label>
                <div className="font-semibold text-lg">{student.class_name}</div>
              </div>
              <div>
                <Label className="text-gray-500">创建时间</Label>
                <div className="text-sm">{formatDate(student.created_at)}</div>
              </div>
              <div>
                <Label className="text-gray-500">备注</Label>
                <div className="text-sm">{student.remark || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 费用汇总 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              费用汇总
            </CardTitle>
            <CardDescription>点击"添加交费"按钮记录交费</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>费用项目</TableHead>
                    <TableHead className="text-right">应交金额</TableHead>
                    <TableHead className="text-right">已交金额</TableHead>
                    <TableHead className="text-right">欠费金额</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FEE_ITEMS.map(item => {
                    const expected = student[item.field] as number;
                    const paid = student.paymentsByType[item.key]?.total || 0;
                    const remaining = expected - paid;
                    const isFull = expected > 0 && paid >= expected;
                    const isPartial = paid > 0 && paid < expected;
                    
                    return (
                      <TableRow key={item.key}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell className="text-right">{expected.toFixed(2)}</TableCell>
                        <TableCell className={`text-right ${isFull ? 'text-green-600 font-semibold' : ''}`}>
                          {paid.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remaining > 0 ? remaining.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell className="text-center">
                          {expected === 0 ? (
                            <span className="text-gray-400">-</span>
                          ) : isFull ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              已缴清
                            </span>
                          ) : isPartial ? (
                            <span className="text-orange-600">部分缴费</span>
                          ) : (
                            <span className="text-red-600">未缴费</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {expected > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentDialog(item.key)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              添加交费
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* 合计行 */}
                  <TableRow className="bg-blue-50 font-semibold">
                    <TableCell>合计</TableCell>
                    <TableCell className="text-right text-blue-700">
                      {FEE_ITEMS.reduce((sum, item) => sum + (student[item.field] as number), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {FEE_ITEMS.reduce((sum, item) => sum + (student.paymentsByType[item.key]?.total || 0), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {FEE_ITEMS.reduce((sum, item) => {
                        const expected = student[item.field] as number;
                        const paid = student.paymentsByType[item.key]?.total || 0;
                        return sum + Math.max(0, expected - paid);
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 交费时间线 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              交费时间线
            </CardTitle>
            <CardDescription>按时间顺序显示所有交费记录</CardDescription>
          </CardHeader>
          <CardContent>
            {student.paymentRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无交费记录
              </div>
            ) : (
              <div className="space-y-4">
                {student.paymentRecords.map((record) => (
                  <div 
                    key={record.id} 
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-24 text-sm text-gray-500">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {formatDate(record.payment_date)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{FEE_TYPE_MAP[record.fee_type]}</span>
                        <span className="text-green-600 font-semibold">+{record.amount.toFixed(2)} 元</span>
                      </div>
                      {record.remark && (
                        <div className="text-sm text-gray-500 mt-1">{record.remark}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deletePayment(record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 添加交费对话框 */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>添加交费记录</DialogTitle>
            <DialogDescription>
              为 {FEE_TYPE_MAP[selectedFeeType]} 添加交费记录
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">费用类型</Label>
              <div className="col-span-3 font-semibold">{FEE_TYPE_MAP[selectedFeeType]}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">应交金额</Label>
              <div className="col-span-3">
                {student && (student[FEE_ITEMS.find(i => i.key === selectedFeeType)?.field || 'tuition_fee'] as number)?.toFixed(2)} 元
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">已交金额</Label>
              <div className="col-span-3">
                {student && (student.paymentsByType[selectedFeeType]?.total || 0)?.toFixed(2)} 元
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">本次交费 *</Label>
              <Input
                type="number"
                value={paymentAmount || ''}
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  setPaymentAmount(amount);
                  checkPaymentAmount(amount);
                }}
                className="col-span-3"
                placeholder="请输入交费金额"
              />
            </div>
            {paymentWarning && (
              <div className="col-span-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <span className="text-yellow-800 text-sm">{paymentWarning}</span>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">交费日期 *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">备注</Label>
              <Input
                value={paymentRemark}
                onChange={(e) => setPaymentRemark(e.target.value)}
                className="col-span-3"
                placeholder="备注信息（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={submitPayment}
              disabled={paymentAmount <= 0 || !paymentDate}
              className="bg-green-600 hover:bg-green-700"
            >
              确认交费
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
