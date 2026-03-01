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
  CreditCard,
  LogOut,
  Download,
  ArrowLeft,
  BarChart3,
  Upload,
  CheckSquare,
  Square
} from 'lucide-react';
import { FEE_ITEMS } from '@/lib/constants';

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
  const [batchPaymentDialogOpen, setBatchPaymentDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  
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
  
  // 导出状态
  const [exportingClass, setExportingClass] = useState(false);
  const [exportingAgency, setExportingAgency] = useState(false);
  
  // 导出班级数据对话框
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'fee_detail' | 'payment_records'>('fee_detail');
  
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
        setImportResult({
          success: true,
          message: `导入成功！新增 ${result.insertCount || 0} 条，更新 ${result.updateCount || 0} 条`,
          insertCount: result.insertCount,
          updateCount: result.updateCount,
          total: result.total
        });
        fetchClasses();
        fetchStudents();
      } else {
        setImportResult({
          success: false,
          message: result.error || '导入失败'
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
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Button>
              <DollarSign className="h-8 w-8 text-green-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                学校收费费用管理
              </h1>
            </div>
            
            {/* 导航按钮 */}
            <nav className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setImportData([]);
                  setImportResult(null);
                  setImportDialogOpen(true);
                }}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                导入
              </Button>
              
              <Button
                onClick={handleAddStudent}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                新增学生
              </Button>
              
              <Button
                onClick={() => router.push('/fees/stats')}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                统计
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
              
              {selectedClass && students.length > 0 && (
                <>
                  <Button
                    onClick={openExportDialog}
                    variant="outline"
                    disabled={exportingClass}
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    {exportingClass ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    导出班级数据
                  </Button>
                  <Button
                    onClick={handleExportAgencyFee}
                    variant="outline"
                    disabled={exportingAgency}
                    className="border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    {exportingAgency ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    导出代办费明细
                  </Button>
                  
                  {/* 多选模式按钮 */}
                  <Button
                    onClick={() => {
                      setSelectMode(!selectMode);
                      setSelectedIds(new Set());
                    }}
                    variant={selectMode ? "default" : "outline"}
                    className={selectMode ? "bg-blue-600 hover:bg-blue-700" : "border-blue-600 text-blue-600 hover:bg-blue-50"}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectMode ? '取消多选' : '多选'}
                  </Button>
                </>
              )}
              
              {/* 多选模式下的批量操作按钮 */}
              {selectMode && selectedIds.size > 0 && (
                <>
                  <Button
                    onClick={() => {
                      const selectedStudents = students.filter(s => selectedIds.has(s.id));
                      setBatchPaymentData({
                        selectedStudents: Array.from(selectedIds),
                        payments: [
                          { feeType: 'tuition', amount: 0 },
                          { feeType: 'lunch', amount: 0 },
                          { feeType: 'nap', amount: 0 },
                          { feeType: 'after_school', amount: 0 },
                          { feeType: 'club', amount: 0 },
                        ],
                        paymentDate: getTodayString(),
                        remark: '',
                      });
                      setBatchPaymentDialogOpen(true);
                    }}
                    variant="outline"
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    批量录入 ({selectedIds.size})
                  </Button>
                  <Button
                    onClick={() => setBatchDeleteDialogOpen(true)}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    批量删除 ({selectedIds.size})
                  </Button>
                </>
              )}
              
              {selectedClass && (
                <div className="text-sm text-gray-500">
                  共 <span className="font-semibold text-gray-900">{students.length}</span> 名学生
                  {selectMode && selectedIds.size > 0 && (
                    <span className="ml-2 text-blue-600">已选 {selectedIds.size} 人</span>
                  )}
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
                暂无数据，点击&ldquo;新增学生&rdquo;添加或&ldquo;批量导入&rdquo;数据
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {selectMode && (
                        <TableHead className="font-semibold w-12">
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
                      <TableHead className="font-semibold">序号</TableHead>
                      <TableHead className="font-semibold">姓名</TableHead>
                      <TableHead className="font-semibold text-center">性别</TableHead>
                      <TableHead className="font-semibold text-center">午托</TableHead>
                      <TableHead className="font-semibold text-right">学费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">午餐费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">午托费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">课后服务费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">社团费<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold text-right">代办费<br/><span className="font-normal text-xs text-gray-400">应交/已交/剩余</span></TableHead>
                      <TableHead className="font-semibold text-right">合计<br/><span className="font-normal text-xs text-gray-400">应交/已交</span></TableHead>
                      <TableHead className="font-semibold">备注</TableHead>
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
                            <span className={`text-xs px-1.5 py-0.5 rounded ${student.nap_fee > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {student.nap_fee > 0 ? '午托' : '走读'}
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
                          <TableCell className="max-w-[100px] truncate">{student.remark || '-'}</TableCell>
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
                      <TableCell className="text-right text-lg text-blue-700">
                        {totals.total_fee.toFixed(0)}/{totals.total_paid.toFixed(0)}
                      </TableCell>
                      <TableCell colSpan={1}></TableCell>
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
                  const response = await authFetch('/api/payments/batch', {
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
