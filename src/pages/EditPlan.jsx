import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

function EditPlan() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 从location.state获取传递的数据
  const { planName: initialPlanName, products: initialProducts, clusters: initialClusters, calculationResults } = location.state || {};

  const [planName, setPlanName] = useState(initialPlanName || '2024年1月发货计划');
  const [products, setProducts] = useState(initialProducts || [
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

  // 发货点数据（来自 ShippingPointSettings 保存的 shipping_points 表）
  const [shippingPoints, setShippingPoints] = useState([]);
  const [shippingPointsLoading, setShippingPointsLoading] = useState(false);
  useEffect(() => {
    const fetchShippingPoints = async () => {
      setShippingPointsLoading(true);
      try {
        const { data, error } = await supabase
          .from('shipping_points')
          .select('*')
          .order('id');
        if (error) throw error;
        setShippingPoints(data || []);
      } catch (err) {
        console.error('获取发货点失败:', err);
      } finally {
        setShippingPointsLoading(false);
      }
    };
    fetchShippingPoints();
  }, []);

  // 根据计算结果初始化集群分配数据
  const initializeClusterAllocations = () => {
    if (calculationResults && calculationResults.length > 0) {
      // 根据计算结果创建集群分配数据
      const clusterMap = new Map();
      
      calculationResults.forEach(result => {
        if (!clusterMap.has(result.cluster_id)) {
          clusterMap.set(result.cluster_id, {
            id: result.cluster_id,
            clusterName: result.cluster_name,
            shippingPoint: '',
            productRecommendations: [],
            allocations: [],
            pallets: 0,
            palletAllocations: {}
          });
        }
        
        const cluster = clusterMap.get(result.cluster_id);
        cluster.productRecommendations.push({
          productId: result.product_id,
          recommendedBoxes: result.recommended_boxes
        });
        
        cluster.allocations.push({
          productId: result.product_id,
          boxes: result.recommended_boxes
        });
      });
      
      return Array.from(clusterMap.values());
    } else if (initialClusters && initialClusters.length > 0) {
      // 如果没有计算结果但有初始集群数据
      return initialClusters.map(cluster => ({
        id: cluster.id,
        clusterName: cluster.nameCn || cluster.name,
        shippingPoint: '',
        productRecommendations: [],
        allocations: [],
        pallets: 0,
        palletAllocations: {}
      }));
    } else {
      // 默认集群数据
      return [
        {
          id: 1,
          clusterName: '莫斯科集群',
          shippingPoint: '',
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
            0: { 1: 2, 2: 1 },
            1: { 1: 1, 2: 1 }
          }
        },
        {
          id: 2,
          clusterName: '圣彼得堡集群',
          shippingPoint: '',
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
            0: { 1: 2, 2: 1 }
          }
        },
      ];
    }
  };

  // 集群分配数据，包含每个产品在各集群的分配情况
  const [clusterAllocations, setClusterAllocations] = useState(initializeClusterAllocations());

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
        p.id === productId
          ? {
              ...p,
              [field]: field === 'boxCount' || field === 'itemsPerBox'
                ? (parseInt(value) || 0)
                : value,
            }
          : p
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

  // 计算某产品在所有集群中的总箱数
  const getTotalBoxesForProduct = (productId) => {
    return clusterAllocations.reduce((sum, cluster) => {
      const alloc = cluster.allocations.find(a => a.productId === productId);
      return sum + (alloc ? alloc.boxes : 0);
    }, 0);
  };

  // 计算某产品在所有集群中的总数量（件）
  const getTotalItemsForProduct = (product) => {
    const totalBoxes = getTotalBoxesForProduct(product.id);
    return totalBoxes * product.itemsPerBox;
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

  const handleSave = async () => {
    console.log('保存计划', { planName, products, clusterAllocations });
    // 校验：箱条码为必填
    const missingBarcode = products.find(p => !p.barcode || String(p.barcode).trim() === '');
    if (missingBarcode) {
      alert(`请为所有产品填写箱条码（缺少: ${missingBarcode.sku}）`);
      return;
    }
    
    try {
      // 保存计划信息到数据库
      const { data: planData, error: planError } = await supabase
        .from('shipping_plans')
        .insert([
          {
            name: planName,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (planError) {
        console.error('保存计划信息失败:', planError);
        alert('保存计划信息失败: ' + planError.message);
        return;
      }

      const planId = planData.id;
      
      // 保存产品信息到数据库
      const productInserts = products.map(product => ({
        plan_id: planId,
        sku: product.sku,
        ozon_id: product.ozonId,
        box_count: product.boxCount,
        items_per_box: product.itemsPerBox,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const { error: productError } = await supabase
        .from('plan_products')
        .insert(productInserts);

      if (productError) {
        console.error('保存产品信息失败:', productError);
        alert('保存产品信息失败: ' + productError.message);
        return;
      }
      
      // 保存集群分配信息到数据库
      const clusterInserts = clusterAllocations.map(cluster => ({
        plan_id: planId,
        cluster_id: cluster.id,
        cluster_name: cluster.clusterName,
        shipping_point: cluster.shippingPoint,
        pallets: cluster.pallets,
        pallet_allocations: cluster.palletAllocations,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const { error: clusterError } = await supabase
        .from('plan_clusters')
        .insert(clusterInserts);

      if (clusterError) {
        console.error('保存集群信息失败:', clusterError);
        alert('保存集群信息失败: ' + clusterError.message);
        return;
      }
      
      // 保存产品分配信息到数据库
      const allocationInserts = [];
      clusterAllocations.forEach(cluster => {
        cluster.allocations.forEach(allocation => {
          allocationInserts.push({
            plan_id: planId,
            cluster_id: cluster.id,
            product_id: allocation.productId,
            boxes: allocation.boxes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      });
      
      if (allocationInserts.length > 0) {
        const { error: allocationError } = await supabase
          .from('plan_allocations')
          .insert(allocationInserts);

        if (allocationError) {
          console.error('保存分配信息失败:', allocationError);
          alert('保存分配信息失败: ' + allocationError.message);
          return;
        }
      }
      
      alert('计划保存成功！');
      navigate('/shipping-plans');
    } catch (err) {
      console.error('保存计划时出错:', err);
      alert('保存计划时出错: ' + err.message);
    }
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
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">编辑发货计划</h1>
          <p className="text-muted-foreground">管理您的发货计划详情</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="btn btn-default"
          >
            保存计划
          </button>
          <button
            onClick={() => navigate('/shipping-plans')}
            className="btn btn-outline"
          >
            返回
          </button>
        </div>
      </div>

      {/* 计划信息 */}
      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">计划名称</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="input flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 计算结果摘要（隐藏） */}
      {false && calculationResults && calculationResults.length > 0 && (
        <div className="card">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900">计算结果摘要</h3>
            <p className="text-sm text-gray-500">基于历史数据和安全库存计算的推荐发货箱数</p>
          </div>
          <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
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

      {/* 产品列表 */}
      <div className="card">
        <div className="border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">产品列表</h3>
          <span className="text-sm text-gray-500">{products.length} 个产品</span>
        </div>
        <div className="divide-y divide-gray-200">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <div className="font-medium text-gray-900">{product.sku}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">箱数:</span>
                  <span className="text-sm text-gray-900 font-medium">{getTotalBoxesForProduct(product.id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">单箱数量:</span>
                  <span className="text-sm text-gray-900 font-medium">{product.itemsPerBox}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">箱条码:</span>
                  <input
                    type="text"
                    value={product.barcode || ''}
                    onChange={(e) =>
                      handleUpdateProduct(product.id, 'barcode', e.target.value)
                    }
                    className={`input w-56 ${!product.barcode || String(product.barcode).trim() === '' ? 'border-red-400' : ''}`}
                    required
                    placeholder="请输入箱条码"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  总数量: {getTotalItemsForProduct(product)}
                </div>
              </div>
              <div className="flex items-center gap-2"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 集群分配情况 */}
      <div className="card">
        <div className="border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">集群分配情况</h3>
          <span className="text-sm text-gray-500">{clusterAllocations.length} 个集群</span>
        </div>
        <div className="divide-y divide-gray-200">
          {clusterAllocations.map((cluster) => (
            <div key={cluster.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <div className="font-medium text-gray-900">{cluster.clusterName}</div>
                <select
                  value={cluster.shippingPoint}
                  onChange={(e) => updateShippingPoint(cluster.id, e.target.value)}
                  className="input w-48 text-sm h-8"
                  disabled={shippingPointsLoading}
                >
                  <option value="">{shippingPointsLoading ? '加载中...' : '请选择发货点'}</option>
                  {shippingPoints.map((point) => (
                    <option key={point.id} value={point.point_id}>
                      {point.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => openBoxModal(cluster.id)}
                  className="btn btn-outline"
                >
                  编辑箱数
                </button>
                <button
                  onClick={() => openPalletModal(cluster.id)}
                  className="btn btn-outline"
                >
                  编辑托盘
                </button>
              </div>
              <div className="text-sm text-gray-500">
                总箱数: {getTotalBoxesForCluster(cluster.id)}
              </div>
              <div className="text-sm text-gray-500">
                总数量: {getTotalItemsForCluster(cluster.id)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRemoveCluster(cluster.id)}
                  className="btn btn-destructive"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 弹窗组件 */}
      <BoxModal />
      <PalletModal />
    </div>
  );
}

export default EditPlan;
