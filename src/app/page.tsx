'use client';

import { useState, useEffect, useRef } from 'react';
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
  Upload, 
  Download, 
  RefreshCw,
  Users,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { FEE_ITEMS } from '@/lib/constants';

// 类型定义
interface StudentFee {
  id: number;
  class_name: string;
  student_name: string;
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    className: '',
    studentName: '',
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
  
  // 导入预览数据
  const [importData, setImportData] = useState<Array<Record<string, unknown>>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 下载导入模板
  const downloadTemplate = () => {
    const headers = ['班级', '姓名', '学费', '午餐费', '午托费', '课后服务费', '社团费', '其他费用', '备注'];
    const csvContent = headers.join(',') + '\n';
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '学生费用导入模板.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // 解析CSV文件
  const parseCSV = (text: string): Array<Record<string, unknown>> => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data: Array<Record<string, unknown>> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 2) continue;
      
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        row[header] = value;
      });
      data.push(row);
    }
    
    return data;
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const data = parseCSV(text);
    setImportData(data);
    setImportDialogOpen(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 确认导入
  const confirmImport = async () => {
    if (importData.length === 0) return;
    
    const formattedData = importData.map(row => ({
      className: String(row['班级'] || ''),
      studentName: String(row['姓名'] || ''),
      tuitionFee: Number(row['学费'] || 0),
      lunchFee: Number(row['午餐费'] || 0),
      napFee: Number(row['午托费'] || 0),
      afterSchoolFee: Number(row['课后服务费'] || 0),
      clubFee: Number(row['社团费'] || 0),
      otherFee: Number(row['其他费用'] || 0),
      remark: String(row['备注'] || ''),
    }));
    
    try {
      const response = await fetch('/api/student-fees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: formattedData }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        setImportDialogOpen(false);
        setImportData([]);
        fetchClasses();
        fetchStudents();
      } else {
        alert(result.error || '导入失败');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('导入失败');
    }
  };

  // 导出数据
  const exportData = () => {
    if (students.length === 0) {
      alert('没有数据可导出');
      return;
    }
    
    const headers = ['班级', '姓名', '学费应交', '学费已交', '午餐费应交', '午餐费已交', '午托费应交', '午托费已交', '课后服务费应交', '课后服务费已交', '社团费应交', '社团费已交', '其他费用应交', '其他费用已交', '应交合计', '已交合计', '备注'];
    const rows = students.map(student => {
      const { totalFee, totalPaid } = calculateStudentTotals(student);
      return [
        student.class_name,
        student.student_name,
        student.tuition_fee || 0,
        student.tuition_paid || 0,
        student.lunch_fee || 0,
        student.lunch_paid || 0,
        student.nap_fee || 0,
        student.nap_paid || 0,
        student.after_school_fee || 0,
        student.after_school_paid || 0,
        student.club_fee || 0,
        student.club_paid || 0,
        student.other_fee || 0,
        student.other_paid || 0,
        totalFee,
        totalPaid,
        student.remark || '',
      ];
    });
    
    const totals = calculateTotals();
    rows.push(['合计', '', totals.tuition_fee, totals.tuition_paid, totals.lunch_fee, totals.lunch_paid, totals.nap_fee, totals.nap_paid, totals.after_school_fee, totals.after_school_paid, totals.club_fee, totals.club_paid, totals.other_fee, totals.other_paid, totals.total_fee, totals.total_paid, '']);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedClass}_费用明细.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                onClick={downloadTemplate}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                下载模板
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                批量导入
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                onClick={exportData}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                导出数据
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
                      <TableCell colSpan={2} className="text-center">合计</TableCell>
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

      {/* 导入预览对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>导入预览</DialogTitle>
            <DialogDescription>
              共解析到 {importData.length} 条数据，确认无误后点击导入
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {importData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(importData[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i}>{String(value)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importData.length > 10 && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    还有 {importData.length - 10} 条数据未显示...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                没有解析到有效数据
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportData([]); }}>
              取消
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={importData.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
