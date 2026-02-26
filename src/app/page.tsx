'use client';

import { useState, useEffect } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Users,
  DollarSign,
  ExternalLink,
  CreditCard,
  Settings,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { FEE_ITEMS } from '@/lib/constants';

// 类型定义
interface StudentFee {
  id: number;
  class_name: string;
  student_name: string;
  gender: string;
  nap_status: string;
  enrollment_status: string;
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
  remark: string | null;
  created_at: string;
  updated_at: string | null;
}

interface FeeTotals {
  tuition_fee: number; tuition_paid: number;
  lunch_fee: number; lunch_paid: number;
  nap_fee: number; nap_paid: number;
  after_school_fee: number; after_school_paid: number;
  club_fee: number; club_paid: number;
  other_fee: number; other_paid: number;
  total_fee: number; total_paid: number;
}

// 统计数据类型
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

interface Statistics {
  classStats: ClassStat[];
  monthlyStats: MonthlyStat[];
  schoolTotal: SchoolTotal;
}

// 格式化日期
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Home() {
  const router = useRouter();
  // 状态管理
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 对话框状态
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchPaymentDialogOpen, setBatchPaymentDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  
  // 统计数据
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // 批量录入状态
  const [batchPaymentData, setBatchPaymentData] = useState<{
    selectedStudents: number[];
    payments: Array<{ feeType: string; amount: number }>;
    paymentDate: string;
    remark: string;
  }>({
    selectedStudents: [],
    payments: [],
    paymentDate: '',
    remark: '',
  });
  
  // 表单数据
  const [formData, setFormData] = useState({
    className: '',
    studentName: '',
    gender: '男',
    napStatus: '走读',
    enrollmentStatus: '学籍',
    tuitionFee: 0,
    lunchFee: 0,
    napFee: 0,
    afterSchoolFee: 0,
    clubFee: 0,
    otherFee: 0,
    remark: '',
  });
  
  // 表单校验警告
  const [formWarnings, setFormWarnings] = useState<Record<string, string>>({});

  // 获取班级列表
  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/student-fees?action=classes');
      const result = await response.json();
      if (result.data) {
        setClasses(result.data);
        if (result.data.length > 0 && !selectedClass) {
          setSelectedClass(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  // 获取学生费用列表
  const fetchStudents = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/student-fees?className=${encodeURIComponent(selectedClass)}`);
      const result = await response.json();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/statistics');
      const result = await response.json();
      if (response.ok) {
        setStatistics(result);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 打开统计对话框
  const openStatsDialog = () => {
    fetchStatistics();
    setStatsDialogOpen(true);
  };

  // 初始化加载
  useEffect(() => {
    fetchClasses();
  }, []);

  // 班级变化时重新加载
  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  // 计算费用总计
  const calculateTotals = (): FeeTotals => {
    const totals: FeeTotals = {
      tuition_fee: 0, tuition_paid: 0,
      lunch_fee: 0, lunch_paid: 0,
      nap_fee: 0, nap_paid: 0,
      after_school_fee: 0, after_school_paid: 0,
      club_fee: 0, club_paid: 0,
      other_fee: 0, other_paid: 0,
      total_fee: 0, total_paid: 0,
    };
    
    students.forEach(student => {
      totals.tuition_fee += student.tuition_fee || 0;
      totals.tuition_paid += student.tuition_paid || 0;
      totals.lunch_fee += student.lunch_fee || 0;
      totals.lunch_paid += student.lunch_paid || 0;
      totals.nap_fee += student.nap_fee || 0;
      totals.nap_paid += student.nap_paid || 0;
      totals.after_school_fee += student.after_school_fee || 0;
      totals.after_school_paid += student.after_school_paid || 0;
      totals.club_fee += student.club_fee || 0;
      totals.club_paid += student.club_paid || 0;
      totals.other_fee += student.other_fee || 0;
      totals.other_paid += student.other_paid || 0;
    });
    
    totals.total_fee = 
      totals.tuition_fee + totals.lunch_fee + totals.nap_fee + 
      totals.after_school_fee + totals.club_fee + totals.other_fee;
    totals.total_paid = 
      totals.tuition_paid + totals.lunch_paid + totals.nap_paid + 
      totals.after_school_paid + totals.club_paid + totals.other_paid;
    
    return totals;
  };

  // 计算单个学生总费用
  const calculateStudentTotals = (student: StudentFee) => {
    const totalFee = 
      (student.tuition_fee || 0) + (student.lunch_fee || 0) + (student.nap_fee || 0) +
      (student.after_school_fee || 0) + (student.club_fee || 0) + (student.other_fee || 0);
    const totalPaid = 
      (student.tuition_paid || 0) + (student.lunch_paid || 0) + (student.nap_paid || 0) +
      (student.after_school_paid || 0) + (student.club_paid || 0) + (student.other_paid || 0);
    return { totalFee, totalPaid };
  };

  // 打开新增对话框
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setFormData({
      className: selectedClass,
      studentName: '',
      gender: '男',
      napStatus: '走读',
      enrollmentStatus: '学籍',
      tuitionFee: 0,
      lunchFee: 0,
      napFee: 0,
      afterSchoolFee: 0,
      clubFee: 0,
      otherFee: 0,
      remark: '',
    });
    setFormWarnings({});
    setStudentDialogOpen(true);
  };

  // 打开修改对话框
  const handleEditStudent = (student: StudentFee) => {
    setSelectedStudent(student);
    setFormData({
      className: student.class_name,
      studentName: student.student_name,
      gender: student.gender || '男',
      napStatus: student.nap_status || '走读',
      enrollmentStatus: student.enrollment_status || '学籍',
      tuitionFee: student.tuition_fee || 0,
      lunchFee: student.lunch_fee || 0,
      napFee: student.nap_fee || 0,
      afterSchoolFee: student.after_school_fee || 0,
      clubFee: student.club_fee || 0,
      otherFee: student.other_fee || 0,
      remark: student.remark || '',
    });
    setFormWarnings({});
    setStudentDialogOpen(true);
  };

  // 打开删除确认对话框
  const handleDeleteConfirm = (student: StudentFee) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const url = selectedStudent 
        ? `/api/student-fees/${selectedStudent.id}` 
        : '/api/student-fees';
      const method = selectedStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className: formData.className,
          studentName: formData.studentName,
          gender: formData.gender,
          napStatus: formData.napStatus,
          enrollmentStatus: formData.enrollmentStatus,
          tuitionFee: Number(formData.tuitionFee),
          lunchFee: Number(formData.lunchFee),
          napFee: Number(formData.napFee),
          afterSchoolFee: Number(formData.afterSchoolFee),
          clubFee: Number(formData.clubFee),
          otherFee: Number(formData.otherFee),
          remark: formData.remark || null,
        }),
      });
      
      if (response.ok) {
        setStudentDialogOpen(false);
        fetchClasses();
        fetchStudents();
      } else {
        const error = await response.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save student:', error);
      alert('保存失败');
    }
  };

  // 删除学生
  const handleDelete = async () => {
    if (!selectedStudent) return;
    
    try {
      const response = await fetch(`/api/student-fees/${selectedStudent.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setDeleteDialogOpen(false);
        fetchStudents();
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('删除失败');
    }
  };

  const totals = calculateTotals();

  // 渲染费用单元格（应交/已交格式）
  const renderFeeCell = (fee: number, paid: number) => {
    const isPaid = paid > 0;
    const isFull = paid >= fee && fee > 0;
    
    return (
      <div className="text-right">
        <div className={isFull ? 'text-green-600 font-medium' : ''}>
          {fee.toFixed(0)}/{paid.toFixed(0)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 - 固定置顶 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                学校费用统计系统
              </h1>
            </div>
            
            {/* 导航按钮 */}
            <nav className="flex items-center gap-2">
              <Button
                onClick={handleAddStudent}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                新增学生
              </Button>
              
              <Button
                onClick={() => setBatchPaymentDialogOpen(true)}
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                批量录入
              </Button>
              
              <Button
                onClick={openStatsDialog}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                统计
              </Button>
              
              <Button
                onClick={() => router.push('/admin')}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                后台管理
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 班级选择 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              班级选择
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="class-select" className="whitespace-nowrap">选择班级：</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class-select" className="w-[200px]">
                    <SelectValue placeholder="请选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={() => { fetchClasses(); fetchStudents(); }}
                variant="outline"
                size="icon"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              {selectedClass && (
                <div className="text-sm text-gray-500">
                  共 <span className="font-semibold text-gray-900">{students.length}</span> 名学生
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 费用明细表格 */}
        <Card>
          <CardHeader>
            <CardTitle>费用明细</CardTitle>
            <CardDescription>
              {selectedClass ? `班级：${selectedClass} | 格式：应交/已交 | 点击姓名查看详情` : '请先选择班级'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedClass ? (
              <div className="text-center py-8 text-gray-500">
                请先选择一个班级
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无数据，点击"新增学生"添加或"批量导入"数据
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">序号</TableHead>
                      <TableHead className="font-semibold">姓名</TableHead>
                      <TableHead className="font-semibold text-center">性别</TableHead>
                      <TableHead className="font-semibold text-center">午托</TableHead>
                      <TableHead className="font-semibold text-center">学籍</TableHead>
                      <TableHead className="font-semibold text-right">学费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">午餐费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">午托费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">课后服务费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">社团费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">其他费用<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">合计<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold">备注</TableHead>
                      <TableHead className="font-semibold text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => {
                      const { totalFee, totalPaid } = calculateStudentTotals(student);
                      return (
                        <TableRow key={student.id} className="hover:bg-gray-50">
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => router.push(`/students/${student.id}`)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              {student.student_name}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell className="text-center">{student.gender || '男'}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${(student.nap_status || '走读') === '午托' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {student.nap_status || '走读'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${(student.enrollment_status || '学籍') === '学籍' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              {student.enrollment_status || '学籍'}
                            </span>
                          </TableCell>
                          <TableCell>{renderFeeCell(student.tuition_fee, student.tuition_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.lunch_fee, student.lunch_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.nap_fee, student.nap_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.after_school_fee, student.after_school_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.club_fee, student.club_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.other_fee, student.other_paid)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className={totalPaid >= totalFee && totalFee > 0 ? 'text-green-600' : 'text-blue-600'}>
                              {totalFee.toFixed(0)}/{totalPaid.toFixed(0)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate">{student.remark || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                onClick={() => handleEditStudent(student)}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteConfirm(student)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* 合计行 */}
                    <TableRow className="bg-blue-50 font-semibold">
                      <TableCell colSpan={5} className="text-center">合计</TableCell>
                      <TableCell className="text-right">
                        <div>{totals.tuition_fee.toFixed(0)}/{totals.tuition_paid.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{totals.lunch_fee.toFixed(0)}/{totals.lunch_paid.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{totals.nap_fee.toFixed(0)}/{totals.nap_paid.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{totals.after_school_fee.toFixed(0)}/{totals.after_school_paid.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{totals.club_fee.toFixed(0)}/{totals.club_paid.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{totals.other_fee.toFixed(0)}/{totals.other_paid.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right text-lg text-blue-700">
                        {totals.total_fee.toFixed(0)}/{totals.total_paid.toFixed(0)}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 学生表单对话框 */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? '修改学生费用' : '新增学生费用'}
            </DialogTitle>
            <DialogDescription>
              填写学生应交费用信息。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">班级 *</Label>
              <Input
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                className="col-span-3"
                placeholder="请输入班级"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">姓名 *</Label>
              <Input
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                className="col-span-3"
                placeholder="请输入学生姓名"
              />
            </div>
            
            {/* 性别 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">性别</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="请选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 午托状态 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">午托状态</Label>
              <Select value={formData.napStatus} onValueChange={(value) => setFormData({ ...formData, napStatus: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="请选择午托状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="午托">午托</SelectItem>
                  <SelectItem value="走读">走读</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 学籍状态 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">学籍状态</Label>
              <Select value={formData.enrollmentStatus} onValueChange={(value) => setFormData({ ...formData, enrollmentStatus: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="请选择学籍状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="学籍">学籍</SelectItem>
                  <SelectItem value="借读">借读</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 学费 */}
            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
              <Label className="text-right font-semibold text-blue-600">学费</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.tuitionFee || ''}
                  onChange={(e) => setFormData({ ...formData, tuitionFee: Number(e.target.value) })}
                  placeholder="请输入学费金额"
                />
              </div>
            </div>
            
            {/* 午餐费 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-blue-600">午餐费</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.lunchFee || ''}
                  onChange={(e) => setFormData({ ...formData, lunchFee: Number(e.target.value) })}
                  placeholder="请输入午餐费金额"
                />
              </div>
            </div>
            
            {/* 午托费 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-blue-600">午托费</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.napFee || ''}
                  onChange={(e) => setFormData({ ...formData, napFee: Number(e.target.value) })}
                  placeholder="请输入午托费金额"
                />
              </div>
            </div>
            
            {/* 课后服务费 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-blue-600">课后服务费</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.afterSchoolFee || ''}
                  onChange={(e) => setFormData({ ...formData, afterSchoolFee: Number(e.target.value) })}
                  placeholder="请输入课后服务费金额"
                />
              </div>
            </div>
            
            {/* 社团费 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-blue-600">社团费</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.clubFee || ''}
                  onChange={(e) => setFormData({ ...formData, clubFee: Number(e.target.value) })}
                  placeholder="请输入社团费金额"
                />
              </div>
            </div>
            
            {/* 其他费用 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-blue-600">其他费用</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.otherFee || ''}
                  onChange={(e) => setFormData({ ...formData, otherFee: Number(e.target.value) })}
                  placeholder="请输入其他费用金额"
                />
              </div>
            </div>
            
            {/* 备注 */}
            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
              <Label className="text-right">备注</Label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                className="col-span-3"
                placeholder="备注信息（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.className || !formData.studentName}
              className="bg-blue-600 hover:bg-blue-700"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除学生 "{selectedStudent?.student_name}" 的费用记录吗？此操作将同时删除所有交费记录，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量录入交费对话框 */}
      <Dialog open={batchPaymentDialogOpen} onOpenChange={setBatchPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              批量录入交费
            </DialogTitle>
            <DialogDescription>
              选择学生和费用项目，批量录入交费记录。支持多学生多项目同时录入。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* 交费日期 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">交费日期 *</Label>
              <Input
                type="date"
                value={batchPaymentData.paymentDate}
                onChange={(e) => setBatchPaymentData({ ...batchPaymentData, paymentDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            {/* 选择学生 */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">选择学生（可多选）</Label>
              <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                {students.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">暂无学生数据</div>
                ) : (
                  <div className="divide-y">
                    {students.map((student) => {
                      const isSelected = batchPaymentData.selectedStudents.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBatchPaymentData({
                                  ...batchPaymentData,
                                  selectedStudents: [...batchPaymentData.selectedStudents, student.id],
                                });
                              } else {
                                setBatchPaymentData({
                                  ...batchPaymentData,
                                  selectedStudents: batchPaymentData.selectedStudents.filter(id => id !== student.id),
                                });
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <span className="font-medium">{student.student_name}</span>
                          <span className="text-sm text-gray-500">({student.class_name})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBatchPaymentData({
                    ...batchPaymentData,
                    selectedStudents: students.map(s => s.id),
                  })}
                >
                  全选
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBatchPaymentData({
                    ...batchPaymentData,
                    selectedStudents: [],
                  })}
                >
                  清空
                </Button>
              </div>
            </div>
            
            {/* 选择费用项目和金额 */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">费用项目和金额</Label>
              <div className="space-y-3">
                {FEE_ITEMS.map((item) => {
                  const existingPayment = batchPaymentData.payments.find(p => p.feeType === item.key);
                  return (
                    <div key={item.key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!existingPayment}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBatchPaymentData({
                              ...batchPaymentData,
                              payments: [...batchPaymentData.payments, { feeType: item.key, amount: 0 }],
                            });
                          } else {
                            setBatchPaymentData({
                              ...batchPaymentData,
                              payments: batchPaymentData.payments.filter(p => p.feeType !== item.key),
                            });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label className="w-24">{item.label}</Label>
                      <Input
                        type="number"
                        value={existingPayment?.amount || ''}
                        onChange={(e) => {
                          const newPayments = batchPaymentData.payments.map(p =>
                            p.feeType === item.key ? { ...p, amount: Number(e.target.value) } : p
                          );
                          setBatchPaymentData({ ...batchPaymentData, payments: newPayments });
                        }}
                        placeholder="金额"
                        className="w-32"
                        disabled={!existingPayment}
                      />
                      <span className="text-sm text-gray-500">元</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 备注 */}
            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
              <Label className="text-right">备注</Label>
              <Input
                value={batchPaymentData.remark}
                onChange={(e) => setBatchPaymentData({ ...batchPaymentData, remark: e.target.value })}
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
                if (batchPaymentData.selectedStudents.length === 0) {
                  alert('请选择至少一个学生');
                  return;
                }
                const validPayments = batchPaymentData.payments.filter(p => p.amount > 0);
                if (validPayments.length === 0) {
                  alert('请至少填写一项费用金额');
                  return;
                }
                if (!batchPaymentData.paymentDate) {
                  alert('请选择交费日期');
                  return;
                }
                
                // 构建批量录入数据
                const payments = batchPaymentData.selectedStudents.flatMap(studentId =>
                  validPayments.map(payment => ({
                    studentId,
                    feeType: payment.feeType,
                    amount: payment.amount,
                  }))
                );
                
                try {
                  const response = await fetch('/api/payments/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      payments,
                      paymentDate: batchPaymentData.paymentDate,
                      remark: batchPaymentData.remark || null,
                    }),
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok) {
                    alert(result.message);
                    setBatchPaymentDialogOpen(false);
                    setBatchPaymentData({
                      selectedStudents: [],
                      payments: [],
                      paymentDate: '',
                      remark: '',
                    });
                    fetchStudents();
                  } else {
                    alert(result.error || '批量录入失败');
                  }
                } catch (error) {
                  console.error('Failed to batch payment:', error);
                  alert('批量录入失败');
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={batchPaymentData.selectedStudents.length === 0 || batchPaymentData.payments.filter(p => p.amount > 0).length === 0}
            >
              确认录入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 统计对话框 */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              费用统计
            </DialogTitle>
            <DialogDescription>
              全校交费情况统计
            </DialogDescription>
          </DialogHeader>
          
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">加载中...</span>
            </div>
          ) : statistics ? (
            <div className="py-4 space-y-6">
              {/* 全校汇总卡片 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    全校汇总
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {statistics.schoolTotal.student_count}
                      </div>
                      <div className="text-sm text-gray-500">学生总数</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        ¥{statistics.schoolTotal.total_paid.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">已收金额</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        ¥{(statistics.schoolTotal.total_fee - statistics.schoolTotal.total_paid).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">待收金额</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-6 gap-2 text-center text-sm">
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-semibold">学费</div>
                      <div className="text-gray-500">{statistics.schoolTotal.tuition_paid.toLocaleString()}/{statistics.schoolTotal.tuition_fee.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-semibold">午餐费</div>
                      <div className="text-gray-500">{statistics.schoolTotal.lunch_paid.toLocaleString()}/{statistics.schoolTotal.lunch_fee.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-semibold">午托费</div>
                      <div className="text-gray-500">{statistics.schoolTotal.nap_paid.toLocaleString()}/{statistics.schoolTotal.nap_fee.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-semibold">课后服务</div>
                      <div className="text-gray-500">{statistics.schoolTotal.after_school_paid.toLocaleString()}/{statistics.schoolTotal.after_school_fee.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-semibold">社团费</div>
                      <div className="text-gray-500">{statistics.schoolTotal.club_paid.toLocaleString()}/{statistics.schoolTotal.club_fee.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-semibold">其他</div>
                      <div className="text-gray-500">{statistics.schoolTotal.other_paid.toLocaleString()}/{statistics.schoolTotal.other_fee.toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 各班级交费情况 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">各班级交费情况</CardTitle>
                </CardHeader>
                <CardContent>
                  {statistics.classStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无数据</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">班级</TableHead>
                            <TableHead className="font-semibold text-center">人数</TableHead>
                            <TableHead className="font-semibold text-right">学费<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">午餐费<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">午托费<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">课后服务<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">社团费<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">其他<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">合计<br/><span className="font-normal text-xs">已交/应交</span></TableHead>
                            <TableHead className="font-semibold text-right">收缴率</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statistics.classStats.map((stat) => (
                            <TableRow key={stat.class_name}>
                              <TableCell className="font-medium">{stat.class_name}</TableCell>
                              <TableCell className="text-center">{stat.student_count}</TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-green-600">{stat.tuition_paid}</span>/<span>{stat.tuition_fee}</span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-green-600">{stat.lunch_paid}</span>/<span>{stat.lunch_fee}</span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-green-600">{stat.nap_paid}</span>/<span>{stat.nap_fee}</span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-green-600">{stat.after_school_paid}</span>/<span>{stat.after_school_fee}</span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-green-600">{stat.club_paid}</span>/<span>{stat.club_fee}</span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span className="text-green-600">{stat.other_paid}</span>/<span>{stat.other_fee}</span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                <span className="text-green-600">{stat.total_paid}</span>/<span>{stat.total_fee}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`px-2 py-1 rounded text-xs ${
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
                            <TableCell>合计</TableCell>
                            <TableCell className="text-center">{statistics.schoolTotal.student_count}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{statistics.schoolTotal.tuition_paid}</span>/{statistics.schoolTotal.tuition_fee}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{statistics.schoolTotal.lunch_paid}</span>/{statistics.schoolTotal.lunch_fee}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{statistics.schoolTotal.nap_paid}</span>/{statistics.schoolTotal.nap_fee}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{statistics.schoolTotal.after_school_paid}</span>/{statistics.schoolTotal.after_school_fee}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{statistics.schoolTotal.club_paid}</span>/{statistics.schoolTotal.club_fee}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600">{statistics.schoolTotal.other_paid}</span>/{statistics.schoolTotal.other_fee}
                            </TableCell>
                            <TableCell className="text-right text-lg">
                              <span className="text-green-600">{statistics.schoolTotal.total_paid}</span>/{statistics.schoolTotal.total_fee}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">每月交费情况</CardTitle>
                </CardHeader>
                <CardContent>
                  {statistics.monthlyStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无交费记录</div>
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
                            <TableHead className="font-semibold text-right">合计</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statistics.monthlyStats.map((stat) => (
                            <TableRow key={stat.month}>
                              <TableCell className="font-medium">{stat.month}</TableCell>
                              <TableCell className="text-right">
                                {stat.payments['tuition'] ? (
                                  <span>¥{stat.payments['tuition'].amount.toLocaleString()}</span>
                                ) : <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {stat.payments['lunch'] ? (
                                  <span>¥{stat.payments['lunch'].amount.toLocaleString()}</span>
                                ) : <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {stat.payments['nap'] ? (
                                  <span>¥{stat.payments['nap'].amount.toLocaleString()}</span>
                                ) : <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {stat.payments['after_school'] ? (
                                  <span>¥{stat.payments['after_school'].amount.toLocaleString()}</span>
                                ) : <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {stat.payments['club'] ? (
                                  <span>¥{stat.payments['club'].amount.toLocaleString()}</span>
                                ) : <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {stat.payments['other'] ? (
                                  <span>¥{stat.payments['other'].amount.toLocaleString()}</span>
                                ) : <span className="text-gray-400">-</span>}
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
            <div className="text-center py-8 text-gray-500">加载失败</div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
