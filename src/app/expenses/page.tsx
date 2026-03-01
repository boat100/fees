'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated, clearAuthToken } from '@/lib/auth-client';
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
  Pencil, 
  Trash2, 
  TrendingDown,
  LogOut,
  Download,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 支出类别
const EXPENSE_CATEGORIES = {
  DAILY: 'daily',
  PERSONNEL: 'personnel'
} as const;

const CATEGORY_NAMES: Record<string, string> = {
  [EXPENSE_CATEGORIES.DAILY]: '日常公用支出',
  [EXPENSE_CATEGORIES.PERSONNEL]: '人员支出'
};

// 日常公用支出子项目
const DAILY_ITEMS = [
  '办公费用', '财务费', '通讯费', '交通费', '交际费',
  '学生用药（防控物资）', '垃圾处理费', '日常费用', '水电费',
  '固定资产', '安保经费', '装修费或工程', '学生退费：包括膳食费',
  '学生餐费', '活动基金', '教学业务费', '代办费', '社团',
  '维修材料及维修费', '校服、书包', '租金'
];

// 人员支出子项目
const PERSONNEL_ITEMS = [
  '教职工工资', '课后服务、社团劳务费', '福利费', '医社保费',
  '住房公积金', '工作餐', '工会经费', '老师培训费',
  '外聘老师工资', '外教工资', '晚托补贴及餐费', '代理记账工资'
];

interface ExpenseRecord {
  id: number;
  category: string;
  item: string;
  report_date: string;
  occur_date: string;
  invoice_no: string | null;
  amount: number;
  summary: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function ExpensesPage() {
  const router = useRouter();
  
  // 数据状态
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 筛选状态
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterItem, setFilterItem] = useState<string>('');
  const [filterYearMonth, setFilterYearMonth] = useState<string>('');
  
  // 根据筛选类别获取对应的子项目列表
  const filterItems = filterCategory === EXPENSE_CATEGORIES.DAILY 
    ? DAILY_ITEMS 
    : filterCategory === EXPENSE_CATEGORIES.PERSONNEL 
      ? PERSONNEL_ITEMS 
      : [...DAILY_ITEMS, ...PERSONNEL_ITEMS];
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExpenseRecord | null>(null);
  
  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  
  // 导入对话框状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<Array<{
    category: string;
    item: string;
    reportDate: string;
    occurDate: string;
    invoiceNo: string;
    amount: number;
    summary: string;
    remark: string;
  }>>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    importedCount: number;
    errorCount: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<{
    category: 'daily' | 'personnel';
    item: string;
    reportDate: string;
    occurDate: string;
    invoiceNo: string;
    amount: number;
    summary: string;
    remark: string;
  }>({
    category: EXPENSE_CATEGORIES.DAILY,
    item: DAILY_ITEMS[0],
    reportDate: '',
    occurDate: '',
    invoiceNo: '',
    amount: 0,
    summary: '',
    remark: ''
  });

  // 处理筛选类别变化 - 联动重置子项目
  const handleFilterCategoryChange = (value: string) => {
    const newCategory = value === 'all' ? '' : value;
    setFilterCategory(newCategory);
    // 重置子项目选择
    setFilterItem('');
  };

  // 获取今天的日期
  const getTodayString = (): string => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // 获取当前年月
  const getCurrentYearMonth = (): string => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  // 获取支出记录 - 使用 useCallback 确保函数引用稳定
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/expenses?';
      if (filterCategory) url += `category=${filterCategory}&`;
      if (filterItem) url += `item=${encodeURIComponent(filterItem)}&`;
      if (filterYearMonth) url += `yearMonth=${filterYearMonth}&`;
      
      const response = await authFetch(url);
      const result = await response.json();
      if (response.ok) {
        setRecords(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterItem, filterYearMonth]);

  // 初始化
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchRecords();
  }, [router, fetchRecords]);

  // 打开新增对话框
  const openAddDialog = () => {
    setSelectedRecord(null);
    const today = getTodayString();
    setFormData({
      category: EXPENSE_CATEGORIES.DAILY,
      item: DAILY_ITEMS[0],
      reportDate: today,
      occurDate: today,
      invoiceNo: '',
      amount: 0,
      summary: '',
      remark: ''
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (record: ExpenseRecord) => {
    setSelectedRecord(record);
    setFormData({
      category: record.category as 'daily' | 'personnel',
      item: record.item,
      reportDate: record.report_date,
      occurDate: record.occur_date,
      invoiceNo: record.invoice_no || '',
      amount: record.amount,
      summary: record.summary || '',
      remark: record.remark || ''
    });
    setDialogOpen(true);
  };

  // 类别变化时更新子项目
  const handleCategoryChange = (category: 'daily' | 'personnel') => {
    const items = category === EXPENSE_CATEGORIES.DAILY ? DAILY_ITEMS : PERSONNEL_ITEMS;
    setFormData({
      ...formData,
      category,
      item: items[0]
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.item || !formData.reportDate || !formData.occurDate || formData.amount <= 0) {
      alert('请填写完整信息，金额必须大于0');
      return;
    }

    setSubmitting(true);
    try {
      const url = selectedRecord ? '/api/expenses' : '/api/expenses';
      const method = selectedRecord ? 'PUT' : 'POST';
      
      const body = selectedRecord 
        ? { id: selectedRecord.id, ...formData }
        : formData;

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        alert(selectedRecord ? '更新成功' : '添加成功');
        setDialogOpen(false);
        fetchRecords();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除记录
  const handleDelete = async () => {
    if (!selectedRecord) return;

    setSubmitting(true);
    try {
      const response = await authFetch(`/api/expenses?id=${selectedRecord.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        alert('删除成功');
        setDeleteDialogOpen(false);
        setSelectedRecord(null);
        fetchRecords();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换单个选中状态
  const toggleSelect = (id: number) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      // 取消全选
      setSelectedIds(new Set());
    } else {
      // 全选
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要删除的记录');
      return;
    }

    setSubmitting(true);
    try {
      const ids = Array.from(selectedIds).join(',');
      const response = await authFetch(`/api/expenses?ids=${ids}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || '删除成功');
        setBatchDeleteDialogOpen(false);
        setSelectedIds(new Set());
        fetchRecords();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to batch delete expenses:', error);
      alert('删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 导出Excel - 根据当前筛选结果导出
  const handleExport = async () => {
    try {
      // 使用当前筛选后的数据
      const exportRecords = records;

      if (exportRecords.length === 0) {
        alert('没有数据可导出');
        return;
      }

      // 创建工作簿
      const workbook = XLSX.utils.book_new();

      // 表头
      const headers = ['类别', '子项目', '报账时间', '发生时间', '发票号', '金额', '摘要', '备注'];

      // 生成文件名后缀
      let fileNameSuffix = '';
      if (filterCategory) {
        fileNameSuffix += `_${CATEGORY_NAMES[filterCategory]}`;
      }
      if (filterItem) {
        fileNameSuffix += `_${filterItem}`;
      }
      if (filterYearMonth) {
        fileNameSuffix += `_${filterYearMonth}`;
      }
      if (!fileNameSuffix) {
        fileNameSuffix = '_全部';
      }

      // 如果筛选了特定类别，只生成该类别的工作表
      if (filterCategory) {
        const categoryRecords = exportRecords.filter((r: ExpenseRecord) => r.category === filterCategory);
        const data: (string | number)[][] = [headers];
        categoryRecords.forEach((r: ExpenseRecord) => {
          data.push([
            CATEGORY_NAMES[r.category],
            r.item,
            r.report_date,
            r.occur_date,
            r.invoice_no || '',
            r.amount,
            r.summary || '',
            r.remark || ''
          ]);
        });
        // 添加合计
        const total = categoryRecords.reduce((sum: number, r: ExpenseRecord) => sum + r.amount, 0);
        data.push([]);
        data.push(['合计', '', '', '', '', total, '', '']);

        const sheet = XLSX.utils.aoa_to_sheet(data);
        sheet['!cols'] = [
          { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
          { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(workbook, sheet, CATEGORY_NAMES[filterCategory]);
      } else {
        // 未筛选类别，按类别分组生成工作表
        const dailyRecords = exportRecords.filter((r: ExpenseRecord) => r.category === EXPENSE_CATEGORIES.DAILY);
        const personnelRecords = exportRecords.filter((r: ExpenseRecord) => r.category === EXPENSE_CATEGORIES.PERSONNEL);

        // 日常公用支出工作表
        if (dailyRecords.length > 0) {
          const dailyData: (string | number)[][] = [headers];
          dailyRecords.forEach((r: ExpenseRecord) => {
            dailyData.push([
              CATEGORY_NAMES[r.category],
              r.item,
              r.report_date,
              r.occur_date,
              r.invoice_no || '',
              r.amount,
              r.summary || '',
              r.remark || ''
            ]);
          });
          // 添加合计
          const dailyTotal = dailyRecords.reduce((sum: number, r: ExpenseRecord) => sum + r.amount, 0);
          dailyData.push([]);
          dailyData.push(['合计', '', '', '', '', dailyTotal, '', '']);

          const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
          dailySheet['!cols'] = [
            { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
            { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 }
          ];
          XLSX.utils.book_append_sheet(workbook, dailySheet, '日常公用支出');
        }

        // 人员支出工作表
        if (personnelRecords.length > 0) {
          const personnelData: (string | number)[][] = [headers];
          personnelRecords.forEach((r: ExpenseRecord) => {
            personnelData.push([
              CATEGORY_NAMES[r.category],
              r.item,
              r.report_date,
              r.occur_date,
              r.invoice_no || '',
              r.amount,
              r.summary || '',
              r.remark || ''
            ]);
          });
          // 添加合计
          const personnelTotal = personnelRecords.reduce((sum: number, r: ExpenseRecord) => sum + r.amount, 0);
          personnelData.push([]);
          personnelData.push(['合计', '', '', '', '', personnelTotal, '', '']);

          const personnelSheet = XLSX.utils.aoa_to_sheet(personnelData);
          personnelSheet['!cols'] = [
            { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
            { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 }
          ];
          XLSX.utils.book_append_sheet(workbook, personnelSheet, '人员支出');
        }
      }

      // 汇总工作表
      const dailyRecords = exportRecords.filter((r: ExpenseRecord) => r.category === EXPENSE_CATEGORIES.DAILY);
      const personnelRecords = exportRecords.filter((r: ExpenseRecord) => r.category === EXPENSE_CATEGORIES.PERSONNEL);
      const dailyTotal = dailyRecords.reduce((sum: number, r: ExpenseRecord) => sum + r.amount, 0);
      const personnelTotal = personnelRecords.reduce((sum: number, r: ExpenseRecord) => sum + r.amount, 0);

      const summaryData: (string | number)[][] = [
        ['支出汇总'],
        [],
        ['筛选条件:'],
        ['类别', filterCategory ? CATEGORY_NAMES[filterCategory] : '全部'],
        ['子项目', filterItem || '全部'],
        ['年月', filterYearMonth || '全部'],
        [],
        ['类别', '记录数', '金额合计']
      ];
      if (dailyRecords.length > 0) {
        summaryData.push(['日常公用支出', dailyRecords.length, dailyTotal]);
      }
      if (personnelRecords.length > 0) {
        summaryData.push(['人员支出', personnelRecords.length, personnelTotal]);
      }
      summaryData.push([]);
      summaryData.push(['总计', exportRecords.length, dailyTotal + personnelTotal]);

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总', true);

      // 导出
      const fileName = `支出明细${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    }
  };

  // 解析导入文件
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // 转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];
      
      // 跳过表头，处理数据
      const parsedData: typeof importData = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 6) continue; // 跳过空行或数据不完整的行
        
        // 支持两种格式：
        // 格式1: 类别, 子项目, 报账时间, 发生时间, 发票号, 金额, 摘要, 备注
        // 格式2: 子项目, 报账时间, 发生时间, 发票号, 金额, 摘要, 备注 (需要用户选择类别)
        
        let category = '';
        let item = '';
        let reportDate = '';
        let occurDate = '';
        let invoiceNo = '';
        let amount = 0;
        let summary = '';
        let remark = '';
        
        // 判断第一列是否是类别
        const firstCol = String(row[0] || '').trim();
        if (firstCol === '日常公用支出' || firstCol === '人员支出' || 
            firstCol === '日常公用' || firstCol === '人员') {
          // 格式1: 包含类别
          category = firstCol;
          item = String(row[1] || '').trim();
          reportDate = String(row[2] || '').trim();
          occurDate = String(row[3] || '').trim();
          invoiceNo = String(row[4] || '').trim();
          amount = Number(row[5]) || 0;
          summary = String(row[6] || '').trim();
          remark = String(row[7] || '').trim();
        } else {
          // 格式2: 不包含类别，默认使用日常公用支出
          category = '日常公用支出';
          item = String(row[0] || '').trim();
          reportDate = String(row[1] || '').trim();
          occurDate = String(row[2] || '').trim();
          invoiceNo = String(row[3] || '').trim();
          amount = Number(row[4]) || 0;
          summary = String(row[5] || '').trim();
          remark = String(row[6] || '').trim();
        }
        
        // 跳过金额为0或无效的行
        if (amount <= 0 || !item) continue;
        
        parsedData.push({
          category,
          item,
          reportDate,
          occurDate,
          invoiceNo,
          amount,
          summary,
          remark
        });
      }
      
      setImportData(parsedData);
      setImportResult(null);
      
      if (parsedData.length === 0) {
        alert('未解析到有效数据，请检查文件格式');
      }
    } catch (error) {
      console.error('Failed to parse file:', error);
      alert('文件解析失败，请检查文件格式');
    }
    
    // 清空文件选择
    e.target.value = '';
  };

  // 执行导入
  const handleImport = async () => {
    if (importData.length === 0) {
      alert('没有可导入的数据');
      return;
    }

    setImportLoading(true);
    try {
      const response = await authFetch('/api/expenses/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: importData })
      });
      
      const result = await response.json();
      setImportResult(result);
      
      if (result.success) {
        fetchRecords();
      }
    } catch (error) {
      console.error('Failed to import:', error);
      alert('导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  // 打开导入对话框
  const openImportDialog = () => {
    setImportData([]);
    setImportResult(null);
    setImportDialogOpen(true);
  };

  // 下载导入模板
  const downloadImportTemplate = () => {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 日常公用支出模板
    const dailyTemplate = [
      ['类别', '子项目', '报账时间', '发生时间', '发票号', '金额', '摘要', '备注'],
      ['日常公用支出', '办公费用', '2024-01-15', '2024-01-15', 'INV001', 100.00, '购买办公用品示例', '示例备注'],
      ['日常公用支出', '水电费', '2024-01-16', '2024-01-16', 'INV002', 500.00, '本月水电费', ''],
      ['', '', '', '', '', '', '', ''],
      ['说明：'],
      ['1. 类别填写"日常公用支出"或"人员支出"'],
      ['2. 子项目必须与系统预设一致（详见"子项目参考"工作表）'],
      ['3. 日期格式：YYYY-MM-DD'],
      ['4. 金额必须为大于0的数字'],
      ['5. 发票号、摘要、备注为选填项'],
    ];
    const dailySheet = XLSX.utils.aoa_to_sheet(dailyTemplate);
    dailySheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, dailySheet, '日常公用支出模板');

    // 人员支出模板
    const personnelTemplate = [
      ['类别', '子项目', '报账时间', '发生时间', '发票号', '金额', '摘要', '备注'],
      ['人员支出', '教职工工资', '2024-01-20', '2024-01-20', '', 10000.00, '1月份工资', ''],
      ['人员支出', '外聘老师工资', '2024-01-20', '2024-01-20', '', 5000.00, '外聘教师工资', ''],
      ['', '', '', '', '', '', '', ''],
      ['说明：'],
      ['1. 类别填写"日常公用支出"或"人员支出"'],
      ['2. 子项目必须与系统预设一致（详见"子项目参考"工作表）'],
      ['3. 日期格式：YYYY-MM-DD'],
      ['4. 金额必须为大于0的数字'],
      ['5. 发票号、摘要、备注为选填项'],
    ];
    const personnelSheet = XLSX.utils.aoa_to_sheet(personnelTemplate);
    personnelSheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, personnelSheet, '人员支出模板');

    // 子项目参考
    const maxRows = Math.max(DAILY_ITEMS.length, PERSONNEL_ITEMS.length);
    const referenceData: (string | number)[][] = [
      ['日常公用支出子项目', '人员支出子项目'],
    ];
    for (let i = 0; i < maxRows; i++) {
      referenceData.push([
        DAILY_ITEMS[i] || '',
        PERSONNEL_ITEMS[i] || ''
      ]);
    }
    referenceData.push([]);
    referenceData.push(['提示：复制子项目名称到对应模板中使用']);
    
    const referenceSheet = XLSX.utils.aoa_to_sheet(referenceData);
    referenceSheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, referenceSheet, '子项目参考');

    // 下载模板
    const fileName = `支出导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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

  // 格式化金额
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 计算合计
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  // 获取当前类别的子项目列表
  const currentItems = formData.category === EXPENSE_CATEGORIES.DAILY ? DAILY_ITEMS : PERSONNEL_ITEMS;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
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
              <TrendingDown className="h-8 w-8 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                支出管理
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={openImportDialog} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                导入
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="icon">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>记录数量</CardDescription>
              <CardTitle className="text-2xl">{records.length} 条</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>支出合计</CardDescription>
              <CardTitle className="text-2xl text-red-600">¥{formatAmount(totalAmount)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>筛选结果</CardDescription>
              <CardTitle className="text-2xl">
                {filterCategory || filterItem || filterYearMonth ? '已筛选' : '全部数据'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 筛选和操作栏 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>类别：</Label>
                <Select value={filterCategory || 'all'} onValueChange={handleFilterCategoryChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value={EXPENSE_CATEGORIES.DAILY}>日常公用支出</SelectItem>
                    <SelectItem value={EXPENSE_CATEGORIES.PERSONNEL}>人员支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label>子项目：</Label>
                <Select value={filterItem || 'all'} onValueChange={(v) => setFilterItem(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={filterCategory ? '请选择子项目' : '全部'} />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">全部</SelectItem>
                    {!filterCategory && (
                      <>
                        <SelectItem value="__group_daily__" disabled>—— 日常公用支出 ——</SelectItem>
                        {DAILY_ITEMS.map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                        <SelectItem value="__group_personnel__" disabled>—— 人员支出 ——</SelectItem>
                        {PERSONNEL_ITEMS.map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </>
                    )}
                    {filterCategory === EXPENSE_CATEGORIES.DAILY && DAILY_ITEMS.map(item => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                    {filterCategory === EXPENSE_CATEGORIES.PERSONNEL && PERSONNEL_ITEMS.map(item => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label>报账月份：</Label>
                <Input
                  type="month"
                  value={filterYearMonth}
                  onChange={(e) => setFilterYearMonth(e.target.value)}
                  className="w-36"
                />
              </div>

              <Button onClick={openAddDialog} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-1" />
                新增支出
              </Button>
              
              {selectedIds.size > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setBatchDeleteDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除选中 ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardHeader>
            <CardTitle>支出记录</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={records.length > 0 && selectedIds.size === records.length}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead>子项目</TableHead>
                      <TableHead>报账时间</TableHead>
                      <TableHead>发生时间</TableHead>
                      <TableHead>发票号</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead>摘要</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={() => toggleSelect(record.id)}
                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </TableCell>
                        <TableCell>{CATEGORY_NAMES[record.category]}</TableCell>
                        <TableCell>{record.item}</TableCell>
                        <TableCell>{record.report_date}</TableCell>
                        <TableCell>{record.occur_date}</TableCell>
                        <TableCell>{record.invoice_no || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          ¥{formatAmount(record.amount)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{record.summary || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedRecord ? '编辑支出' : '新增支出'}</DialogTitle>
            <DialogDescription>
              {selectedRecord ? '修改支出记录信息' : '填写支出记录信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">类别 *</Label>
              <Select value={formData.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={EXPENSE_CATEGORIES.DAILY}>日常公用支出</SelectItem>
                  <SelectItem value={EXPENSE_CATEGORIES.PERSONNEL}>人员支出</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">子项目 *</Label>
              <Select value={formData.item} onValueChange={(v) => setFormData({ ...formData, item: v })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {currentItems.map(item => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">报账时间 *</Label>
              <Input
                type="date"
                value={formData.reportDate}
                onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">发生时间 *</Label>
              <Input
                type="date"
                value={formData.occurDate}
                onChange={(e) => setFormData({ ...formData, occurDate: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">发票号</Label>
              <Input
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                placeholder="发票号（选填）"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">金额 *</Label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="请输入金额"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">摘要</Label>
              <Input
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="摘要（选填）"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">备注</Label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="备注（选填）"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
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
              确定要删除这条支出记录吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.size} 条支出记录吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量导入支出记录
            </DialogTitle>
            <DialogDescription>
              上传Excel文件批量导入支出记录。支持格式：
              <br />
              格式1：类别、子项目、报账时间、发生时间、发票号、金额、摘要、备注
              <br />
              格式2：子项目、报账时间、发生时间、发票号、金额、摘要、备注（默认为日常公用支出）
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 文件选择和模板下载 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label htmlFor="import-file" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    选择Excel文件
                  </div>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.xls"
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">类别</TableHead>
                      <TableHead className="font-semibold">子项目</TableHead>
                      <TableHead className="font-semibold">报账时间</TableHead>
                      <TableHead className="font-semibold">发生时间</TableHead>
                      <TableHead className="font-semibold">发票号</TableHead>
                      <TableHead className="text-right font-semibold">金额</TableHead>
                      <TableHead className="font-semibold">摘要</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.category}</TableCell>
                        <TableCell>{record.item}</TableCell>
                        <TableCell>{record.reportDate}</TableCell>
                        <TableCell>{record.occurDate}</TableCell>
                        <TableCell>{record.invoiceNo || '-'}</TableCell>
                        <TableCell className="text-right">{record.amount.toFixed(2)}</TableCell>
                        <TableCell>{record.summary || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {importData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500">
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
                <div className="text-sm text-gray-600 mt-1">
                  成功导入: {importResult.importedCount} 条
                  {importResult.errorCount > 0 && `，失败: ${importResult.errorCount} 条`}
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>第{err.row}行: {err.error}</div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <div>... 还有 {importResult.errors.length - 5} 条错误</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 导入说明 */}
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              <div className="font-medium mb-1">导入说明：</div>
              <ul className="list-disc list-inside space-y-1">
                <li>类别可选值：日常公用支出、人员支出</li>
                <li>子项目必须与系统预设的项目名称一致</li>
                <li>日期格式：YYYY-MM-DD（如 2024-01-15）</li>
                <li>金额必须为大于0的数字</li>
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
                className="bg-red-600 hover:bg-red-700"
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
