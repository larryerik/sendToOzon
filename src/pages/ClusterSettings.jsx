import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function ClusterSettings() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isNewCluster, setIsNewCluster] = useState(false); // 标记是否为新增集群
  const { user } = useAuth(); // 获取当前用户信息

  // 获取集群数据
  useEffect(() => {
    if (user) {
      fetchClusters();
    }
  }, [user]);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('id');

      if (error) throw error;
      setClusters(data || []);
    } catch (error) {
      console.error('获取集群数据失败:', error);
      // 显示用户友好的错误消息
      alert('获取集群数据失败，请确保您已正确登录');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cluster) => {
    setIsEditing(cluster.id);
    setEditForm(cluster);
    setIsNewCluster(false); // 编辑现有集群
  };

  const handleSave = async () => {
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    try {
      if (isNewCluster) {
        // 新增集群
        const { data, error } = await supabase
          .from('clusters')
          .insert([editForm])
          .select();

        if (error) throw error;
        // 重新获取数据以确保ID正确
        await fetchClusters();
      } else {
        // 更新集群
        const { data, error } = await supabase
          .from('clusters')
          .update(editForm)
          .eq('id', isEditing)
          .select();

        if (error) throw error;
        setClusters(
          clusters.map((c) => (c.id === isEditing ? data[0] : c))
        );
      }
      setIsEditing(null);
      setEditForm({});
      setIsNewCluster(false);
    } catch (error) {
      console.error('保存集群失败:', error);
      alert(`保存集群失败: ${error.message}`);
    }
  };

  const handleCancel = () => {
    // 如果是新增集群且点击取消，则从列表中移除
    if (isNewCluster) {
      // 移除临时添加的集群项
      setClusters(clusters.filter((c) => c.id !== isEditing));
    }
    setIsEditing(null);
    setEditForm({});
    setIsNewCluster(false);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const doDelete = async () => {
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    try {
      const { error } = await supabase
        .from('clusters')
        .delete()
        .eq('id', confirmDeleteId);

      if (error) throw error;
      setClusters(clusters.filter((c) => c.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('删除集群失败:', error);
      alert(`删除集群失败: ${error.message}`);
    }
  };

  const handleAdd = () => {
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    const newCluster = {
      name: '',
      name_cn: '', // 注意这里使用下划线命名以匹配数据库字段
      safe_days: 7,
    };
    // 添加一个新的临时ID用于识别新增行
    const tempId = 'new_' + Date.now();
    setClusters([...clusters, { ...newCluster, id: tempId }]);
    setIsEditing(tempId);
    setEditForm(newCluster);
    setIsNewCluster(true); // 标记为新增集群
  };

  // 如果用户未登录，显示提示信息
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <p className="text-muted-foreground">您需要登录后才能查看和管理集群</p>
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
          <h1 className="text-2xl font-bold tracking-tight">设置集群</h1>
          <p className="text-muted-foreground">管理您的发货集群配置</p>
        </div>
        <button 
          onClick={handleAdd} 
          className="btn btn-default"
        >
          添加集群
        </button>
      </div>

      {/* 集群列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-head">集群名称</th>
                <th className="table-head">集群中文名</th>
                <th className="table-head">安全天数</th>
                <th className="table-head text-right">操作</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {clusters.map((cluster) => (
                <tr key={cluster.id} className="table-row">
                  {isEditing === cluster.id ? (
                    <>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="input"
                          placeholder="Cluster-Name"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          value={editForm.name_cn}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name_cn: e.target.value })
                          }
                          className="input"
                          placeholder="集群中文名"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="number"
                          value={editForm.safe_days}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              safe_days: parseInt(e.target.value) || 0,
                            })
                          }
                          className="input w-24"
                          min="1"
                        />
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
                      <td className="table-cell font-medium">{cluster.name}</td>
                      <td className="table-cell">{cluster.name_cn}</td>
                      <td className="table-cell">
                        <span className="badge badge-secondary">{cluster.safe_days} 天</span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          {confirmDeleteId === cluster.id ? (
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
                                onClick={() => handleEdit(cluster)} 
                                className="btn btn-outline"
                              >
                                编辑
                              </button>
                              <button 
                                onClick={() => handleDelete(cluster.id)} 
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

        {clusters.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium">暂无集群</h3>
            <p className="mt-2 text-muted-foreground">点击上方按钮添加您的第一个集群</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClusterSettings;