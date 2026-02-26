'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  BarChart3, 
  Search, 
  RefreshCw,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';

// 类型定义
interface Student {
  id: number;
  name: string;
  student_number: string;
  class_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Statistics {
  totalStudents: number;
  totalFees: number;
  paidFees: number;
  unpaidFees: number;
  paidCount: number;
  unpaidCount: number;
  feeTypeStats: Array<{
    feeType: string;
    total: number;
    paid: number;
    unpaid: number;
    count: number;
  }>;
  classStats: Array<{
    className: string;
    total: number;
    paid: number;
    unpaid: number;
    studentCount: number;
  }>;
}

export default function Home() {
  // 状态管理
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 对话框状态
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    studentNumber: '',
    className: '',
    phone: '',
    email: '',
  });

  // 获取学生列表
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await fetch(`/api/students?${params}`);
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
    setLoading(true);
    try {
      const response = await fetch('/api/statistics');
      const result = await response.json();
      if (result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchStudents();
  }, [searchTerm]);

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab]);

  // 打开新增对话框
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setFormData({
      name: '',
      studentNumber: '',
      className: '',
      phone: '',
      email: '',
    });
    setStudentDialogOpen(true);
  };

  // 打开修改对话框
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      studentNumber: student.student_number,
      className: student.class_name,
      phone: student.phone || '',
      email: student.email || '',
    });
    setStudentDialogOpen(true);
  };

  // 打开删除确认对话框
  const handleDeleteConfirm = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const url = selectedStudent 
        ? `/api/students/${selectedStudent.id}` 
        : '/api/students';
      const method = selectedStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          studentNumber: formData.studentNumber,
          className: formData.className,
          phone: formData.phone || null,
          email: formData.email || null,
        }),
      });
      
      if (response.ok) {
        setStudentDialogOpen(false);
        fetchStudents();
        setFormData({
          name: '',
          studentNumber: '',
          className: '',
          phone: '',
          email: '',
        });
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
      const response = await fetch(`/api/students/${selectedStudent.id}`, {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
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
                onClick={() => setActiveTab('students')}
                variant={activeTab === 'students' ? 'default' : 'outline'}
                className={activeTab === 'students' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <Users className="h-4 w-4 mr-2" />
                学生管理
              </Button>
              
              <Button
                onClick={() => setActiveTab('statistics')}
                variant={activeTab === 'statistics' ? 'default' : 'outline'}
                className={activeTab === 'statistics' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                费用统计
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'students' && (
          <>
            {/* 搜索栏 */}
            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索学生姓名或学号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => fetchStudents()}
                variant="outline"
                size="icon"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* 学生列表 */}
            <Card>
              <CardHeader>
                <CardTitle>学生列表</CardTitle>
                <CardDescription>
                  共 {students.length} 名学生
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">加载中...</span>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无学生数据，点击"新增学生"添加
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>学号</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead>班级</TableHead>
                        <TableHead>联系电话</TableHead>
                        <TableHead>电子邮箱</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.student_number}
                          </TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {student.class_name}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.phone || '-'}</TableCell>
                          <TableCell>{student.email || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleEditStudent(student)}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                修改
                              </Button>
                              <Button
                                onClick={() => handleDeleteConfirm(student)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {/* 统计概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    学生总数
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics?.totalStudents || 0}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    费用总额
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ¥{statistics?.totalFees.toFixed(2) || '0.00'}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    已缴费用
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ¥{statistics?.paidFees.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics?.paidCount || 0} 笔
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    未缴费用
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ¥{statistics?.unpaidFees.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics?.unpaidCount || 0} 笔
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 费用类型统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  费用类型统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics?.feeTypeStats && statistics.feeTypeStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>费用类型</TableHead>
                        <TableHead>总金额</TableHead>
                        <TableHead>已缴金额</TableHead>
                        <TableHead>未缴金额</TableHead>
                        <TableHead>记录数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.feeTypeStats.map((stat, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {stat.feeType}
                          </TableCell>
                          <TableCell>¥{stat.total.toFixed(2)}</TableCell>
                          <TableCell className="text-green-600">
                            ¥{stat.paid.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-red-600">
                            ¥{stat.unpaid.toFixed(2)}
                          </TableCell>
                          <TableCell>{stat.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无费用统计数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 班级统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  班级费用统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics?.classStats && statistics.classStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>班级</TableHead>
                        <TableHead>学生人数</TableHead>
                        <TableHead>总金额</TableHead>
                        <TableHead>已缴金额</TableHead>
                        <TableHead>未缴金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.classStats.map((stat, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {stat.className}
                          </TableCell>
                          <TableCell>{stat.studentCount}</TableCell>
                          <TableCell>¥{stat.total.toFixed(2)}</TableCell>
                          <TableCell className="text-green-600">
                            ¥{stat.paid.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-red-600">
                            ¥{stat.unpaid.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无班级统计数据
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* 学生表单对话框 */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? '修改学生信息' : '新增学生'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent 
                ? '修改学生基本信息，点击保存完成更新' 
                : '填写学生基本信息，点击保存完成添加'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                姓名 *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="请输入学生姓名"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="studentNumber" className="text-right">
                学号 *
              </Label>
              <Input
                id="studentNumber"
                value={formData.studentNumber}
                onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
                className="col-span-3"
                placeholder="请输入学号"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="className" className="text-right">
                班级 *
              </Label>
              <Input
                id="className"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                className="col-span-3"
                placeholder="请输入班级"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                联系电话
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="col-span-3"
                placeholder="请输入联系电话（选填）"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                电子邮箱
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
                placeholder="请输入电子邮箱（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.studentNumber || !formData.className}
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
              确定要删除学生 "{selectedStudent?.name}" 吗？此操作将同时删除该学生的所有费用记录，且无法撤销。
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
    </div>
  );
}
