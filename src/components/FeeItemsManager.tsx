'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-client';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Save,
  ListOrdered
} from 'lucide-react';
import { toast } from 'sonner';

interface FeeItem {
  id: number;
  key: string;
  name: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string | null;
}

export function FeeItemsManager() {
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 新增/编辑对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<FeeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 获取收费项目列表
  const fetchFeeItems = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/fee-items');
      const result = await response.json();
      if (response.ok) {
        setFeeItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch fee items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeItems();
  }, []);

  // 打开新增对话框
  const openAddDialog = () => {
    setEditingItem(null);
    setItemName('');
    setItemKey('');
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (item: FeeItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemKey(item.key);
    setDialogOpen(true);
  };

  // 保存收费项目
  const handleSave = async () => {
    if (!itemName.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    
    if (!editingItem && !itemKey.trim()) {
      toast.error('请输入项目标识');
      return;
    }
    
    setSaving(true);
    try {
      const url = '/api/fee-items';
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem 
        ? { id: editingItem.id, name: itemName }
        : { key: itemKey, name: itemName };
      
      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message || '保存成功');
        setDialogOpen(false);
        fetchFeeItems();
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save fee item:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 打开删除确认对话框
  const openDeleteDialog = (item: FeeItem) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleDelete = async () => {
    if (!deletingItem) return;
    
    setDeleting(true);
    try {
      const response = await authFetch(`/api/fee-items?id=${deletingItem.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message || '删除成功');
        setDeleteDialogOpen(false);
        fetchFeeItems();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete fee item:', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 移动排序
  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === feeItems.length - 1) return;
    
    const newItems = [...feeItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    setFeeItems(newItems);
    
    // 更新服务器端排序
    try {
      const updates = newItems.map((item, i) => ({
        id: item.id,
        sortOrder: i + 1,
      }));
      
      for (const update of updates) {
        await authFetch('/api/fee-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-purple-600" />
            收费项目管理
          </CardTitle>
          <CardDescription>
            管理学费、午餐费等收费项目，支持新增、编辑、删除
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : (
            <>
              <div className="space-y-2">
                {feeItems.map((item, index) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-3 w-3 rotate-180" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === feeItems.length - 1}
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-xs text-gray-400 w-6">{index + 1}</span>
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({item.key})</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(item)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteDialog(item)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={openAddDialog}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加收费项目
              </Button>
              
              <p className="text-xs text-gray-500">
                * 删除已使用的收费项目会标记为停用而非彻底删除
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '编辑收费项目' : '添加收费项目'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? '修改收费项目名称' : '添加新的收费项目'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!editingItem && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">项目标识</Label>
                <Input
                  value={itemKey}
                  onChange={(e) => setItemKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="col-span-3"
                  placeholder="如：exam_fee"
                  disabled={!!editingItem}
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">项目名称</Label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="col-span-3"
                placeholder="如：考试费"
              />
            </div>
            {!editingItem && (
              <p className="text-xs text-gray-500 col-span-4">
                * 项目标识只能包含小写字母、数字和下划线，创建后不可修改
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存'}
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
              确定要删除收费项目「{deletingItem?.name}」吗？
              <br />
              如果该收费项目已被学生使用，将标记为停用而非彻底删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
