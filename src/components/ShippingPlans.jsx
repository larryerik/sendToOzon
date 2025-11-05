// 使用CreatePlanModal的示例组件
import { useState, useEffect } from 'react';
import CreatePlanModal from './CreatePlanModal';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function ShippingPlans() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // 获取当前用户信息
  
  console.log('ShippingPlans渲染，user:', user);

  // 监听用户状态变化
  useEffect(() => {
    if (user) {
      console.log('用户已登录');
      setLoading(false);
    } else {
      console.log('用户未登录');
      setLoading(false);
    }
  }, [user]);

  // 如果用户未登录，显示提示信息
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <p className="text-muted-foreground">您需要登录后才能查看和管理发货计划</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">发货计划</h1>
      
      <button 
        onClick={() => {
          if (!user) {
            alert('请先登录');
            return;
          }
          setIsModalOpen(true);
        }}
        className="btn btn-default mb-6"
        disabled={loading}
      >
        {loading ? '加载中...' : '创建发货计划'}
      </button>
      
      <CreatePlanModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      {/* 其他发货计划内容 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium mb-4">现有发货计划</h2>
        <p className="text-gray-500">这里显示现有的发货计划列表</p>
      </div>
    </div>
  );
}

export default ShippingPlans;