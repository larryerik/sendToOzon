import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOzonProducts } from '../utils/ozonApiClient';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function CreatePlanModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth(); // 获取当前用户信息
  const [planName, setPlanName] = useState(''); // 添加计划名称状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [ozonProducts, setOzonProducts] = useState([]);
  const [allOzonProducts, setAllOzonProducts] = useState([]); // 存储所有产品
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ozonCredentials, setOzonCredentials] = useState(null); // 存储Ozon凭据
  
  // 集群数据状态
  const [clusters, setClusters] = useState([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  
  // 计算结果状态
  const [calculationResults, setCalculationResults] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // 获取用户的Ozon凭据
  useEffect(() => {
    const fetchOzonCredentials = async () => {
      if (!user) return;
      
      try {
        console.log('正在获取用户凭据，用户ID:', user.id);
        const { data, error } = await supabase
          .from('account_settings')
          .select('client_id, api_key')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
          throw error;
        }

        console.log('获取到的凭据数据:', data);
        if (data) {
          const credentials = {
            clientId: data.client_id || '',
            apiKey: data.api_key || '',
          };
          console.log('设置凭据:', credentials);
          setOzonCredentials(credentials);
        } else {
          console.log('未找到用户凭据');
        }
      } catch (error) {
        console.error('获取Ozon凭据失败:', error);
      }
    };

    fetchOzonCredentials();
  }, [user]);

  // 获取集群数据
  useEffect(() => {
    const fetchClusters = async () => {
      if (!user) return;
      
      setClustersLoading(true);
      try {
        console.log('正在获取集群数据');
        const { data, error } = await supabase
          .from('clusters')
          .select('*')
          .order('id');

        if (error) throw error;
        
        console.log('获取到的集群数据:', data);
        setClusters(data || []);
      } catch (error) {
        console.error('获取集群数据失败:', error);
        setError('获取集群数据失败: ' + error.message);
      } finally {
        setClustersLoading(false);
      }
    };

    if (isOpen && user) {
      fetchClusters();
    }
  }, [isOpen, user]);

  // 从Ozon API获取产品（默认前10个）
  const fetchOzonProducts = useCallback(async () => {
    console.log('开始执行fetchOzonProducts，凭据:', ozonCredentials);
    
    if (!ozonCredentials) {
      console.log('没有凭据，返回');
      return;
    }
    
    // 检查凭据是否有效
    if (!ozonCredentials.clientId || !ozonCredentials.apiKey) {
      console.log('凭据无效:', ozonCredentials);
      setError('缺少Ozon API凭据，请在账户设置中配置Client ID和API Key');
      return;
    }
    
    console.log('凭据有效，继续执行');
    
    // 如果已经获取过产品，直接返回前10个
    if (allOzonProducts.length > 0) {
      console.log('已有产品数据，显示前10个');
      setOzonProducts(allOzonProducts.slice(0, 10));
      return;
    }
    
    console.log('开始加载产品数据');
    setLoading(true);
    setError(null);
    
    try {
      const { clientId, apiKey } = ozonCredentials;
      console.log('正在获取产品，使用凭据:', { clientId, apiKey: '***' });
      
      const response = await getOzonProducts({ clientId, apiKey, limit: 10 });
      console.log('Ozon API响应:', response);
      
      // 检查响应是否有效
      if (!response || !response.result || !response.result.items) {
        throw new Error('无效的API响应');
      }
      
      // 转换产品数据格式
      const products = response.result.items.map((item) => ({
        id: item.product_id,
        sku: item.offer_id,
        ozonId: item.product_id.toString(),
      }));
      
      console.log('获取到的产品:', products);
      setAllOzonProducts(products);
      setOzonProducts(products.slice(0, 10));
    } catch (error) {
      console.error('获取Ozon产品失败:', error);
      setError('获取产品失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [ozonCredentials, allOzonProducts]);

  // 当组件打开时获取产品
  useEffect(() => {
    console.log('模态框状态改变，isOpen:', isOpen);
    if (isOpen) {
      console.log('开始获取产品');
      fetchOzonProducts();
    }
  }, [isOpen, fetchOzonProducts]);
  
  // 当搜索词改变时触发本地搜索
  const searchOzonProducts = useCallback((term) => {
    console.log('执行搜索，搜索词: ', term);
    if (!term) {
      // 如果搜索词为空，显示前10个产品
      setOzonProducts(allOzonProducts.slice(0, 10));
      console.log('显示前10个产品:', allOzonProducts.slice(0, 10));
      return;
    }
    
    // 根据搜索词过滤产品
    const filtered = allOzonProducts.filter(
      (product) =>
        product.sku.toLowerCase().includes(term.toLowerCase()) ||
        product.ozonId.includes(term)
    );
    
    console.log('搜索结果，产品总数:', filtered.length);
    setOzonProducts(filtered);
  }, [allOzonProducts]);

  useEffect(() => {
    searchOzonProducts(searchTerm);
  }, [searchTerm, searchOzonProducts]);

  const searchResults = useMemo(() => ozonProducts, [ozonProducts]);

  const handleAddProduct = (product) => {
    if (!selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts([
        ...selectedProducts,
        { ...product, boxCount: 1, itemsPerBox: 10 },
      ]);
    }
    setSearchTerm('');
    // 清空搜索结果，隐藏产品列表
    setOzonProducts([]);
  };

  const handleRemoveProduct = (id) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  };

  const handleUpdateProduct = (id, field, value) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === id ? { ...p, [field]: parseInt(value) || 0 } : p
      )
    );
  };

  const toggleCluster = (cluster) => {
    console.log('切换集群:', cluster);
    setSelectedClusters((prev) => {
      const isSelected = prev.find((c) => c.id === cluster.id);
      const next = isSelected ? prev.filter((c) => c.id !== cluster.id) : [...prev, cluster];
      return next;
    });
  };

  // 集群选择变更后再打印，避免读取到旧状态
  useEffect(() => {
    console.log('当前选择的集群:', selectedClusters);
  }, [selectedClusters]);

  // 当模态框关闭时，清空搜索结果
  const handleClose = useCallback(() => {
    onClose();
    setOzonProducts([]);
    setSearchTerm('');
    // 重置表单数据
    setPlanName('');
    setSelectedProducts([]);
    setSelectedClusters([]);
    setCalculationResults([]);
    // 不清空所有产品数据，以便下次打开时可以快速显示
  }, [onClose]);

  // 点击外部关闭弹窗
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ESC键关闭弹窗
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // 恢复背景滚动
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  const handleSave = async () => {
    if (!planName.trim()) {
      alert('请输入计划名称');
      return;
    }
    if (selectedClusters.length === 0) {
      alert('请选择至少一个集群');
      return;
    }
    if (selectedProducts.length === 0) {
      alert('请添加至少一个产品');
      return;
    }
    
    console.log('保存计划', { planName, selectedClusters, selectedProducts });
    
    try {
      setIsCalculating(true);
      
      // 准备发送到Edge Function的数据
      const requestData = {
        products: selectedProducts.map(product => ({
          id: product.id,
          sku: product.sku,
          ozonId: product.ozonId,
          boxCount: product.boxCount || 1,      // 用户指定的总箱数
          itemsPerBox: product.itemsPerBox || 1 // 每箱物品数量
        })),
        clusters: selectedClusters.map(cluster => ({
          id: cluster.id,
          name: cluster.name || cluster.name_cn, // 确保名称不为空，便于历史匹配
          nameCn: cluster.name_cn || cluster.name,
          safeDays: cluster.safe_days || 7
        })),
        user_id: user.id
      };
      
      console.log('发送到Edge Function的数据:', requestData);
      
      // 调用Edge Function计算发货计划
      const { data, error } = await supabase.functions.invoke('shipping-calculator', {
        body: requestData
      });
      
      setIsCalculating(false);
      
      if (error) {
        console.error('调用Edge Function失败:', error);
        alert('计算发货计划失败: ' + error.message);
        return;
      }
      
      console.log('计算结果:', data);
      
      // 检查是否有计算结果
      if (!data.success || !data.results || data.results.length === 0) {
        alert('计算完成，但没有生成具体结果');
        return;
      }
      
      // 导航到编辑页面，并传递计算结果
      const tempPlanId = Date.now();
      navigate(`/shipping-plans/${tempPlanId}/edit`, { 
        state: { 
          planName,
          products: selectedProducts,
          clusters: selectedClusters,
          calculationResults: data.results
        } 
      });
      
      // 重置表单
      setPlanName('');
      setSelectedProducts([]);
      setSelectedClusters([]);
      setCalculationResults([]);
      
      onClose();
    } catch (err) {
      setIsCalculating(false);
      console.error('保存计划时出错:', err);
      alert('保存计划时出错: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">创建发货计划</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost p-0 h-6 w-6 text-gray-500 hover:text-gray-700"
            aria-label="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 计划名称输入 */}
          <div className="space-y-2">
            <label htmlFor="planName" className="block text-sm font-medium text-gray-700">
              计划名称
            </label>
            <input
              type="text"
              id="planName"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="请输入发货计划名称"
              className="input w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* 搜索和集群选择 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsClusterDropdownOpen((v) => !v)}
                className={`btn ${isClusterDropdownOpen ? 'btn-default' : 'btn-outline'}`}
              >
                选择集群 {selectedClusters.length > 0 && `(${selectedClusters.length})`}
              </button>
              {isClusterDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="p-2 max-h-72 overflow-y-auto">
                    {clustersLoading ? (
                      <div className="p-4 text-center text-gray-500">加载集群数据中...</div>
                    ) : clusters.length > 0 ? (
                      clusters.map((cluster) => {
                        const checked = !!selectedClusters.find((c) => c.id === cluster.id);
                        return (
                          <label
                            key={cluster.id}
                            className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCluster(cluster)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{cluster.name} ({cluster.name_cn || cluster.name})</div>
                              <div className="text-xs text-gray-500">安全天数: {cluster.safe_days || 7}天</div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-gray-500">暂无集群数据</div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm">
                    <span className="text-gray-600">已选择 {selectedClusters.length} 个</span>
                    <div className="flex space-x-2">
                      <button
                        className="btn btn-ghost text-gray-500 hover:text-gray-700"
                        onClick={(e) => { e.stopPropagation(); setSelectedClusters([]); }}
                      >
                        清空
                      </button>
                      <button
                        className="btn btn-ghost text-blue-600 hover:text-blue-800"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          console.log('点击完成按钮，关闭集群选择下拉框');
                          setIsClusterDropdownOpen(false); 
                        }}
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    console.log('搜索词改变:', e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  onFocus={() => {
                    // 当搜索框获得焦点时，如果已有产品数据但未显示，则显示前10个产品
                    if (allOzonProducts.length > 0 && searchResults.length === 0) {
                      setOzonProducts(allOzonProducts.slice(0, 10));
                    }
                  }}
                  onBlur={() => {
                    // 延迟隐藏搜索结果，以便用户可以点击搜索结果
                    setTimeout(() => {
                      setOzonProducts([]);
                    }, 200);
                  }}
                  placeholder="搜索产品 (SKU 或名称)"
                  className="input pl-10 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {loading && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center">
                    <div className="text-sm text-gray-500">搜索中...</div>
                  </div>
                )}
                {error && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
                    <div className="text-sm text-red-500">错误: {error}</div>
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{product.sku}</div>
                        <div className="text-sm text-gray-500">Ozon ID: {product.ozonId}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  if (searchResults.length === 0 && allOzonProducts.length > 0) {
                    // 显示前10个产品
                    setOzonProducts(allOzonProducts.slice(0, 10));
                  } else {
                    // 隐藏产品列表
                    setOzonProducts([]);
                  }
                }}
                className="btn btn-outline"
              >
                {searchResults.length > 0 ? '隐藏' : '显示产品'}
              </button>
            </div>
          </div>

          {/* 已选择的集群显示 */}
          {selectedClusters.length > 0 && (
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">已选择集群：</div>
              <div className="flex flex-wrap gap-2">
                {selectedClusters.map((cluster) => (
                  <span
                    key={cluster.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {cluster.name} ({cluster.name_cn || cluster.name})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 产品列表 */}
          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">产品列表</h4>
              <span className="text-sm text-gray-500">{selectedProducts.length} 个产品</span>
            </div>
            <div className="divide-y divide-gray-200">
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{product.sku}</div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Ozon: {product.ozonId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">箱数:</label>
                          <input
                            type="number"
                            value={product.boxCount}
                            onChange={(e) => handleUpdateProduct(product.id, 'boxCount', e.target.value)}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <label className="text-xs text-gray-500">单箱:</label>
                          <input
                            type="number"
                            value={product.itemsPerBox}
                            onChange={(e) => handleUpdateProduct(product.id, 'itemsPerBox', e.target.value)}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="font-medium text-gray-900">
                        总计: {product.boxCount * product.itemsPerBox}
                      </div>
                      <button
                        onClick={() => handleRemoveProduct(product.id)}
                        className="btn btn-ghost text-red-500 hover:text-red-600 hover:bg-red-100 text-xs px-2 py-1 rounded border border-gray-300"
                        title="移除产品"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {selectedProducts.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="mt-4">请搜索并添加产品</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 弹窗底部 */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="btn btn-outline"
            disabled={isCalculating}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="btn btn-default"
            disabled={isCalculating}
          >
            {isCalculating ? '计算中...' : '保存计划'}
          </button>
        </div>
        
        {/* 计算结果展示 */}
        {calculationResults.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">计算结果</h4>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {calculationResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{result.sku}</div>
                    <div className="text-sm text-gray-500">{result.cluster_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{Math.round(result.recommended_boxes)} 箱</div>
                    <div className="text-xs text-gray-500">{result.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreatePlanModal;