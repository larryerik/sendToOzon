import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CreatePlanModal from '../components/CreatePlanModal';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function ShippingPlans() {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('shipping_plans')
        .select('id, name, status, total_boxes, total_skus, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setPlans(data || []);
      setError(null);
    } catch (err) {
      console.error('加载发货计划失败:', err);
      setError(err.message || '加载发货计划失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handlePlanCreated = () => {
    setIsCreateModalOpen(false);
    fetchPlans();
  };

  const handleDelete = (id) => setConfirmDeleteId(id);

  const doDelete = async () => {
    if (!confirmDeleteId || !user) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('shipping_plans')
        .delete()
        .eq('id', confirmDeleteId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setPlans((prev) => prev.filter((plan) => plan.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('删除计划失败:', err);
      alert(`删除计划失败: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <p className="text-muted-foreground">登录后即可查看和管理发货计划。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">发货计划</h1>
          <p className="text-muted-foreground">管理和创建您的发货计划</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-default"
        >
          创建计划
        </button>
      </div>

      {error && (
        <div className="alert alert-destructive">
          <div className="alert-description">{error}</div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-head">计划名称</th>
                <th className="table-head text-center">SKU 数量</th>
                <th className="table-head text-center">总箱数</th>
                <th className="table-head text-center">状态</th>
                <th className="table-head text-right">操作</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-6 text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-6 text-muted-foreground">
                    暂无发货计划
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="table-row">
                    <td className="table-cell font-medium">
                      <div>
                        <Link to={`/shipping-plans/${plan.id}/edit`} className="text-blue-600 hover:underline">
                          {plan.name}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        创建时间: {plan.created_at ? new Date(plan.created_at).toLocaleString() : '—'}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <span className="badge badge-secondary">{plan.total_skus ?? 0}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="badge badge-secondary">{plan.total_boxes ?? 0}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="badge badge-secondary capitalize">{plan.status}</span>
                    </td>
                    <td className="table-cell text-right">
                      {confirmDeleteId === plan.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-muted-foreground">确认删除？</span>
                          <button
                            onClick={doDelete}
                            className="btn btn-destructive"
                            disabled={deleting}
                          >
                            {deleting ? '删除中...' : '删除'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="btn btn-outline"
                            disabled={deleting}
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/shipping-plans/${plan.id}/edit`}
                            className="btn btn-outline"
                          >
                            编辑
                          </Link>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="btn btn-destructive"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && plans.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium">暂无发货计划</h3>
            <p className="mt-2 text-muted-foreground">点击上方按钮创建您的第一个计划</p>
          </div>
        )}
      </div>

      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPlanCreated={handlePlanCreated}
      />
    </div>
  );
}

export default ShippingPlans;
