import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function ShippingPointSettings() {
  const [shippingPoints, setShippingPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isNewPoint, setIsNewPoint] = useState(false); // 标记是否为新增提货点
  const { user } = useAuth(); // 获取当前用户信息

  // 获取发货点数据
  useEffect(() => {
    if (user) {
      fetchShippingPoints();
    }
  }, [user]);

  const fetchShippingPoints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_points')
        .select('*')
        .order('id');

      if (error) throw error;
      setShippingPoints(data || []);
    } catch (error) {
      console.error('获取发货点数据失败:', error);
      // 显示用户友好的错误消息
      alert('获取发货点数据失败，请确保您已正确登录');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (point) => {
    setIsEditing(point.id);
    setEditForm(point);
    setIsNewPoint(false); // 编辑现有提货点
  };

  const handleSave = async () => {
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    try {
      if (isNewPoint) {
        // 新增发货点
        const { data, error } = await supabase
          .from('shipping_points')
          .insert([editForm])
          .select();

        if (error) throw error;
        // 重新获取数据以确保ID正确
        await fetchShippingPoints();
      } else {
        // 更新发货点
        const { data, error } = await supabase
          .from('shipping_points')
          .update(editForm)
          .eq('id', isEditing)
          .select();

        if (error) throw error;
        setShippingPoints(
          shippingPoints.map((p) => (p.id === isEditing ? data[0] : p))
        );
      }
      setIsEditing(null);
      setEditForm({});
      setIsNewPoint(false);
    } catch (error) {
      console.error('保存发货点失败:', error);
      alert(`保存发货点失败: ${error.message}`);
    }
  };

  const handleCancel = () => {
    // 如果是新增发货点且点击取消，则从列表中移除
    if (isNewPoint) {
      // 移除临时添加的发货点项
      setShippingPoints(shippingPoints.filter((p) => p.id !== isEditing));
    }
    setIsEditing(null);
    setEditForm({});
    setIsNewPoint(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const handleDelete = (id) => setConfirmDeleteId(id);
  
  const doDelete = async () => {
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    try {
      const { error } = await supabase
        .from('shipping_points')
        .delete()
        .eq('id', confirmDeleteId);

      if (error) throw error;
      setShippingPoints(shippingPoints.filter((p) => p.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('删除发货点失败:', error);
      alert(`删除发货点失败: ${error.message}`);
    }
  };

  const handleAdd = () => {
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    const newPoint = {
      name: '',
      point_id: '', // 使用下划线命名以匹配数据库字段
      support_types: ['box'], // 使用下划线命名以匹配数据库字段
    };
    // 添加一个新的临时ID用于识别新增行
    const tempId = 'new_' + Date.now();
    setShippingPoints([...shippingPoints, { ...newPoint, id: tempId }]);
    setIsEditing(tempId);
    setEditForm(newPoint);
    setIsNewPoint(true); // 标记为新增提货点
  };

  const handleTypeToggle = (type) => {
    const currentTypes = editForm.support_types || [];
    if (currentTypes.includes(type)) {
      setEditForm({
        ...editForm,
        support_types: currentTypes.filter((t) => t !== type),
      });
    } else {
      setEditForm({
        ...editForm,
        support_types: [...currentTypes, type],
      });
    }
  };

  const getSupportTypesText = (types) => {
    const typeMap = {
      box: '箱子',
      pallet: '托盘',
    };
    return types.map((t) => typeMap[t]).join('、');
  };

  // 如果用户未登录，显示提示信息
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <p className="text-muted-foreground">您需要登录后才能查看和管理发货点</p>
        </div>
      </div>
    );
  }

  // 加载状态显示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设置发货点</h1>
          <p className="text-muted-foreground">管理您的发货点配置</p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-default"
        >
          添加发货点
        </button>
      </div>

      {/* 发货点列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-head">发货点名称</th>
                <th className="table-head">发货点ID</th>
                <th className="table-head">支持类型</th>
                <th className="table-head text-right">操作</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {shippingPoints.map((point) => (
                <tr key={point.id} className="table-row">
                  {isEditing === point.id ? (
                    <>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="input"
                          placeholder="发货点名称"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editForm.point_id}
                          onChange={(e) =>
                            setEditForm({ ...editForm, point_id: e.target.value })
                          }
                          className="input"
                          placeholder="WH-XXX-001"
                        />
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editForm.support_types?.includes('box')}
                              onChange={() => handleTypeToggle('box')}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="ml-2 text-sm">箱子</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editForm.support_types?.includes('pallet')}
                              onChange={() => handleTypeToggle('pallet')}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="ml-2 text-sm">托盘</span>
                          </label>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={handleSave} 
                            className="btn btn-default"
                          >
                            保存
                          </button>
                          <button 
                            onClick={handleCancel} 
                            className="btn btn-outline"
                          >
                            取消
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="table-cell font-medium">{point.name}</td>
                      <td className="table-cell">{point.point_id}</td>
                      <td className="table-cell">
                        <span className="badge badge-secondary">
                          {getSupportTypesText(point.support_types)}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          {confirmDeleteId === point.id ? (
                            <>
                              <span className="text-sm text-muted-foreground">确认删除？</span>
                              <button 
                                onClick={doDelete} 
                                className="btn btn-destructive"
                              >
                                删除
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)} 
                                className="btn btn-outline"
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleEdit(point)} 
                                className="btn btn-outline"
                              >
                                编辑
                              </button>
                              <button 
                                onClick={() => handleDelete(point.id)} 
                                className="btn btn-destructive"
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {shippingPoints.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium">暂无发货点</h3>
            <p className="mt-2 text-muted-foreground">点击上方按钮添加您的第一个发货点</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShippingPointSettings;