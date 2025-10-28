import { useState, useEffect } from 'react';

function CreatePlanModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState([]);

  // 模拟集群数据（下拉多选）
  const clusters = [
    { id: 1, name: 'Cluster-Moscow', nameCn: '莫斯科集群', safeDays: 7 },
    { id: 2, name: 'Cluster-SPB', nameCn: '圣彼得堡集群', safeDays: 5 },
    { id: 3, name: 'Cluster-Kazan', nameCn: '喀山集群', safeDays: 10 },
    { id: 4, name: 'Cluster-Ekb', nameCn: '叶卡捷琳堡集群', safeDays: 8 },
  ];

  // 点击外部或按ESC键关闭弹窗
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  const toggleCluster = (cluster) => {
    const exists = selectedClusters.find((c) => c.id === cluster.id);
    if (exists) {
      setSelectedClusters(selectedClusters.filter((c) => c.id !== cluster.id));
    } else {
      setSelectedClusters([...selectedClusters, cluster]);
    }
  };

  // 模拟搜索结果
  const searchResults = searchTerm
    ? [
        { id: 1, sku: 'SKU-001', name: '产品A', ozonId: 'OZ123456' },
        { id: 2, sku: 'SKU-002', name: '产品B', ozonId: 'OZ123457' },
        { id: 3, sku: 'SKU-003', name: '产品C', ozonId: 'OZ123458' },
      ].filter(
        (p) =>
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleAddProduct = (product) => {
    if (!selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts([
        ...selectedProducts,
        { ...product, boxCount: 1, itemsPerBox: 10 },
      ]);
    }
    setSearchTerm('');
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

  const handleSave = () => {
    if (selectedClusters.length === 0) {
      alert('请选择至少一个集群');
      return;
    }
    if (selectedProducts.length === 0) {
      alert('请添加至少一个产品');
      return;
    }
    console.log('保存计划', { selectedClusters, selectedProducts });
    onClose();
  };

  // 点击外部关闭弹窗
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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
                    {clusters.map((cluster) => {
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
                            <div className="text-sm font-medium text-gray-900">{cluster.nameCn}</div>
                            <div className="text-xs text-gray-500">{cluster.name} · 安全天数: {cluster.safeDays}天</div>
                          </div>
                        </label>
                      );
                    })}
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
                        onClick={(e) => { e.stopPropagation(); setIsClusterDropdownOpen(false); }}
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索产品 (SKU 或名称)"
                className="input pl-10 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{product.sku}</div>
                      <div className="text-sm text-gray-500">{product.name}</div>
                    </button>
                  ))}
                </div>
              )}
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
                    {cluster.nameCn}
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
                        className="btn btn-ghost p-0 h-5 w-5 text-gray-500 hover:text-red-500"
                        title="删除产品"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
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
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="btn btn-default"
          >
            保存计划
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreatePlanModal;