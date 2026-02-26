'use client';

import { useState, useRef } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  FileSpreadsheet,
  AlertTriangle,
  ArrowLeft,
  Settings,
  Trash2,
  FileDown,
  FileUp,
  Database
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  
  // 导入预览数据
  const [importData, setImportData] = useState<Array<Record<string, unknown>>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 下载导入模板
  const downloadTemplate = () => {
    const headers = ['班级', '姓名', '性别', '午托状态', '学籍状态', '学费', '午餐费', '午托费', '课后服务费', '社团费', '其他费用', '备注'];
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
      gender: String(row['性别'] || '男'),
      napStatus: String(row['午托状态'] || '走读'),
      enrollmentStatus: String(row['学籍状态'] || '学籍'),
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
      } else {
        alert(result.error || '导入失败');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('导入失败');
    }
  };

  // 导出所有数据
  const exportAllData = async () => {
    try {
      const response = await fetch('/api/student-fees?all=true');
      const result = await response.json();
      
      if (!result.data || result.data.length === 0) {
        alert('没有数据可导出');
        return;
      }
      
      const students = result.data;
      
      // 计算每个学生的总费用
      const calculateStudentTotals = (student: typeof students[0]) => {
        const totalFee = 
          (student.tuition_fee || 0) + (student.lunch_fee || 0) + (student.nap_fee || 0) +
          (student.after_school_fee || 0) + (student.club_fee || 0) + (student.other_fee || 0);
        const totalPaid = 
          (student.tuition_paid || 0) + (student.lunch_paid || 0) + (student.nap_paid || 0) +
          (student.after_school_paid || 0) + (student.club_paid || 0) + (student.other_paid || 0);
        return { totalFee, totalPaid };
      };
      
      // 按班级分组
      const classGroups: Record<string, typeof students> = {};
      students.forEach((student: typeof students[0]) => {
        if (!classGroups[student.class_name]) {
          classGroups[student.class_name] = [];
        }
        classGroups[student.class_name].push(student);
      });
      
      // 计算总合计
      let grandTotalFee = 0, grandTotalPaid = 0;
      students.forEach((student: typeof students[0]) => {
        const { totalFee, totalPaid } = calculateStudentTotals(student);
        grandTotalFee += totalFee;
        grandTotalPaid += totalPaid;
      });
      
      // 生成CSV
      const headers = ['班级', '姓名', '性别', '午托状态', '学籍状态', '学费应交', '学费已交', '午餐费应交', '午餐费已交', '午托费应交', '午托费已交', '课后服务费应交', '课后服务费已交', '社团费应交', '社团费已交', '其他费用应交', '其他费用已交', '应交合计', '已交合计', '备注'];
      
      const rows: string[][] = [];
      
      // 按班级输出
      Object.keys(classGroups).sort().forEach(className => {
        // 班级行
        rows.push([`【${className}】`]);
        
        // 学生行
        classGroups[className].forEach((student: typeof students[0]) => {
          const { totalFee, totalPaid } = calculateStudentTotals(student);
          rows.push([
            student.class_name,
            student.student_name,
            student.gender || '男',
            student.nap_status || '走读',
            student.enrollment_status || '学籍',
            String(student.tuition_fee || 0),
            String(student.tuition_paid || 0),
            String(student.lunch_fee || 0),
            String(student.lunch_paid || 0),
            String(student.nap_fee || 0),
            String(student.nap_paid || 0),
            String(student.after_school_fee || 0),
            String(student.after_school_paid || 0),
            String(student.club_fee || 0),
            String(student.club_paid || 0),
            String(student.other_fee || 0),
            String(student.other_paid || 0),
            String(totalFee),
            String(totalPaid),
            student.remark || '',
          ]);
        });
        
        // 班级小计
        let classTotalFee = 0, classTotalPaid = 0;
        classGroups[className].forEach((student: typeof students[0]) => {
          const { totalFee, totalPaid } = calculateStudentTotals(student);
          classTotalFee += totalFee;
          classTotalPaid += totalPaid;
        });
        rows.push(['小计', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', String(classTotalFee), String(classTotalPaid), '']);
        rows.push([]); // 空行
      });
      
      // 总合计
      rows.push(['总合计', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', String(grandTotalFee), String(grandTotalPaid), '']);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `全部费用明细_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('导出失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                后台管理
              </h1>
            </div>
            
            <Button
              onClick={() => router.push('/')}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 数据导入卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-green-600" />
                数据导入
              </CardTitle>
              <CardDescription>
                下载模板后填写学生信息，批量导入系统
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载导入模板
                </Button>
              </div>
              <div className="border-t pt-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  选择文件批量导入
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">
                * 支持CSV格式文件，重复学生（班级+姓名相同）将更新数据
              </p>
            </CardContent>
          </Card>
          
          {/* 数据导出卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5 text-purple-600" />
                数据导出
              </CardTitle>
              <CardDescription>
                导出所有学生费用明细到CSV文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={exportAllData}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                导出全部数据
              </Button>
              <p className="text-xs text-gray-500">
                * 导出文件包含所有班级数据，按班级分组显示
              </p>
            </CardContent>
          </Card>
          
          {/* 数据管理卡片 */}
          <Card className="md:col-span-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Database className="h-5 w-5" />
                数据管理
              </CardTitle>
              <CardDescription>
                危险操作区域，请谨慎操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800">清空所有数据</h4>
                    <p className="text-sm text-red-700 mt-1">
                      删除所有学生信息和交费记录，此操作不可恢复！
                    </p>
                    <Button
                      onClick={() => setDeleteAllDialogOpen(true)}
                      variant="destructive"
                      className="mt-3"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      清空所有数据
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">📥 数据导入流程</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>点击"下载导入模板"获取CSV模板</li>
                  <li>用Excel或WPS打开模板填写数据</li>
                  <li>保存为CSV格式（UTF-8编码）</li>
                  <li>点击"选择文件批量导入"上传</li>
                  <li>预览数据无误后确认导入</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">📤 数据导出说明</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>导出文件为CSV格式，可用Excel打开</li>
                  <li>包含所有班级学生数据</li>
                  <li>按班级分组，含班级小计和总合计</li>
                  <li>建议在清空前先备份数据</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

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

      {/* 清空所有数据对话框 */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ⚠️ 危险操作：清空所有数据
            </DialogTitle>
            <DialogDescription>
              此操作将删除所有学生和交费记录，且无法恢复！
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* 强警告提示 */}
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-800 text-lg">⚠️ 警告</p>
                  <p className="text-red-700 mt-2">
                    您即将执行<strong>不可逆</strong>的操作！
                  </p>
                  <ul className="mt-3 text-sm text-red-700 space-y-1">
                    <li>• 所有学生信息将被删除</li>
                    <li>• 所有交费记录将被删除</li>
                    <li>• 所有班级数据将被清空</li>
                    <li>• 此操作<strong>无法撤销</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 备份提醒 */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                📋 建议操作：请先使用"导出数据"功能备份当前数据！
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={async () => {
                // 第一次确认
                if (!confirm('⚠️ 确定要清空所有数据吗？此操作不可撤销！')) return;
                
                // 第二次确认
                const input = prompt('请输入 "确认清空" 以继续：');
                if (input !== '确认清空') {
                  if (input !== null) alert('输入不正确，操作已取消');
                  return;
                }
                
                try {
                  const response = await fetch('/api/student-fees/all', {
                    method: 'DELETE',
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok) {
                    alert(result.message || '数据已清空');
                    setDeleteAllDialogOpen(false);
                  } else {
                    alert(result.error || '清空失败');
                  }
                } catch (error) {
                  console.error('Failed to delete all:', error);
                  alert('清空失败');
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              确认清空所有数据
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
