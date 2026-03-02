'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
  LogOut,
  GripVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ExpenseItem {
  id: number;
  category_id: number;
  name: string;
  sort_order: number;
}

interface ExpenseCategory {
  id: number;
  name: string;
  sort_order: number;
  items: ExpenseItem[];
}

export default function ExpenseCategoriesPage() {
  const router = useRouter();
  
  // 数据状态
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 展开状态
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // 类别对话框状态
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', sortOrder: 0 });
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [categoryRecordCount, setCategoryRecordCount] = useState(0); // 受影响的支出记录数
  const [forceDeleteCategory, setForceDeleteCategory] = useState(false); // 是否强制删除
  
  // 子项目对话框状态
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null);
  const [itemForm, setItemForm] = useState({ categoryId: 0, name: '', sortOrder: 0 });
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ExpenseItem | null>(null);
  const [itemRecordCount, setItemRecordCount] = useState(0); // 受影响的支出记录数
  const [forceDeleteItem, setForceDeleteItem] = useState(false); // 是否强制删除

  // 获取类别数据
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/expense-categories?withItems=true');
      const result = await response.json();
      if (response.ok) {
        setCategories(result.data || []);
        // 默认展开所有类别
        setExpandedCategories(new Set((result.data || []).map((c: ExpenseCategory) => c.id)));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchCategories();
  }, [router, fetchCategories]);

  // 切换类别展开状态
  const toggleCategoryExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 打开新增类别对话框
  const openAddCategoryDialog = () => {
    setSelectedCategory(null);
    setCategoryForm({ name: '', sortOrder: categories.length + 1 });
    setCategoryDialogOpen(true);
  };

  // 打开编辑类别对话框
  const openEditCategoryDialog = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setCategoryForm({ name: category.name, sortOrder: category.sort_order });
    setCategoryDialogOpen(true);
  };

  // 提交类别表单
  const handleCategorySubmit = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('请输入类别名称');
      return;
    }

    setSubmitting(true);
    try {
      const url = '/api/expense-categories';
      const method = selectedCategory ? 'PUT' : 'POST';
      const body = selectedCategory 
        ? { id: selectedCategory.id, ...categoryForm }
        : categoryForm;

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(selectedCategory ? '类别更新成功' : '类别添加成功');
        setCategoryDialogOpen(false);
        fetchCategories();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to submit category:', error);
      toast.error('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除类别
  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return;

    setSubmitting(true);
    try {
      const forceParam = forceDeleteCategory ? '&force=true' : '';
      const response = await authFetch(`/api/expense-categories?id=${deletingCategoryId}${forceParam}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || '类别删除成功');
        setDeleteCategoryDialogOpen(false);
        setDeletingCategoryId(null);
        setCategoryRecordCount(0);
        setForceDeleteCategory(false);
        fetchCategories();
      } else if (result.hasRecords) {
        // 有支出记录，需要用户确认
        setCategoryRecordCount(result.recordCount);
        setForceDeleteCategory(true);
        // 不关闭对话框，让用户再次确认
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('删除失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 打开新增子项目对话框
  const openAddItemDialog = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedItem(null);
    setItemForm({ 
      categoryId, 
      name: '', 
      sortOrder: (category?.items.length || 0) + 1 
    });
    setItemDialogOpen(true);
  };

  // 打开编辑子项目对话框
  const openEditItemDialog = (item: ExpenseItem) => {
    setSelectedItem(item);
    setItemForm({ 
      categoryId: item.category_id, 
      name: item.name, 
      sortOrder: item.sort_order 
    });
    setItemDialogOpen(true);
  };

  // 提交子项目表单
  const handleItemSubmit = async () => {
    if (!itemForm.categoryId) {
      toast.error('请选择所属类别');
      return;
    }

    if (!itemForm.name.trim()) {
      toast.error('请输入子项目名称');
      return;
    }

    setSubmitting(true);
    try {
      const url = '/api/expense-items';
      const method = selectedItem ? 'PUT' : 'POST';
      const body = selectedItem 
        ? { id: selectedItem.id, ...itemForm }
        : itemForm;

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(selectedItem ? '子项目更新成功' : '子项目添加成功');
        setItemDialogOpen(false);
        fetchCategories();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to submit item:', error);
      toast.error('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除子项目
  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    setSubmitting(true);
    try {
      const forceParam = forceDeleteItem ? '&force=true' : '';
      const response = await authFetch(`/api/expense-items?id=${deletingItem.id}${forceParam}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || '子项目删除成功');
        setDeleteItemDialogOpen(false);
        setDeletingItem(null);
        setItemRecordCount(0);
        setForceDeleteItem(false);
        fetchCategories();
      } else if (result.hasRecords) {
        // 有支出记录，需要用户确认
        setItemRecordCount(result.recordCount);
        setForceDeleteItem(true);
        // 不关闭对话框，让用户再次确认
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('删除失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 退出登录
  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/expenses')}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回支出管理
              </Button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                支出类别管理
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={openAddCategoryDialog} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-1" />
                新增类别
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="ghost" 
                size="sm"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle>支出类别与子项目</CardTitle>
            <CardDescription>
              管理支出类别和子项目，点击类别可展开查看子项目
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                暂无类别，点击上方"新增类别"按钮添加
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="border rounded-lg">
                    {/* 类别标题 */}
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleCategoryExpand(category.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <GripVertical className="h-4 w-4 text-gray-300" />
                        <span className="font-medium text-gray-900">{category.name}</span>
                        <span className="text-sm text-gray-500">
                          ({category.items.length} 个子项目)
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddItemDialog(category.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          添加子项目
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditCategoryDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeletingCategoryId(category.id);
                            setDeleteCategoryDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 子项目列表 */}
                    {expandedCategories.has(category.id) && (
                      <div className="border-t">
                        {category.items.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            暂无子项目
                          </div>
                        ) : (
                          <div className="divide-y">
                            {category.items.map((item) => (
                              <div 
                                key={item.id} 
                                className="flex items-center justify-between p-3 pl-12 hover:bg-gray-50"
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical className="h-4 w-4 text-gray-300" />
                                  <span>{item.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditItemDialog(item)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setDeletingItem(item);
                                      setDeleteItemDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 类别对话框 */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? '编辑类别' : '新增类别'}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? '修改类别信息' : '添加新的支出类别'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">名称 *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="col-span-3"
                placeholder="请输入类别名称"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">排序</Label>
              <Input
                type="number"
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                className="col-span-3"
                placeholder="数字越小越靠前"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleCategorySubmit} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? '提交中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 子项目对话框 */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? '编辑子项目' : '新增子项目'}</DialogTitle>
            <DialogDescription>
              {selectedItem ? '修改子项目信息' : '添加新的支出子项目'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">所属类别 *</Label>
              <Select 
                value={String(itemForm.categoryId)} 
                onValueChange={(v) => setItemForm({ ...itemForm, categoryId: Number(v) })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="请选择类别" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">名称 *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="col-span-3"
                placeholder="请输入子项目名称"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">排序</Label>
              <Input
                type="number"
                value={itemForm.sortOrder}
                onChange={(e) => setItemForm({ ...itemForm, sortOrder: Number(e.target.value) })}
                className="col-span-3"
                placeholder="数字越小越靠前"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleItemSubmit} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? '提交中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除类别确认对话框 */}
      <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={(open) => {
        setDeleteCategoryDialogOpen(open);
        if (!open) {
          setCategoryRecordCount(0);
          setForceDeleteCategory(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryRecordCount > 0 ? (
                <span className="text-red-600 font-medium">
                  ⚠️ 该类别下有 {categoryRecordCount} 条支出记录，删除类别将同时删除这些记录！此操作不可恢复，是否继续？
                </span>
              ) : (
                '确定要删除该类别吗？如果类别下有子项目，需要先删除子项目。'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory} 
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? '删除中...' : categoryRecordCount > 0 ? '确认删除（包含支出记录）' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除子项目确认对话框 */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={(open) => {
        setDeleteItemDialogOpen(open);
        if (!open) {
          setItemRecordCount(0);
          setForceDeleteItem(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {itemRecordCount > 0 ? (
                <span className="text-red-600 font-medium">
                  ⚠️ 子项目"{deletingItem?.name}"下有 {itemRecordCount} 条支出记录，删除子项目将同时删除这些记录！此操作不可恢复，是否继续？
                </span>
              ) : (
                `确定要删除子项目"${deletingItem?.name}"吗？`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteItem} 
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? '删除中...' : itemRecordCount > 0 ? '确认删除（包含支出记录）' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
