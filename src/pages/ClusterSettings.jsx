import { useState } from 'react';

function ClusterSettings() {
  const [clusters, setClusters] = useState([
    { id: 1, name: 'Cluster-Moscow', nameCn: '莫斯科集群', safeDays: 7 },
    { id: 2, name: 'Cluster-SPB', nameCn: '圣彼得堡集群', safeDays: 5 },
    { id: 3, name: 'Cluster-Kazan', nameCn: '喀山集群', safeDays: 10 },
  ]);

  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isNewCluster, setIsNewCluster] = useState(false); // 标记是否为新增集群

  const handleEdit = (cluster) => {
    setIsEditing(cluster.id);
    setEditForm(cluster);
    setIsNewCluster(false); // 编辑现有集群
  };

  const handleSave = () => {
    if (isNewCluster) {
      // 保存新增集群
      setClusters([...clusters, editForm]);
    } else {
      // 保存编辑的集群
      setClusters(
        clusters.map((c) => (c.id === isEditing ? editForm : c))
      );
    }
    setIsEditing(null);
    setEditForm({});
    setIsNewCluster(false);
  };

  const handleCancel = () => {
    // 如果是新增集群且点击取消，则从列表中移除
    if (isNewCluster) {
      setClusters(clusters.filter((c) => c.id !== isEditing));
    }
    setIsEditing(null);
    setEditForm({});
    setIsNewCluster(false);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const doDelete = () => {
    setClusters(clusters.filter((c) => c.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  const handleAdd = () => {
    const newCluster = {
      id: Date.now(),
      name: '',
      nameCn: '',
      safeDays: 7,
    };
    setClusters([...clusters, newCluster]);
    setIsEditing(newCluster.id);
    setEditForm(newCluster);
    setIsNewCluster(true); // 标记为新增集群
  };

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
                          value={editForm.nameCn}
                          onChange={(e) =>
                            setEditForm({ ...editForm, nameCn: e.target.value })
                          }
                          className="input"
                          placeholder="集群中文名"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="number"
                          value={editForm.safeDays}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              safeDays: parseInt(e.target.value) || 0,
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
                      <td className="table-cell">{cluster.nameCn}</td>
                      <td className="table-cell">
                        <span className="badge badge-secondary">{cluster.safeDays} 天</span>
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

        {clusters.length === 0 && (
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