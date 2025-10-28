import { useState } from 'react';
import CreatePlanModal from '../components/CreatePlanModal';

function ShippingPlans() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // 模拟数据
  const [plans, setPlans] = useState([
    {
      id: 1,
      name: '2024年1月发货计划',
      productCount: 15,
      skuCount: 45,
      boxCount: 120,
    },
    {
      id: 2,
      name: '春季补货计划',
      productCount: 8,
      skuCount: 24,
      boxCount: 60,
    },
  ]);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const handleDelete = (id) => setConfirmDeleteId(id);
  const doDelete = () => {
    setPlans(plans.filter(plan => plan.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
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

      {/* 计划列表 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-head">计划名称</th>
                <th className="table-head text-center">产品数量</th>
                <th className="table-head text-center">SKU数量</th>
                <th className="table-head text-center">箱数</th>
                <th className="table-head text-right">操作</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {plans.map((plan) => (
                <tr key={plan.id} className="table-row">
                  <td className="table-cell font-medium">{plan.name}</td>
                  <td className="table-cell text-center">
                    <span className="badge badge-secondary">{plan.productCount}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge badge-secondary">{plan.skuCount}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge badge-secondary">{plan.boxCount}</span>
                  </td>
                  <td className="table-cell text-right">
                    {confirmDeleteId === plan.id ? (
                      <div className="flex items-center justify-end gap-2">
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
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={`/shipping-plans/${plan.id}/edit`} 
                          className="btn btn-outline"
                        >
                          编辑
                        </a>
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
              ))}
            </tbody>
          </table>
        </div>
        
        {plans.length === 0 && (
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

      {/* 创建计划弹窗 */}
      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export default ShippingPlans;