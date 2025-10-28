import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function EditPlan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [planName, setPlanName] = useState('2024年1月发货计划');
  const [products, setProducts] = useState([
    {
      id: 1,
      sku: 'SKU-001',
      ozonId: 'OZ123456',
      boxCount: 10,
      itemsPerBox: 20,
    },
    {
      id: 2,
      sku: 'SKU-002',
      ozonId: 'OZ123457',
      boxCount: 5,
      itemsPerBox: 15,
    },
  ]);

  // 模拟发货点数据
  const [shippingPoints] = useState([
    {
      id: 1,
      name: 'Moscow Warehouse',
      pointId: 'WH-MSK-001',
      supportTypes: ['box', 'pallet'],
    },
    {
      id: 2,
      name: 'SPB Warehouse',
      pointId: 'WH-SPB-001',
      supportTypes: ['box'],
    },
  ]);

  // 集群分配数据，包含每个产品在各集群的分配情况
  const [clusterAllocations, setClusterAllocations] = useState([
    {
      id: 1,
      clusterName: '莫斯科集群',
      shippingPoint: '', // 添加发货点字段
      productRecommendations: [
        { productId: 1, recommendedBoxes: 3 },
        { productId: 2, recommendedBoxes: 2 }
      ],
      allocations: [
        { productId: 1, boxes: 3 },
        { productId: 2, boxes: 2 }
      ],
      pallets: 2,
      palletAllocations: {
        0: { 1: 2, 2: 1 }, // 托盘0: 产品1分配2箱, 产品2分配1箱
        1: { 1: 1, 2: 1 }  // 托盘1: 产品1分配1箱, 产品2分配1箱
      }
    },
    {
      id: 2,
      clusterName: '圣彼得堡集群',
      shippingPoint: '', // 添加发货点字段
      productRecommendations: [
        { productId: 1, recommendedBoxes: 2 },
        { productId: 2, recommendedBoxes: 1 }
      ],
      allocations: [
        { productId: 1, boxes: 2 },
        { productId: 2, boxes: 1 }
      ],
      pallets: 1,
      palletAllocations: {
        0: { 1: 2, 2: 1 }  // 托盘0: 产品1分配2箱, 产品2分配1箱
      }
    },
  ]);

  // 弹窗状态
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [isPalletModalOpen, setIsPalletModalOpen] = useState(false);
  const [currentClusterId, setCurrentClusterId] = useState(null);

  // ESC键关闭弹窗
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsBoxModalOpen(false);
        setIsPalletModalOpen(false);
      }
    };

    if (isBoxModalOpen || isPalletModalOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // 恢复背景滚动
      document.body.style.overflow = 'unset';
    };
  }, [isBoxModalOpen, isPalletModalOpen]);

  const handleUpdateProduct = (productId, field, value) => {
    setProducts(
      products.map((p) =>
        p.id === productId ? { ...p, [field]: parseInt(value) || 0 } : p
      )
    );
  };

  const handleRemoveProduct = (productId) => {
    setProducts(products.filter((p) => p.id !== productId));
    // 同时移除该产品在所有集群中的分配记录
    setClusterAllocations(clusterAllocations.map(cluster => ({
      ...cluster,
      allocations: cluster.allocations.filter(alloc => alloc.productId !== productId)
    })));
  };

  // 删除集群分配
  const handleRemoveCluster = (clusterId) => {
    setClusterAllocations(clusterAllocations.filter((c) => c.id !== clusterId));
  };

  // 获取指定产品在指定集群的分配箱数
  const getAllocatedBoxes = (productId, clusterId) => {
    const cluster = clusterAllocations.find(c => c.id === clusterId);
    if (!cluster) return 0;
    const allocation = cluster.allocations.find(a => a.productId === productId);
    return allocation ? allocation.boxes : 0;
  };

  // 更新产品在集群中的箱数分配
  const updateBoxAllocation = (productId, clusterId, boxes) => {
    setClusterAllocations(prev => 
      prev.map(cluster => {
        if (cluster.id === clusterId) {
          const existingAllocation = cluster.allocations.find(a => a.productId === productId);
          if (existingAllocation) {
            return {
              ...cluster,
              allocations: cluster.allocations.map(a => 
                a.productId === productId ? { ...a, boxes } : a
              )
            };
          } else {
            return {
              ...cluster,
              allocations: [...cluster.allocations, { productId, boxes }]
            };
          }
        }
        return cluster;
      })
    );
  };

  // 更新集群的托盘信息
  const updatePalletInfo = (clusterId, pallets, palletAllocations) => {
    setClusterAllocations(prev => 
      prev.map(cluster => 
        cluster.id === clusterId 
          ? { ...cluster, pallets, palletAllocations } 
          : cluster
      )
    );
  };

  // 更新集群的发货点
  const updateShippingPoint = (clusterId, shippingPoint) => {
    setClusterAllocations(prev => 
      prev.map(cluster => 
        cluster.id === clusterId 
          ? { ...cluster, shippingPoint } 
          : cluster
      )
    );
  };

  // 计算集群的总箱数（包括纸箱和托盘中的箱数）
  const getTotalBoxesForCluster = (clusterId) => {
    const cluster = clusterAllocations.find(c => c.id === clusterId);
    if (!cluster) return 0;
    
    // 计算直接分配的箱数
    const directBoxes = cluster.allocations.reduce((sum, alloc) => sum + alloc.boxes, 0);
    
    // 计算托盘中的箱数
    let palletBoxes = 0;
    if (cluster.palletAllocations) {
      Object.values(cluster.palletAllocations).forEach(pallet => {
        palletBoxes += Object.values(pallet).reduce((sum, boxes) => sum + boxes, 0);
      });
    }
    
    return directBoxes + palletBoxes;
  };

  // 计算集群的总数量（包括纸箱和托盘中的物品数量）
  const getTotalItemsForCluster = (clusterId) => {
    const cluster = clusterAllocations.find(c => c.id === clusterId);
    if (!cluster) return 0;
    
    // 计算直接分配的物品数量
    const directItems = cluster.allocations.reduce((sum, alloc) => {
      const product = products.find(p => p.id === alloc.productId);
      return sum + (product ? alloc.boxes * product.itemsPerBox : 0);
    }, 0);
    
    // 计算托盘中的物品数量
    let palletItems = 0;
    if (cluster.palletAllocations) {
      Object.values(cluster.palletAllocations).forEach(pallet => {
        Object.entries(pallet).forEach(([productId, boxes]) => {
          const product = products.find(p => p.id === parseInt(productId));
          if (product) {
            palletItems += boxes * product.itemsPerBox;
          }
        });
      });
    }
    
    return directItems + palletItems;
  };

  // 打开箱数弹窗
  const openBoxModal = (clusterId) => {
    setCurrentClusterId(clusterId);
    setIsBoxModalOpen(true);
  };

  // 打开托盘弹窗
  const openPalletModal = (clusterId) => {
    setCurrentClusterId(clusterId);
    setIsPalletModalOpen(true);
  };

  const handleSave = () => {
    console.log('保存计划', { planName, products, clusterAllocations });
    navigate('/shipping-plans');
  };

  // 箱数弹窗组件
  const BoxModal = () => {
    // 获取当前集群的数据
    const currentCluster = clusterAllocations.find(c => c.id === currentClusterId);
    
    // 为每个产品初始化箱数状态
    const [boxAllocations, setBoxAllocations] = useState({});

    useEffect(() => {
      if (currentCluster) {
        const initialAllocations = {};
        products.forEach(product => {
          const allocation = currentCluster.allocations.find(a => a.productId === product.id);
          initialAllocations[product.id] = allocation ? allocation.boxes : 0;
        });
        setBoxAllocations(initialAllocations);
      }
    }, [currentCluster, products]);

    const handleSave = () => {
      if (currentClusterId) {
        // 保存所有产品的箱数分配
        Object.keys(boxAllocations).forEach(productId => {
          updateBoxAllocation(
            parseInt(productId), 
            currentClusterId, 
            boxAllocations[productId] || 0
          );
        });
      }
      setIsBoxModalOpen(false);
    };

    const handleBoxChange = (productId, value) => {
      setBoxAllocations(prev => ({
        ...prev,
        [productId]: parseInt(value) || 0
      }));
    };

    if (!isBoxModalOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsBoxModalOpen(false);
          }
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">分配纸箱 - {currentCluster?.clusterName}</h3>
            <button
              onClick={() => setIsBoxModalOpen(false)}
              className="btn btn-ghost p-0 h-6 w-6 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="text-sm text-gray-600 mb-2">为以下产品分配纸箱:</div>
            {products.map(product => {
              // 获取该产品在当前集群的推荐箱数
              const cluster = clusterAllocations.find(c => c.id === currentClusterId);
              const recommendation = cluster?.productRecommendations.find(r => r.productId === product.id);
              const recommendedBoxes = recommendation ? recommendation.recommendedBoxes : 0;
              const totalItems = (boxAllocations[product.id] || 0) * product.itemsPerBox;
              return (
                <div key={`${currentClusterId}-${product.id}`} className="flex flex-col p-3 border border-gray-200 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{product.sku}</div>
                      <div className="text-sm text-gray-500">Ozon ID: {product.ozonId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">箱数:</span>
                      <input
                        type="number"
                        value={boxAllocations[product.id] || 0}
                        onChange={(e) => handleBoxChange(product.id, e.target.value)}
                        className="input w-24"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    推荐箱数: {recommendedBoxes} | 单箱数量: {product.itemsPerBox} | 总数量: {totalItems}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
            <button
              onClick={() => setIsBoxModalOpen(false)}
              className="btn btn-outline"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="btn btn-default"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 托盘弹窗组件
  const PalletModal = () => {
    const currentCluster = clusterAllocations.find(c => c.id === currentClusterId);
    const [pallets, setPallets] = useState(currentCluster?.pallets || 0);
    const [boxesPerPallet, setBoxesPerPallet] = useState(currentCluster?.boxesPerPallet || 10);
    
    // 为每个托盘维护产品箱数分配
    const [palletAllocations, setPalletAllocations] = useState({});

    useEffect(() => {
      if (currentCluster && currentCluster.palletAllocations) {
        setPalletAllocations(currentCluster.palletAllocations);
      } else {
        // 初始化托盘分配数据
        const initialAllocations = {};
        for (let i = 0; i < (currentCluster?.pallets || 0); i++) {
          initialAllocations[i] = {};
          products.forEach(product => {
            // 获取该产品在该托盘中的分配箱数
            const existing = currentCluster?.palletAllocations?.[i]?.[product.id] || 0;
            initialAllocations[i][product.id] = existing;
          });
        }
        setPalletAllocations(initialAllocations);
      }
    }, [currentCluster, products]);

    const handleSave = () => {
      if (currentClusterId) {
        updatePalletInfo(currentClusterId, pallets, palletAllocations);
      }
      setIsPalletModalOpen(false);
    };

    // 更新托盘信息（包括托盘分配）
    const updatePalletInfo = (clusterId, pallets, allocations) => {
      setClusterAllocations(prev => 
        prev.map(cluster => 
          cluster.id === clusterId 
            ? { ...cluster, pallets, palletAllocations: allocations } 
            : cluster
        )
      );
    };

    // 添加托盘
    const addPallet = () => {
      const newPalletCount = pallets + 1;
      setPallets(newPalletCount);
      
      // 为新托盘初始化产品分配
      setPalletAllocations(prev => {
        const newAllocations = { ...prev };
        newAllocations[newPalletCount - 1] = {};
        products.forEach(product => {
          newAllocations[newPalletCount - 1][product.id] = 0;
        });
        return newAllocations;
      });
    };

    // 删除托盘
    const removePallet = (palletIndex) => {
      if (pallets <= 1) return; // 至少保留一个托盘
      
      const newPalletCount = pallets - 1;
      setPallets(newPalletCount);
      
      // 删除托盘分配数据
      setPalletAllocations(prev => {
        const newAllocations = { ...prev };
        delete newAllocations[palletIndex];
        
        // 重新索引剩余托盘
        const reindexed = {};
        Object.keys(newAllocations).forEach(key => {
          const index = parseInt(key);
          if (index > palletIndex) {
            reindexed[index - 1] = newAllocations[key];
          } else if (index < palletIndex) {
            reindexed[index] = newAllocations[key];
          }
        });
        
        return reindexed;
      });
    };

    // 更新托盘中产品的箱数
    const updatePalletBoxAllocation = (palletIndex, productId, boxes) => {
      setPalletAllocations(prev => {
        const newAllocations = { ...prev };
        if (!newAllocations[palletIndex]) {
          newAllocations[palletIndex] = {};
        }
        newAllocations[palletIndex][productId] = parseInt(boxes) || 0;
        return newAllocations;
      });
    };

    // 计算托盘中的总箱数
    const getTotalBoxesInPallet = (palletIndex) => {
      if (!palletAllocations[palletIndex]) return 0;
      return Object.values(palletAllocations[palletIndex]).reduce((sum, boxes) => sum + boxes, 0);
    };

    if (!isPalletModalOpen) return null;

    const cluster = clusterAllocations.find(c => c.id === currentClusterId);

    return (
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsPalletModalOpen(false);
          }
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">编辑托盘 - {cluster?.clusterName}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={addPallet}
                className="btn btn-default"
              >
                添加托盘
              </button>
              <button
                onClick={() => setIsPalletModalOpen(false)}
                className="btn btn-ghost p-0 h-6 w-6 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 托盘列表 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">托盘分配</h4>
              <div className="space-y-4">
                {Array.from({ length: pallets }).map((_, palletIndex) => {
                  const totalBoxes = getTotalBoxesInPallet(palletIndex);
                  return (
                    <div key={palletIndex} className="border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                        <div className="font-medium text-gray-900">托盘 {palletIndex + 1}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">总箱数: {totalBoxes}</span>
                          {pallets > 1 && (
                            <button
                              onClick={() => removePallet(palletIndex)}
                              className="btn btn-destructive btn-sm"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3 space-y-3">
                        {products.map(product => {
                          const allocatedBoxes = palletAllocations[palletIndex]?.[product.id] || 0;
                          const totalItems = allocatedBoxes * product.itemsPerBox;
                          // 获取该产品在当前集群的推荐箱数
                          const cluster = clusterAllocations.find(c => c.id === currentClusterId);
                          const recommendation = cluster?.productRecommendations.find(r => r.productId === product.id);
                          const recommendedBoxes = recommendation ? recommendation.recommendedBoxes : 0;
                          return (
                            <div key={`${palletIndex}-${product.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-gray-200 rounded gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{product.sku}</div>
                                <div className="text-sm text-gray-500">Ozon ID: {product.ozonId}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm text-gray-500">
                                  推荐: {recommendedBoxes}
                                </div>
                                <div className="flex items-center gap-2">
                                 
                                  <input
                                    type="number"
                                    value={allocatedBoxes}
                                    onChange={(e) => updatePalletBoxAllocation(palletIndex, product.id, e.target.value)}
                                    className="input w-20"
                                    min="0"
                                  />
                                </div>
                                <div className="text-sm text-gray-500">
                                  总数: {totalItems}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
            <button
              onClick={() => setIsPalletModalOpen(false)}
              className="btn btn-outline"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="btn btn-default"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/shipping-plans')}
          className="btn btn-ghost p-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">编辑发货计划</h1>
      </div>

      {/* 计划信息 */}
      <div className="card">
        <div className="card-content">
          <div className="space-y-4">
            <div>
              <label className="label">计划名称</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 产品列表 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">产品列表</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-head">SKU</th>
                  <th className="table-head">Ozon ID</th>
                  <th className="table-head">箱数</th>
                  <th className="table-head">单箱数量</th>
                  <th className="table-head">总数量</th>
                  <th className="table-head text-right">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {products.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="table-cell font-medium">{product.sku}</td>
                    <td className="table-cell">{product.ozonId}</td>
                    <td className="table-cell">
                      <input
                        type="number"
                        value={product.boxCount}
                        onChange={(e) =>
                          handleUpdateProduct(product.id, 'boxCount', e.target.value)
                        }
                        className="input w-24"
                        min="1"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        value={product.itemsPerBox}
                        onChange={(e) =>
                          handleUpdateProduct(product.id, 'itemsPerBox', e.target.value)
                        }
                        className="input w-24"
                        min="1"
                      />
                    </td>
                    <td className="table-cell font-medium">
                      {product.boxCount * product.itemsPerBox}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => handleRemoveProduct(product.id)}
                        className="btn btn-destructive"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 集群分配情况 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">集群分配情况</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-head">集群名称</th>
                  <th className="table-head">选择发货点</th>
                  <th className="table-head">纸箱</th>
                  <th className="table-head">托盘</th>
                  <th className="table-head">总箱数</th>
                  <th className="table-head">总数量</th>
                  <th className="table-head text-right">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {clusterAllocations.map((cluster) => (
                  <tr key={cluster.id} className="table-row">
                    <td className="table-cell font-medium">{cluster.clusterName}</td>
                    <td className="table-cell">
                      <select
                        value={cluster.shippingPoint}
                        onChange={(e) => updateShippingPoint(cluster.id, e.target.value)}
                        className="input w-32 text-sm h-8"
                      >
                        <option value="">请选择发货点</option>
                        {shippingPoints.map((point) => (
                          <option key={point.id} value={point.name}>
                            {point.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => openBoxModal(cluster.id)}
                        className="btn btn-outline"
                      >
                        编辑箱数
                      </button>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => openPalletModal(cluster.id)}
                        className="btn btn-outline"
                      >
                        编辑托盘
                      </button>
                    </td>
                    <td className="table-cell font-medium">{getTotalBoxesForCluster(cluster.id)}</td>
                    <td className="table-cell font-medium">{getTotalItemsForCluster(cluster.id)}</td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => handleRemoveCluster(cluster.id)}
                        className="btn btn-destructive"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/shipping-plans')}
          className="btn btn-outline"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="btn btn-default"
        >
          保存修改
        </button>
      </div>

      {/* 弹窗组件 */}
      <BoxModal />
      <PalletModal />
    </div>
  );
}

export default EditPlan;