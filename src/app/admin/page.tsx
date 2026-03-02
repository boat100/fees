'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, isAuthenticated, clearAuthToken } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  ArrowLeft,
  Settings,
  Trash2,
  Database,
  HardDriveDownload,
  HardDriveUpload,
  LogOut
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  
  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);
  
  // 对话框状态
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  
  // 恢复相关
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  
  // 文件引用
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // 备份数据库
  const backupDatabase = async () => {
    try {
      const response = await authFetch('/api/backup');
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '备份失败');
        return;
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'school_fees_backup.db';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      alert('数据库备份成功！');
    } catch (error) {
      console.error('Backup failed:', error);
      alert('备份失败');
    }
  };

  // 选择恢复文件
  const handleRestoreFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.db')) {
      alert('请选择 .db 格式的备份文件');
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
      return;
    }
    
    setRestoreFile(file);
    setRestoreFileName(file.name);
    setRestoreDialogOpen(true);
    
    if (restoreInputRef.current) {
      restoreInputRef.current.value = '';
    }
  };

  // 确认恢复数据库
  const confirmRestore = async () => {
    if (!restoreFile) return;
    
    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      
      const response = await authFetch('/api/backup', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message || '数据库恢复成功！');
        setRestoreDialogOpen(false);
        setRestoreFile(null);
        setRestoreFileName('');
        // 刷新页面以确保数据更新
        window.location.reload();
      } else {
        alert(result.error || '恢复失败');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      alert('恢复失败');
    }
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
              <Settings className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                后台管理
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 数据库备份卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDriveDownload className="h-5 w-5 text-blue-600" />
                数据库备份
              </CardTitle>
              <CardDescription>
                下载完整数据库文件，用于数据备份或迁移（包含收费与支出数据）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={backupDatabase}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Database className="h-4 w-4 mr-2" />
                备份数据库
              </Button>
              <p className="text-xs text-gray-500">
                * 备份文件为 .db 格式，包含所有收费和支出数据
              </p>
            </CardContent>
          </Card>
          
          {/* 数据库恢复卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <HardDriveUpload className="h-5 w-5" />
                数据库恢复
              </CardTitle>
              <CardDescription>
                从备份文件恢复数据库（将覆盖当前数据）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => restoreInputRef.current?.click()}
                variant="outline"
                className="w-full border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                <HardDriveUpload className="h-4 w-4 mr-2" />
                选择备份文件恢复
              </Button>
              <input
                ref={restoreInputRef}
                type="file"
                accept=".db"
                onChange={handleRestoreFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-500">
                * 仅支持 .db 格式的备份文件，恢复前请先备份当前数据
              </p>
            </CardContent>
          </Card>
          
          {/* 数据管理卡片 */}
          <Card className="md:col-span-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
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
                      删除所有收费和支出数据，此操作不可恢复！
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HardDriveDownload className="h-4 w-4 text-blue-600" />
                  数据库备份
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>备份包含完整数据库</li>
                  <li>收费数据：学生、交费记录、代办费</li>
                  <li>支出数据：日常公用、人员支出</li>
                  <li>可用于跨环境数据迁移</li>
                </ul>
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>建议：</strong>定期备份数据，操作重要功能前先备份
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HardDriveUpload className="h-4 w-4 text-orange-600" />
                  数据库恢复
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>仅支持 .db 格式备份文件</li>
                  <li>恢复将完全覆盖当前数据</li>
                  <li>恢复前务必先备份当前数据</li>
                  <li>恢复后需刷新页面</li>
                </ul>
                <div className="mt-3 p-2 bg-orange-50 rounded text-xs text-orange-700">
                  <strong>警告：</strong>恢复操作不可逆，请谨慎操作
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  清空数据
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>删除所有收费相关数据</li>
                  <li>删除所有支出相关数据</li>
                  <li>自动回收磁盘空间</li>
                  <li>需要二次确认才能执行</li>
                </ul>
                <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                  <strong>危险：</strong>此操作不可恢复，操作前务必备份
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t text-sm text-gray-500">
              <p>💡 <strong>数据导入功能</strong>位于「收费管理」页面，支持从CSV文件批量导入学生费用数据</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 恢复确认对话框 */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <HardDriveUpload className="h-5 w-5" />
              ⚠️ 数据库恢复确认
            </DialogTitle>
            <DialogDescription>
              此操作将用备份文件覆盖当前数据库
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* 警告提示 */}
            <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-orange-800 text-lg">⚠️ 注意</p>
                  <p className="text-orange-700 mt-2">
                    恢复操作将<strong>覆盖当前所有数据</strong>！
                  </p>
                  <ul className="mt-3 text-sm text-orange-700 space-y-1">
                    <li>• 当前所有收费数据将被替换</li>
                    <li>• 当前所有支出数据将被替换</li>
                    <li>• 此操作<strong>无法撤销</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 文件信息 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                备份文件：<span className="font-semibold text-gray-900">{restoreFileName}</span>
              </p>
            </div>
            
            {/* 备份提醒 */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-4">
              <p className="text-yellow-800 font-medium">
                📋 建议：恢复前请先备份当前数据库！
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { 
              setRestoreDialogOpen(false); 
              setRestoreFile(null); 
              setRestoreFileName(''); 
            }}>
              取消
            </Button>
            <Button 
              onClick={async () => {
                // 确认对话框
                if (!confirm('⚠️ 确定要恢复数据库吗？当前数据将被覆盖！')) return;
                
                await confirmRestore();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              确认恢复
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
              此操作将删除所有收费和支出数据，且无法恢复！
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
                    <li>• 所有收费数据将被删除（学生、交费记录）</li>
                    <li>• 所有支出数据将被删除</li>
                    <li>• 所有班级数据将被清空</li>
                    <li>• 此操作<strong>无法撤销</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 备份提醒 */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                📋 建议操作：请先使用&ldquo;备份数据库&rdquo;功能备份当前数据！
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
                  const response = await authFetch('/api/student-fees/all', {
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
