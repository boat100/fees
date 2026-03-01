'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { authFetch, isAuthenticated, clearAuthToken } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  LogOut,
  Download,
  ArrowLeft,
  BarChart3,
  Upload,
  CheckSquare,
  Square
} from 'lucide-react';

// 类型定义
interface StudentFee {
  id: number;
  class_name: string;
  student_name: string;
  gender: string;
  nap_status: string;
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
  agency_balance: number;
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
  agency_fee: number; agency_paid: number; agency_balance: number;
  total_fee: number; total_paid: number;
}

// 格式化日期
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 获取今天的日期字符串
const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

function FeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 从URL参数获取班级
  const classFromUrl = searchParams.get('class');
  
  // 状态管理
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(classFromUrl || '');
  const [students, setStudents] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 操作状态
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 多选模式状态
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // 对话框状态
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  const [editFeeDialogOpen, setEditFeeDialogOpen] = useState(false);
  const [editFeeStudent, setEditFeeStudent] = useState<StudentFee | null>(null);
  
  // 导出状态
  const [exportingClass, setExportingClass] = useState(false);
  const [exportingAgency, setExportingAgency] = useState(false);
  const [exportingSchool, setExportingSchool] = useState(false);
  
  // 导出班级数据对话框
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'fee_detail' | 'payment_records'>('fee_detail');
  
  // 添加班级对话框
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  // 导入状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<Array<{
    className: string;
    studentName: string;
    gender: string;
    tuitionFee: number;
    tuitionPaid: number;
    lunchFee: number;
    lunchPaid: number;
    napFee: number;
    napPaid: number;
    afterSchoolFee: number;
    afterSchoolPaid: number;
    clubFee: number;
    clubPaid: number;
    agencyFee: number;
    agencyPaid: number;
    paymentDate: string;
    remark: string;
  }>>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    insertCount?: number;
    updateCount?: number;
    total?: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    className: '',
    studentName: '',
    gender: '男',
    tuitionFee: 0,
    lunchFee: 0,
    napFee: 0,
    afterSchoolFee: 0,
    clubFee: 0,
    agencyFee: 600,
    agencyPaid: 600,
    remark: '',
  });
  
  // 表单校验警告
  const [formWarnings, setFormWarnings] = useState<Record<string, string>>({});

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // 获取班级列表
  const fetchClasses = async () => {
    try {
      const response = await authFetch('/api/student-fees?action=classes');
      const result = await response.json();
      if (result.data) {
        setClasses(result.data);
        // 优先使用URL参数中的班级，其次使用当前选中的班级，最后使用第一个班级
        if (classFromUrl && result.data.includes(classFromUrl)) {
          setSelectedClass(classFromUrl);
        } else if (result.data.length > 0 && !selectedClass) {
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
      const response = await authFetch(`/api/student-fees?className=${encodeURIComponent(selectedClass)}`);
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
      agency_fee: 0, agency_paid: 0, agency_balance: 0,
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
      totals.agency_fee += student.agency_fee || 0;
      totals.agency_paid += student.agency_paid ?? student.agency_fee ?? 0;
      totals.agency_balance += student.agency_balance ?? 0;
    });
    
    totals.total_fee = 
      totals.tuition_fee + totals.lunch_fee + totals.nap_fee + 
      totals.after_school_fee + totals.club_fee + totals.agency_fee;
    totals.total_paid = 
      totals.tuition_paid + totals.lunch_paid + totals.nap_paid + 
      totals.after_school_paid + totals.club_paid + totals.agency_paid;
    
    return totals;
  };

  // 计算单个学生总费用
  const calculateStudentTotals = (student: StudentFee) => {
    const totalFee = 
      (student.tuition_fee || 0) + (student.lunch_fee || 0) + (student.nap_fee || 0) +
      (student.after_school_fee || 0) + (student.club_fee || 0) + (student.agency_fee || 0);
    const totalPaid = 
      (student.tuition_paid || 0) + (student.lunch_paid || 0) + (student.nap_paid || 0) +
      (student.after_school_paid || 0) + (student.club_paid || 0) + (student.agency_paid || 0);
    return { totalFee, totalPaid };
  };

  // 打开新增对话框
  const handleAddStudent = () => {
    if (!selectedClass) {
      toast.error('请先选择班级');
      return;
    }
    setSelectedStudent(null);
    setFormData({
      className: selectedClass,
      studentName: '',
      gender: '男',
      tuitionFee: 0,
      lunchFee: 0,
      napFee: 0,
      afterSchoolFee: 0,
      clubFee: 0,
      agencyFee: 600,
      agencyPaid: 600,
      remark: '',
    });
    setFormWarnings({});
    setStudentDialogOpen(true);
  };

  const handleAddClass = () => {
    setNewClassName('');
    setAddClassDialogOpen(true);
  };

  const handleSubmitAddClass = async () => {
    const trimmedName = newClassName.trim();
    if (!trimmedName) {
      toast.error('请输入班级名称');
      return;
    }
    
    if (classes.includes(trimmedName)) {
      toast.error('该班级已存在');
      return;
    }

    // 添加新班级到列表并选中
    setClasses(prev => [...prev, trimmedName].sort());
    setSelectedClass(trimmedName);
    setAddClassDialogOpen(false);
    toast.success(`班级"${trimmedName}"已添加`);
  };

  // 打开修改对话框
  const handleEditStudent = (student: StudentFee) => {
    setSelectedStudent(student);
    setFormData({
      className: student.class_name,
      studentName: student.student_name,
      gender: student.gender || '男',
      tuitionFee: student.tuition_fee || 0,
      lunchFee: student.lunch_fee || 0,
      napFee: student.nap_fee || 0,
      afterSchoolFee: student.after_school_fee || 0,
      clubFee: student.club_fee || 0,
      agencyFee: student.agency_fee || 600,
      agencyPaid: student.agency_paid ?? student.agency_fee ?? 600,
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

  // 提交表单（乐观更新）
  const handleSubmit = async () => {
    setSubmitting(true);
    
    // 新增时，agencyPaid 默认为 0；修改时保持原值
    const agencyPaidValue = selectedStudent 
      ? (formData.agencyPaid ?? formData.agencyFee ?? 0)
      : 0;
    
    // 准备学生数据
    const studentData = {
      class_name: formData.className,
      student_name: formData.studentName,
      gender: formData.gender,
      nap_status: (formData.napFee ?? 0) > 0 ? '午托' : '走读',
      tuition_fee: Number(formData.tuitionFee),
      lunch_fee: Number(formData.lunchFee),
      nap_fee: Number(formData.napFee),
      after_school_fee: Number(formData.afterSchoolFee),
      club_fee: Number(formData.clubFee),
      agency_fee: Number(formData.agencyFee) || 0,
      agency_paid: agencyPaidValue,
      tuition_paid: 0,
      lunch_paid: 0,
      nap_paid: 0,
      after_school_paid: 0,
      club_paid: 0,
      remark: formData.remark || null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    
    // 乐观更新：先更新本地状态
    const previousStudents = [...students];
    
    if (selectedStudent) {
      // 修改：更新本地学生数据
      setStudents(prev => prev.map(s => 
        s.id === selectedStudent.id 
          ? { ...s, ...studentData }
          : s
      ));
    } else {
      // 新增：临时添加到列表（使用临时ID）
      const tempId = Date.now();
      setStudents(prev => [...prev, { id: tempId, ...studentData } as StudentFee]);
    }
    
    setStudentDialogOpen(false);
    toast.loading(selectedStudent ? '正在修改...' : '正在添加...', { id: 'submit-student' });
    
    try {
      const url = selectedStudent 
        ? `/api/student-fees/${selectedStudent.id}` 
        : '/api/student-fees';
      const method = selectedStudent ? 'PUT' : 'POST';
      
      const response = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className: formData.className,
          studentName: formData.studentName,
          gender: formData.gender,
          tuitionFee: Number(formData.tuitionFee),
          lunchFee: Number(formData.lunchFee),
          napFee: Number(formData.napFee),
          afterSchoolFee: Number(formData.afterSchoolFee),
          clubFee: Number(formData.clubFee),
          agencyFee: Number(formData.agencyFee),
          agencyPaid: agencyPaidValue,
          remark: formData.remark || null,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(selectedStudent ? '修改成功' : '添加成功', { id: 'submit-student' });
        
        // 更新班级列表（如果有新班级）
        if (!classes.includes(formData.className)) {
          setClasses(prev => [...prev, formData.className].sort());
        }
        
        // 用服务器返回的真实数据更新列表
        if (selectedStudent) {
          setStudents(prev => prev.map(s => 
            s.id === selectedStudent.id 
              ? { ...s, ...result.data }
              : s
          ));
        } else {
          // 替换临时数据为真实数据
          fetchStudents();
        }
      } else {
        // 回滚
        setStudents(previousStudents);
        toast.error(result.error || '操作失败', { id: 'submit-student' });
      }
    } catch (error) {
      console.error('Failed to save student:', error);
      // 回滚
      setStudents(previousStudents);
      toast.error('保存失败，请重试', { id: 'submit-student' });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除学生（乐观更新）
  const handleDelete = async () => {
    if (!selectedStudent) return;
    
    setDeleting(true);
    
    // 乐观更新：先从本地移除
    const previousStudents = [...students];
    const deletedStudentClass = selectedStudent.class_name;
    const newStudentsList = students.filter(s => s.id !== selectedStudent.id);
    setStudents(newStudentsList);
    setDeleteDialogOpen(false);
    
    toast.loading('正在删除...', { id: 'delete-student' });
    
    try {
      const response = await authFetch(`/api/student-fees/${selectedStudent.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('删除成功', { id: 'delete-student' });
        
        // 检查当前班级是否还有学生，如果没有则删除班级
        if (newStudentsList.length === 0) {
          // 从班级列表中移除当前班级
          const newClasses = classes.filter(c => c !== deletedStudentClass);
          setClasses(newClasses);
          
          // 选择另一个班级
          if (newClasses.length > 0) {
            setSelectedClass(newClasses[0]);
          } else {
            setSelectedClass('');
          }
          
          toast.info(`${deletedStudentClass} 班级已无学生，已自动移除`, { duration: 3000 });
        }
      } else {
        // 回滚
        const result = await response.json();
        setStudents(previousStudents);
        toast.error(result.error || '删除失败', { id: 'delete-student' });
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      // 回滚
      setStudents(previousStudents);
      toast.error('删除失败，请重试', { id: 'delete-student' });
    } finally {
      setDeleting(false);
    }
  };

  // 批量删除学生
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setDeleting(true);
    
    // 乐观更新：先从本地移除
    const previousStudents = [...students];
    const idsArray = Array.from(selectedIds);
    const newStudentsList = students.filter(s => !selectedIds.has(s.id));
    setStudents(newStudentsList);
    setBatchDeleteDialogOpen(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    
    toast.loading(`正在删除 ${idsArray.length} 名学生...`, { id: 'batch-delete-student' });
    
    try {
      // 批量调用删除API
      const deletePromises = idsArray.map(id => 
        authFetch(`/api/student-fees/${id}`, {
          method: 'DELETE',
        })
      );
      
      const responses = await Promise.all(deletePromises);
      const failedCount = responses.filter(r => !r.ok).length;
      
      if (failedCount === 0) {
        toast.success(`成功删除 ${idsArray.length} 名学生`, { id: 'batch-delete-student' });
        
        // 检查当前班级是否还有学生
        if (newStudentsList.length === 0) {
          const newClasses = classes.filter(c => c !== selectedClass);
          setClasses(newClasses);
          
          if (newClasses.length > 0) {
            setSelectedClass(newClasses[0]);
          } else {
            setSelectedClass('');
          }
          
          toast.info(`${selectedClass} 班级已无学生，已自动移除`, { duration: 3000 });
        }
      } else {
        // 部分失败，刷新列表
        toast.error(`删除失败 ${failedCount} 条，请重试`, { id: 'batch-delete-student' });
        fetchStudents();
      }
    } catch (error) {
      console.error('Failed to batch delete students:', error);
      // 回滚
      setStudents(previousStudents);
      toast.error('批量删除失败，请重试', { id: 'batch-delete-student' });
    } finally {
      setDeleting(false);
    }
  };

  // 打开导出班级数据对话框
  const openExportDialog = () => {
    setExportDialogOpen(true);
  };

  // 导出班级数据
  const handleExportClass = async () => {
    if (!selectedClass) return;
    
    setExportingClass(true);
    try {
      // 根据选择导出不同类型
      const exportParam = exportType === 'fee_detail' ? 'class_detail' : 'class_payment_records';
      const url = `/api/export/stats?type=${exportParam}&class_name=${encodeURIComponent(selectedClass)}`;
      const response = await authFetch(url);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      // 获取文件 blob
      const blob = await response.blob();
      
      // 从响应头获取文件名
      const disposition = response.headers.get('Content-Disposition');
      let filename = exportType === 'fee_detail' 
        ? `${selectedClass}班级费用明细.xlsx`
        : `${selectedClass}班级缴费记录.xlsx`;
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
      
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请重试');
    } finally {
      setExportingClass(false);
    }
  };

  // 导出代办费明细
  const handleExportAgencyFee = async () => {
    if (!selectedClass) return;
    
    setExportingAgency(true);
    try {
      const url = `/api/export/stats?type=agency_fee_detail&class_name=${encodeURIComponent(selectedClass)}`;
      const response = await authFetch(url);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      // 获取文件 blob
      const blob = await response.blob();
      
      // 从响应头获取文件名
      const disposition = response.headers.get('Content-Disposition');
      let filename = `${selectedClass}代办费明细.xlsx`;
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
      setExportingAgency(false);
    }
  };

  // 导出全校数据（每个班级一个工作表）
  const handleExportSchool = async () => {
    setExportingSchool(true);
    try {
      const url = '/api/export/stats?type=school_all_classes';
      const response = await authFetch(url);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      // 获取文件 blob
      const blob = await response.blob();
      
      // 从响应头获取文件名
      const disposition = response.headers.get('Content-Disposition');
      let filename = '全校班级费用明细.xlsx';
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
      setExportingSchool(false);
    }
  };

  // 解析CSV行（处理引号包裹的字段）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // 解析CSV文件
  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const data: Array<Record<string, string>> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row);
    }
    
    return data;
  };

  // 检测是否包含乱码
  const hasGarbledText = (text: string): boolean => {
    return text.includes('\uFFFD') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text);
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      
      // 先尝试UTF-8解码
      const utf8Decoder = new TextDecoder('utf-8');
      let text = utf8Decoder.decode(buffer);
      
      // 如果UTF-8解码出现乱码，尝试GBK解码
      if (hasGarbledText(text)) {
        try {
          const gbkDecoder = new TextDecoder('gbk');
          text = gbkDecoder.decode(buffer);
        } catch {
          console.warn('GBK decode failed, using UTF-8');
        }
      }
      
      // 移除BOM标记
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      const data = parseCSV(text);
      
      if (data.length === 0) {
        toast.error('未能解析到有效数据，请检查文件格式');
        return;
      }
      
      // 获取今天日期作为默认缴费时间
      const today = new Date().toISOString().split('T')[0];
      
      // 转换数据格式
      const formattedData = data.map(row => ({
        className: String(row['班级'] || ''),
        studentName: String(row['姓名'] || ''),
        gender: String(row['性别'] || '男'),
        tuitionFee: Number(row['学费应交'] || row['学费'] || 0),
        tuitionPaid: Number(row['学费已交'] || 0),
        lunchFee: Number(row['午餐费应交'] || row['午餐费'] || 0),
        lunchPaid: Number(row['午餐费已交'] || 0),
        napFee: Number(row['午托费应交'] || row['午托费'] || 0),
        napPaid: Number(row['午托费已交'] || 0),
        afterSchoolFee: Number(row['课后服务费应交'] || row['课后服务费'] || 0),
        afterSchoolPaid: Number(row['课后服务费已交'] || 0),
        clubFee: Number(row['社团费应交'] || row['社团费'] || 0),
        clubPaid: Number(row['社团费已交'] || 0),
        agencyFee: Number(row['代办费应交'] || row['代办费'] || 600),
        agencyPaid: Number(row['代办费已交'] || 0),
        paymentDate: String(row['缴费时间'] || '').trim() || today,
        remark: String(row['备注'] || ''),
      }));
      
      setImportData(formattedData);
      setImportResult(null);
    } catch (error) {
      console.error('Failed to parse file:', error);
      toast.error('文件解析失败，请检查文件格式');
    }
    
    e.target.value = '';
  };

  // 执行导入
  const handleImport = async () => {
    if (importData.length === 0) {
      toast.error('没有可导入的数据');
      return;
    }

    setImportLoading(true);
    try {
      const response = await authFetch('/api/student-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // 构建成功消息
        let message = '';
        if (result.errors && result.errors.length > 0) {
          message = `成功导入 ${result.importedCount || result.insertCount + result.updateCount} 条，${result.errorCount} 条有错误`;
        } else {
          message = `导入成功！新增 ${result.insertCount || 0} 条，更新 ${result.updateCount || 0} 条`;
        }
        
        setImportResult({
          success: true,
          message,
          insertCount: result.insertCount,
          updateCount: result.updateCount,
          total: result.total,
          errors: result.errors
        });
        fetchClasses();
        fetchStudents();
      } else {
        setImportResult({
          success: false,
          message: result.error || '导入失败',
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Failed to import:', error);
      setImportResult({
        success: false,
        message: '导入失败，请重试'
      });
    } finally {
      setImportLoading(false);
    }
  };

  // 下载导入模板
  const downloadImportTemplate = () => {
    const headers = [
      '班级', '姓名', '性别',
      '学费应交', '学费已交',
      '午餐费应交', '午餐费已交',
      '午托费应交', '午托费已交',
      '课后服务费应交', '课后服务费已交',
      '社团费应交', '社团费已交',
      '代办费应交', '代办费已交',
      '缴费时间',
      '备注'
    ];
    
    const exampleData = [
      '一年级1班', '张三', '男',
      '5000', '5000',
      '800', '800',
      '500', '500',
      '300', '300',
      '200', '200',
      '600', '600',
      '2024-09-01',
      '示例备注'
    ];
    
    const csvContent = headers.join(',') + '\n' + exampleData.join(',') + '\n';
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '学生费用导入模板.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

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
            {/* 左侧：返回按钮 + 标题 */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <DollarSign className="h-7 w-7 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  收费管理
                </h1>
              </div>
            </div>
            
            {/* 右侧：功能按钮组 */}
            <nav className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setImportData([]);
                    setImportResult(null);
                    setImportDialogOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  导入
                </Button>
                
                <Button
                  onClick={handleExportSchool}
                  variant="outline"
                  size="sm"
                  disabled={exportingSchool}
                >
                  {exportingSchool ? (
                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1.5" />
                  )}
                  导出全校
                </Button>
                
                <Button
                  onClick={handleAddClass}
                  variant="outline"
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  添加班级
                </Button>
                
                <Button
                  onClick={() => router.push('/fees/stats')}
                  variant="outline"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  统计
                </Button>
              </div>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="退出登录"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 班级选择 */}
        <Card className="mb-6 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-600" />
              班级选择
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-4">
              {/* 第一行：班级选择和学生数量 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="class-select" className="whitespace-nowrap">选择班级：</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger id="class-select" className="w-[200px]">
                      <SelectValue placeholder="请选择班级" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px]">
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
                    {selectMode && selectedIds.size > 0 && (
                      <span className="ml-2 text-blue-600">已选 {selectedIds.size} 人</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* 第二行：操作按钮 */}
              {selectedClass && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                  <Button
                    onClick={handleAddStudent}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    新增学生
                  </Button>
                  
                  {students.length > 0 && (
                    <>
                      <Button
                        onClick={openExportDialog}
                        variant="outline"
                        size="sm"
                        disabled={exportingClass}
                      >
                        {exportingClass ? (
                          <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1.5" />
                        )}
                        导出班级数据
                      </Button>
                      <Button
                        onClick={handleExportAgencyFee}
                        variant="outline"
                        size="sm"
                        disabled={exportingAgency}
                      >
                        {exportingAgency ? (
                          <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1.5" />
                        )}
                        导出代办费明细
                      </Button>
                    </>
                  )}
                  
                  {/* 多选模式按钮 */}
                  {students.length > 0 && (
                    <>
                      <Button
                        onClick={() => {
                          setSelectMode(!selectMode);
                          setSelectedIds(new Set());
                        }}
                        variant={selectMode ? "default" : "outline"}
                        size="sm"
                        className={selectMode ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        <CheckSquare className="h-4 w-4 mr-1.5" />
                        {selectMode ? '取消多选' : '多选'}
                      </Button>
                      
                      {/* 多选模式下的批量操作按钮 */}
                      {selectMode && selectedIds.size > 0 && (
                        <Button
                          onClick={() => setBatchDeleteDialogOpen(true)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          批量删除 ({selectedIds.size})
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 费用明细表格 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">费用明细</CardTitle>
            <CardDescription>
              {selectedClass ? `班级：${selectedClass} | 格式：应交/已交 | 点击姓名查看详情` : '请先选择班级'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedClass ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>请先选择一个班级</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无数据</p>
                <p className="text-sm mt-1">点击&ldquo;新增学生&rdquo;添加或&ldquo;导入&rdquo;数据</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 border-b border-gray-200">
                      {selectMode && (
                        <TableHead className="w-12 bg-gray-100">
                          <Checkbox
                            checked={students.length > 0 && selectedIds.size === students.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set(students.map(s => s.id)));
                              } else {
                                setSelectedIds(new Set());
                              }
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead className="font-semibold bg-gray-100">序号</TableHead>
                      <TableHead className="font-semibold bg-gray-100">姓名</TableHead>
                      <TableHead className="font-semibold text-center bg-gray-100">性别</TableHead>
                      <TableHead className="font-semibold text-center bg-gray-100">午托</TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">学费<br/><span className="font-normal text-xs text-gray-500">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">午餐费<br/><span className="font-normal text-xs text-gray-500">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">午托费<br/><span className="font-normal text-xs text-gray-500">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">课后服务费<br/><span className="font-normal text-xs text-gray-500">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">社团费<br/><span className="font-normal text-xs text-gray-500">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">代办费<br/><span className="font-normal text-xs text-gray-500">应交/已交/剩余</span></TableHead>
                      <TableHead className="font-semibold text-right bg-gray-100">合计<br/><span className="font-normal text-xs text-gray-500">应交/已交</span></TableHead>
                      <TableHead className="font-semibold bg-gray-100">备注</TableHead>
                      <TableHead className="font-semibold text-center bg-gray-100 w-16">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => {
                      const { totalFee, totalPaid } = calculateStudentTotals(student);
                      return (
                        <TableRow key={student.id} className="hover:bg-gray-50">
                          {selectMode && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(student.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedIds);
                                  if (checked) {
                                    newSet.add(student.id);
                                  } else {
                                    newSet.delete(student.id);
                                  }
                                  setSelectedIds(newSet);
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => router.push(`/students/${student.id}?class=${encodeURIComponent(selectedClass)}`)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              {student.student_name}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell className="text-center">{student.gender || '男'}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${(student.lunch_fee > 0 || student.nap_fee > 0) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {(student.lunch_fee > 0 || student.nap_fee > 0) ? '午托' : '走读'}
                            </span>
                          </TableCell>
                          <TableCell>{renderFeeCell(student.tuition_fee, student.tuition_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.lunch_fee, student.lunch_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.nap_fee, student.nap_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.after_school_fee, student.after_school_paid)}</TableCell>
                          <TableCell>{renderFeeCell(student.club_fee, student.club_paid)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-purple-600 font-medium">
                              {student.agency_fee ?? 0}/{student.agency_paid ?? 0}/{student.agency_balance ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className={totalPaid >= totalFee && totalFee > 0 ? 'text-green-600' : 'text-blue-600'}>
                              {totalFee.toFixed(0)}/{totalPaid.toFixed(0)}
                            </div>
                          </TableCell>
                          <TableCell 
                            className="max-w-[100px] truncate"
                            title={student.remark || undefined}
                          >
                            {student.remark || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setEditFeeStudent(student);
                                setEditFeeDialogOpen(true);
                              }}
                              title="修改应交费用"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* 合计行 */}
                    <TableRow className="bg-blue-50 font-semibold">
                      <TableCell colSpan={selectMode ? 5 : 4} className="text-center">合计</TableCell>
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
                        <div className="text-purple-600">{totals.agency_fee.toFixed(0)}/{totals.agency_paid.toFixed(0)}/{totals.agency_balance.toFixed(0)}</div>
                      </TableCell>
                      <TableCell className="text-right text-blue-700">
                        {totals.total_fee.toFixed(0)}/{totals.total_paid.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center">-</TableCell>
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
              {selectedStudent ? (
                <Input
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入班级"
                />
              ) : (
                <div className="col-span-3 flex items-center">
                  <span className="font-medium text-gray-700">{formData.className}</span>
                  <span className="ml-2 text-xs text-gray-400">（当前班级）</span>
                </div>
              )}
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
                <SelectContent position="popper">
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
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
            
            {/* 代办费 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-purple-600">代办费</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={formData.agencyFee || ''}
                  onChange={(e) => setFormData({ ...formData, agencyFee: Number(e.target.value) })}
                  placeholder="默认600元，可修改为0"
                />
                <p className="text-xs text-gray-500 mt-1">代办费默认一次性收齐，扣除项目在学生详情页管理</p>
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
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.className || !formData.studentName || submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? '保存中...' : '保存'}
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
              确定要删除学生 &ldquo;{selectedStudent?.student_name}&rdquo; 的费用记录吗？此操作将同时删除所有交费记录，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 <span className="font-bold text-red-600">{selectedIds.size}</span> 名学生的费用记录吗？此操作将同时删除所有相关交费记录，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导出班级数据对话框 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              导出班级数据
            </DialogTitle>
            <DialogDescription>
              请选择要导出的数据类型
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-3">
              <label
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  exportType === 'fee_detail' ? 'border-green-600 bg-green-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value="fee_detail"
                  checked={exportType === 'fee_detail'}
                  onChange={() => setExportType('fee_detail')}
                  className="h-4 w-4 text-green-600"
                />
                <div>
                  <div className="font-medium">费用明细</div>
                  <div className="text-sm text-gray-500">导出每位学生的各项费用明细</div>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  exportType === 'payment_records' ? 'border-green-600 bg-green-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value="payment_records"
                  checked={exportType === 'payment_records'}
                  onChange={() => setExportType('payment_records')}
                  className="h-4 w-4 text-green-600"
                />
                <div>
                  <div className="font-medium">缴费记录</div>
                  <div className="text-sm text-gray-500">导出该班级所有缴费记录</div>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exportingClass}>
              取消
            </Button>
            <Button
              onClick={handleExportClass}
              disabled={exportingClass}
              className="bg-green-600 hover:bg-green-700"
            >
              {exportingClass ? '导出中...' : '确认导出'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改应交费用对话框 */}
      <Dialog open={editFeeDialogOpen} onOpenChange={setEditFeeDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              修改学生信息
            </DialogTitle>
            <DialogDescription>
              修改学生的基本信息和应交费用金额
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-4 items-center gap-4 pb-3 border-b">
              <Label className="text-right">姓名</Label>
              <Input
                value={editFeeStudent?.student_name || ''}
                onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, student_name: e.target.value } : null)}
                className="col-span-3"
                placeholder="学生姓名"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 pb-3 border-b">
              <Label className="text-right">性别</Label>
              <Select 
                value={editFeeStudent?.gender || '男'} 
                onValueChange={(value) => setEditFeeStudent(prev => prev ? { ...prev, gender: value } : null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 费用项目 - 显示应交/已交 */}
            <div className="text-sm font-medium text-gray-500 pt-2">应交费用（不能小于已交金额）</div>
            
            {/* 学费 */}
            <div className="flex items-center justify-between">
              <Label className="font-medium">学费</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">已交: {editFeeStudent?.tuition_paid || 0}</span>
                <Input
                  type="number"
                  value={editFeeStudent?.tuition_fee || 0}
                  onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, tuition_fee: Number(e.target.value) } : null)}
                  className="w-24 text-right"
                  min={0}
                />
              </div>
            </div>
            {/* 午餐费 */}
            <div className="flex items-center justify-between">
              <Label className="font-medium">午餐费</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">已交: {editFeeStudent?.lunch_paid || 0}</span>
                <Input
                  type="number"
                  value={editFeeStudent?.lunch_fee || 0}
                  onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, lunch_fee: Number(e.target.value) } : null)}
                  className="w-24 text-right"
                  min={0}
                />
              </div>
            </div>
            {/* 午托费 */}
            <div className="flex items-center justify-between">
              <Label className="font-medium">午托费</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">已交: {editFeeStudent?.nap_paid || 0}</span>
                <Input
                  type="number"
                  value={editFeeStudent?.nap_fee || 0}
                  onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, nap_fee: Number(e.target.value) } : null)}
                  className="w-24 text-right"
                  min={0}
                />
              </div>
            </div>
            {/* 课后服务费 */}
            <div className="flex items-center justify-between">
              <Label className="font-medium">课后服务费</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">已交: {editFeeStudent?.after_school_paid || 0}</span>
                <Input
                  type="number"
                  value={editFeeStudent?.after_school_fee || 0}
                  onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, after_school_fee: Number(e.target.value) } : null)}
                  className="w-24 text-right"
                  min={0}
                />
              </div>
            </div>
            {/* 社团费 */}
            <div className="flex items-center justify-between">
              <Label className="font-medium">社团费</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">已交: {editFeeStudent?.club_paid || 0}</span>
                <Input
                  type="number"
                  value={editFeeStudent?.club_fee || 0}
                  onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, club_fee: Number(e.target.value) } : null)}
                  className="w-24 text-right"
                  min={0}
                />
              </div>
            </div>
            {/* 代办费 */}
            <div className="flex items-center justify-between border-t pt-3">
              <Label className="font-medium text-purple-600">代办费</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">已交: {editFeeStudent?.agency_paid || 0}</span>
                <Input
                  type="number"
                  value={editFeeStudent?.agency_fee || 0}
                  onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, agency_fee: Number(e.target.value) } : null)}
                  className="w-24 text-right"
                  min={0}
                />
              </div>
            </div>
            
            {/* 备注 */}
            <div className="grid grid-cols-4 items-center gap-4 border-t pt-3">
              <Label className="text-right">备注</Label>
              <Input
                value={editFeeStudent?.remark || ''}
                onChange={(e) => setEditFeeStudent(prev => prev ? { ...prev, remark: e.target.value } : null)}
                className="col-span-3"
                placeholder="备注信息（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFeeDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!editFeeStudent) return;
                
                // 验证：应交金额不能小于已交金额
                const errors: string[] = [];
                if (editFeeStudent.tuition_fee < editFeeStudent.tuition_paid) {
                  errors.push(`学费应交(${editFeeStudent.tuition_fee})不能小于已交(${editFeeStudent.tuition_paid})`);
                }
                if (editFeeStudent.lunch_fee < editFeeStudent.lunch_paid) {
                  errors.push(`午餐费应交(${editFeeStudent.lunch_fee})不能小于已交(${editFeeStudent.lunch_paid})`);
                }
                if (editFeeStudent.nap_fee < editFeeStudent.nap_paid) {
                  errors.push(`午托费应交(${editFeeStudent.nap_fee})不能小于已交(${editFeeStudent.nap_paid})`);
                }
                if (editFeeStudent.after_school_fee < editFeeStudent.after_school_paid) {
                  errors.push(`课后服务费应交(${editFeeStudent.after_school_fee})不能小于已交(${editFeeStudent.after_school_paid})`);
                }
                if (editFeeStudent.club_fee < editFeeStudent.club_paid) {
                  errors.push(`社团费应交(${editFeeStudent.club_fee})不能小于已交(${editFeeStudent.club_paid})`);
                }
                if (editFeeStudent.agency_fee < editFeeStudent.agency_paid) {
                  errors.push(`代办费应交(${editFeeStudent.agency_fee})不能小于已交(${editFeeStudent.agency_paid})`);
                }
                
                if (errors.length > 0) {
                  toast.error(errors[0]);
                  return;
                }
                
                // 验证姓名不能为空
                if (!editFeeStudent.student_name.trim()) {
                  toast.error('姓名不能为空');
                  return;
                }
                
                try {
                  const response = await authFetch(`/api/student-fees/${editFeeStudent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      className: editFeeStudent.class_name,
                      studentName: editFeeStudent.student_name,
                      gender: editFeeStudent.gender,
                      tuitionFee: editFeeStudent.tuition_fee,
                      lunchFee: editFeeStudent.lunch_fee,
                      napFee: editFeeStudent.nap_fee,
                      afterSchoolFee: editFeeStudent.after_school_fee,
                      clubFee: editFeeStudent.club_fee,
                      agencyFee: editFeeStudent.agency_fee,
                      remark: editFeeStudent.remark,
                    }),
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok) {
                    toast.success('修改成功');
                    setEditFeeDialogOpen(false);
                    fetchStudents();
                  } else {
                    toast.error(result.error || '修改失败');
                  }
                } catch (error) {
                  console.error('Failed to update fee:', error);
                  toast.error('修改失败，请重试');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加班级对话框 */}
      <Dialog open={addClassDialogOpen} onOpenChange={setAddClassDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              添加班级
            </DialogTitle>
            <DialogDescription>
              输入新班级名称，添加后可在该班级下新增学生
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-name">班级名称 *</Label>
              <Input
                id="class-name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="例如：一年级1班"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitAddClass();
                  }
                }}
              />
              {classes.length > 0 && (
                <div className="text-sm text-gray-500">
                  现有班级：{classes.slice(0, 5).join('、')}
                  {classes.length > 5 && ` 等${classes.length}个班级`}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClassDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmitAddClass}
              disabled={!newClassName.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量导入学生费用
            </DialogTitle>
            <DialogDescription>
              从CSV文件批量导入学生费用数据。支持格式：班级、姓名、性别、各费用应交/已交、代办费已交、缴费时间、备注
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 文件选择和模板下载 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label htmlFor="import-file" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    选择CSV文件
                  </div>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </Label>
                {importData.length > 0 && (
                  <span className="text-sm text-gray-600">
                    已解析 {importData.length} 条记录
                  </span>
                )}
              </div>
              <Button 
                onClick={downloadImportTemplate} 
                variant="outline" 
                size="sm"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-1" />
                下载导入模板
              </Button>
            </div>

            {/* 数据预览 */}
            {importData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-medium">
                  预览数据（共 {importData.length} 条）
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">班级</TableHead>
                      <TableHead className="font-semibold">姓名</TableHead>
                      <TableHead className="font-semibold">性别</TableHead>
                      <TableHead className="text-right font-semibold">学费</TableHead>
                      <TableHead className="text-right font-semibold">午餐费</TableHead>
                      <TableHead className="text-right font-semibold">代办费</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.className}</TableCell>
                        <TableCell>{record.studentName}</TableCell>
                        <TableCell>{record.gender}</TableCell>
                        <TableCell className="text-right">
                          {record.tuitionFee}/{record.tuitionPaid}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.lunchFee}/{record.lunchPaid}
                        </TableCell>
                        <TableCell className="text-right">{record.agencyFee}/{record.agencyPaid}</TableCell>
                      </TableRow>
                    ))}
                    {importData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          ... 还有 {importData.length - 10} 条记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`font-medium ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {importResult.message}
                </div>
                {/* 显示错误详情 */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="text-sm font-medium text-orange-700 mb-2">
                      以下记录导入失败（{importResult.errors.length}条）：
                    </div>
                    <div className="max-h-32 overflow-y-auto text-sm text-red-600 space-y-1">
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx}>第{err.row}行：{err.error}</div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="text-gray-500">... 还有 {importResult.errors.length - 10} 条错误</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 导入说明 */}
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              <div className="font-medium mb-1">导入说明：</div>
              <ul className="list-disc list-inside space-y-1">
                <li>班级、姓名为必填项</li>
                <li>性别可选：男、女（默认：男）</li>
                <li>费用格式：学费应交/学费已交、午餐费应交/午餐费已交、代办费应交/代办费已交等</li>
                <li>缴费时间格式：YYYY-MM-DD（如 2024-09-01）</li>
                <li>已存在的学生（同班级同名）将更新数据，否则新增</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {importResult?.success ? '关闭' : '取消'}
            </Button>
            {!importResult?.success && (
              <Button
                onClick={handleImport}
                disabled={importLoading || importData.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {importLoading ? '导入中...' : `导入 ${importData.length} 条记录`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 导出页面组件，用 Suspense 包裹
export default function FeesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    }>
      <FeesContent />
    </Suspense>
  );
}
