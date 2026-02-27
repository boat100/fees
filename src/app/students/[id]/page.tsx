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
  CheckCircle,
  CreditCard,
  LogOut,
  FileText
} from 'lucide-react';
import { FEE_TYPE_MAP, FEE_ITEMS, AGENCY_FEE_ITEMS, AGENCY_FEE_ITEM_TYPE_MAP } from '@/lib/constants';

interface StudentDetail {
  id: number;
  class_name: string;
  student_name: string;
  gender: string;
  nap_status: string;
  tuition_fee: number;
  lunch_fee: number;
  nap_fee: number;
  after_school_fee: number;
  club_fee: number;
  agency_fee: number;
  remark: string | null;
  created_at: string;
  updated_at: string | null;
  paymentsByType: Record<string, { records: PaymentRecord[]; total: number }>;
  paymentRecords: PaymentRecord[];
  agencyFeeItems: AgencyFeeItem[];
  agencyUsed: number;
  agencyBalance: number;
}

interface AgencyFeeItem {
  id: number;
  student_id: number;
  item_type: string;
  amount: number;
  item_date: string;
  remark: string | null;
  created_at: string;
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
  
  // 批量录入对话框状态
  const [batchPaymentDialogOpen, setBatchPaymentDialogOpen] = useState(false);
  const [batchPayments, setBatchPayments] = useState<Array<{ feeType: string; amount: number }>>([]);
  const [batchPaymentDate, setBatchPaymentDate] = useState<string>('');
  const [batchPaymentRemark, setBatchPaymentRemark] = useState<string>('');
  
  // 代办费扣除对话框状态
  const [agencyFeeDialogOpen, setAgencyFeeDialogOpen] = useState(false);
  const [agencyFeeItems, setAgencyFeeItems] = useState<Array<{
    id: number;
    student_id: number;
    item_type: string;
    amount: number;
    deduct_date: string;
    remark: string | null;
  }>>([]);
  const [agencyFeeItemType, setAgencyFeeItemType] = useState<string>('');
  const [agencyFeeAmount, setAgencyFeeAmount] = useState<number>(0);
  const [agencyFeeDate, setAgencyFeeDate] = useState<string>('');
  const [agencyFeeRemark, setAgencyFeeRemark] = useState<string>('');
  
  // 获取学生详情
  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/student-fees/${resolvedParams.id}`);
      const result = await response.json();
      if (result.data) {
        setStudent(result.data);
        // 同时获取代办费扣除项目
        fetchAgencyFeeItems();
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

  // 获取代办费扣除项目
  const fetchAgencyFeeItems = async () => {
    try {
      const response = await fetch(`/api/agency-fee-items?studentId=${resolvedParams.id}`);
      const result = await response.json();
      if (result.data) {
        setAgencyFeeItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch agency fee items:', error);
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

  // 提交代办费扣除
  const submitAgencyFeeItem = async () => {
    if (!agencyFeeItemType || agencyFeeAmount <= 0 || !agencyFeeDate) {
      alert('请填写完整信息');
      return;
    }
    
    try {
      const response = await fetch('/api/agency-fee-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student?.id,
          itemType: agencyFeeItemType,
          amount: agencyFeeAmount,
          deductDate: agencyFeeDate,
          remark: agencyFeeRemark || null,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        setAgencyFeeDialogOpen(false);
        setAgencyFeeItemType('');
        setAgencyFeeAmount(0);
        setAgencyFeeDate('');
        setAgencyFeeRemark('');
        fetchStudent();
        fetchAgencyFeeItems();
      } else {
        alert(result.error || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add agency fee item:', error);
      alert('添加失败');
    }
  };

  // 删除代办费扣除
  const deleteAgencyFeeItem = async (id: number) => {
    if (!confirm('确定要删除这条扣除记录吗？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/agency-fee-items?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchStudent();
        fetchAgencyFeeItems();
      } else {
        const result = await response.json();
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete agency fee item:', error);
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
      {/* 顶部导航栏 - 固定置顶 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
              <div className="h-4 w-px bg-gray-300 mx-2" />
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/login');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                退出
              </Button>
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label className="text-gray-500">姓名</Label>
                <div className="font-semibold text-lg">{student.student_name}</div>
              </div>
              <div>
                <Label className="text-gray-500">班级</Label>
                <div className="font-semibold text-lg">{student.class_name}</div>
              </div>
              <div>
                <Label className="text-gray-500">性别</Label>
                <div className="font-semibold">{student.gender || '男'}</div>
              </div>
              <div>
                <Label className="text-gray-500">午托状态</Label>
                <div className="font-semibold">
                  <span className={`text-xs px-2 py-1 rounded ${student.nap_fee > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {student.nap_fee > 0 ? '午托' : '走读'}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">备注</Label>
                <div className="text-sm truncate">{student.remark || '-'}</div>
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
            <div className="flex items-center justify-between">
              <CardDescription>点击"添加交费"按钮记录交费，或使用"批量录入"一次录入多项费用</CardDescription>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  setBatchPaymentDate(getTodayString());
                  setBatchPayments(FEE_ITEMS.map(item => ({ feeType: item.key, amount: 0 })));
                  setBatchPaymentRemark('');
                  setBatchPaymentDialogOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                批量录入
              </Button>
            </div>
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
                  {FEE_ITEMS.filter(item => item.key !== 'agency').map(item => {
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
                  {/* 代办费行（特殊处理） */}
                  <TableRow className="bg-purple-50">
                    <TableCell className="font-medium">代办费</TableCell>
                    <TableCell className="text-right">{(student.agency_fee || 600).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-purple-600 font-semibold">
                      已扣除: {(student.agencyUsed || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600">
                      余额: {(student.agencyBalance || student.agency_fee || 600).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        一次性收齐
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-600 text-purple-600 hover:bg-purple-100"
                        onClick={() => setAgencyFeeDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        添加扣除
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* 合计行 */}
                  <TableRow className="bg-blue-50 font-semibold">
                    <TableCell>合计</TableCell>
                    <TableCell className="text-right text-blue-700">
                      {(FEE_ITEMS.filter(i => i.key !== 'agency').reduce((sum, item) => sum + (student[item.field] as number), 0) + (student.agency_fee || 600)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {FEE_ITEMS.filter(i => i.key !== 'agency').reduce((sum, item) => sum + (student.paymentsByType[item.key]?.total || 0), 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {FEE_ITEMS.filter(i => i.key !== 'agency').reduce((sum, item) => {
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

        {/* 代办费扣除记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              代办费扣除记录
            </CardTitle>
            <CardDescription>
              代办费余额: {(student.agencyBalance || student.agency_fee || 600).toFixed(2)} 元
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agencyFeeItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无扣除记录
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>项目</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyFeeItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-gray-500">{formatDate(item.deduct_date)}</TableCell>
                      <TableCell className="font-medium">{AGENCY_FEE_ITEM_TYPE_MAP[item.item_type]}</TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">-{item.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-gray-500">{item.remark || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteAgencyFeeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {/* 批量录入交费对话框 */}
      <Dialog open={batchPaymentDialogOpen} onOpenChange={setBatchPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              批量录入交费
            </DialogTitle>
            <DialogDescription>
              为 {student?.student_name} 批量录入多项费用
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* 交费日期 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">交费日期 *</Label>
              <Input
                type="date"
                value={batchPaymentDate}
                onChange={(e) => setBatchPaymentDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            {/* 费用项目列表 */}
            <div className="border-t pt-4">
              <Label className="mb-3 block">费用项目和金额</Label>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {FEE_ITEMS.map((item) => {
                  const expected = student ? (student[item.field] as number) : 0;
                  const paid = student ? (student.paymentsByType[item.key]?.total || 0) : 0;
                  const remaining = expected - paid;
                  const payment = batchPayments.find(p => p.feeType === item.key);
                  
                  return (
                    <div key={item.key} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={(payment?.amount || 0) > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBatchPayments(batchPayments.map(p =>
                              p.feeType === item.key ? { ...p, amount: remaining > 0 ? remaining : 0 } : p
                            ));
                          } else {
                            setBatchPayments(batchPayments.map(p =>
                              p.feeType === item.key ? { ...p, amount: 0 } : p
                            ));
                          }
                        }}
                        className="h-4 w-4"
                        disabled={expected === 0}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-gray-500">
                          应交: {expected.toFixed(0)} | 已交: {paid.toFixed(0)} | 欠费: {remaining > 0 ? remaining.toFixed(0) : '0'}
                        </div>
                      </div>
                      <Input
                        type="number"
                        value={payment?.amount || ''}
                        onChange={(e) => {
                          const amount = Number(e.target.value);
                          setBatchPayments(batchPayments.map(p =>
                            p.feeType === item.key ? { ...p, amount } : p
                          ));
                        }}
                        placeholder="金额"
                        className="w-24"
                        disabled={expected === 0}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 备注 */}
            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
              <Label className="text-right">备注</Label>
              <Input
                value={batchPaymentRemark}
                onChange={(e) => setBatchPaymentRemark(e.target.value)}
                className="col-span-3"
                placeholder="备注信息（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchPaymentDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={async () => {
                const validPayments = batchPayments.filter(p => p.amount > 0);
                if (validPayments.length === 0) {
                  alert('请至少填写一项费用金额');
                  return;
                }
                if (!batchPaymentDate) {
                  alert('请选择交费日期');
                  return;
                }
                
                try {
                  const response = await fetch('/api/payments/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      payments: validPayments.map(p => ({
                        studentId: student?.id,
                        feeType: p.feeType,
                        amount: p.amount,
                      })),
                      paymentDate: batchPaymentDate,
                      remark: batchPaymentRemark || null,
                    }),
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok) {
                    alert(result.message);
                    setBatchPaymentDialogOpen(false);
                    fetchStudent();
                  } else {
                    alert(result.error || '批量录入失败');
                  }
                } catch (error) {
                  console.error('Failed to batch payment:', error);
                  alert('批量录入失败');
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={batchPayments.filter(p => p.amount > 0).length === 0 || !batchPaymentDate}
            >
              确认录入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加代办费扣除对话框 */}
      <Dialog open={agencyFeeDialogOpen} onOpenChange={setAgencyFeeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              添加代办费扣除
            </DialogTitle>
            <DialogDescription>
              当前余额: {(student.agencyBalance || student.agency_fee || 600).toFixed(2)} 元
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">扣除项目 *</Label>
              <select
                value={agencyFeeItemType}
                onChange={(e) => setAgencyFeeItemType(e.target.value)}
                className="col-span-3 p-2 border rounded-md"
              >
                <option value="">请选择项目</option>
                {AGENCY_FEE_ITEMS.map((type) => (
                  <option key={type.key} value={type.key}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">扣除金额 *</Label>
              <Input
                type="number"
                value={agencyFeeAmount || ''}
                onChange={(e) => setAgencyFeeAmount(Number(e.target.value))}
                className="col-span-3"
                placeholder="请输入扣除金额"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">扣除日期 *</Label>
              <Input
                type="date"
                value={agencyFeeDate}
                onChange={(e) => setAgencyFeeDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">备注</Label>
              <Input
                value={agencyFeeRemark}
                onChange={(e) => setAgencyFeeRemark(e.target.value)}
                className="col-span-3"
                placeholder="备注信息（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgencyFeeDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={submitAgencyFeeItem}
              disabled={!agencyFeeItemType || agencyFeeAmount <= 0 || !agencyFeeDate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              确认扣除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
