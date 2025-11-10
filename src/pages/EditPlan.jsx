import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

function EditPlan() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { calculationResults: initialCalculationResults } = location.state || {};

  const [planName, setPlanName] = useState('');
  const [planStatus, setPlanStatus] = useState('draft');
  const [products, setProducts] = useState([]);
  const [clusterAllocations, setClusterAllocations] = useState([]);
  const [calculationResults, setCalculationResults] = useState(initialCalculationResults || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [removedProductIds, setRemovedProductIds] = useState([]);
  const [removedClusterIds, setRemovedClusterIds] = useState([]);
  const [clusterExecutionState, setClusterExecutionState] = useState({});
  const pdfObjectUrlsRef = useRef([]);

  useEffect(() => {
    if (initialCalculationResults && initialCalculationResults.length > 0) {
      setCalculationResults(initialCalculationResults);
    }
  }, [initialCalculationResults]);

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

  const fetchPlan = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: planData, error: planError } = await supabase
        .from('shipping_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (planError) throw planError;
      if (!planData) throw new Error('未找到发货计划');

      const [
        { data: planProductsData, error: planProductsError },
        { data: planClustersData, error: planClustersError },
        { data: planAllocationsData, error: planAllocationsError },
      ] = await Promise.all([
        supabase
          .from('plan_products')
          .select('id, sku, ozon_id, product_name, box_count, items_per_box, carton_barcode')
          .eq('plan_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('plan_clusters')
          .select('id, cluster_id, cluster_code, cluster_name, shipping_point_id, shipping_point, pallets, pallet_allocations')
          .eq('plan_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('plan_allocations')
          .select('id, plan_id, cluster_id, product_id, boxes')
          .eq('plan_id', id),
      ]);

      if (planProductsError) throw planProductsError;
      if (planClustersError) throw planClustersError;
      if (planAllocationsError) throw planAllocationsError;

      setPlanName(planData.name || '');
      setPlanStatus(planData.status || 'draft');

      const productList = (planProductsData || []).map((row) => ({
        id: row.id,
        sku: row.sku,
        ozonId: row.ozon_id,
        productName: row.product_name,
        boxCount: row.box_count || 0,
        itemsPerBox: row.items_per_box || 1,
        barcode: row.carton_barcode || '',
      }));

      const allocationsByCluster = new Map();
      (planAllocationsData || []).forEach((row) => {
        if (!row.cluster_id) return;
        const list = allocationsByCluster.get(row.cluster_id) || [];
        list.push({
          id: row.id,
          productId: row.product_id,
          boxes: row.boxes || 0,
        });
        allocationsByCluster.set(row.cluster_id, list);
      });

      const clusterList = (planClustersData || []).map((row) => ({
        id: row.id,
        clusterId: row.cluster_id,
        clusterCode: row.cluster_code,
        clusterName: row.cluster_name,
        shippingPointId: row.shipping_point_id,
        shippingPoint: row.shipping_point || '',
        productRecommendations: [],
        allocations: allocationsByCluster.get(row.id) || [],
        pallets: row.pallets || 0,
        palletAllocations: row.pallet_allocations || {},
      }));

      setProducts(productList);
      setClusterAllocations(clusterList);
      setRemovedProductIds([]);
      setRemovedClusterIds([]);
      setClusterExecutionState({});
    } catch (err) {
      console.error('加载计划数据失败:', err);
      setError(err.message || '加载计划数据失败');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

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

  useEffect(() => {
    return () => {
      pdfObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const createPdfObjectUrl = (base64) => {
    if (!base64) return null;
    const pureBase64 = base64.includes(',') ? base64.split(',').pop() : base64;
    try {
      const byteCharacters = atob(pureBase64);
      const byteNumbers = Array.from(byteCharacters).map((char) => char.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      pdfObjectUrlsRef.current.push(objectUrl);
      return objectUrl;
    } catch {
      return null;
    }
  };

  const handleUpdateProduct = (productId, field, value) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        if (field === 'boxCount' || field === 'itemsPerBox') {
          const numericValue = Number(value);
          const safeValue = Number.isFinite(numericValue)
            ? Math.max(field === 'itemsPerBox' ? 1 : 0, Math.floor(numericValue))
            : field === 'itemsPerBox'
              ? 1
              : 0;
          return { ...p, [field]: safeValue };
        }
        return { ...p, [field]: value };
      })
    );
  };

  const handleRemoveProduct = (productId) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (targetProduct && isUuid(targetProduct.id)) {
      setRemovedProductIds((prev) =>
        prev.includes(targetProduct.id) ? prev : [...prev, targetProduct.id]
      );
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setClusterAllocations((prev) =>
      prev.map((cluster) => ({
        ...cluster,
        allocations: cluster.allocations.filter((alloc) => alloc.productId !== productId),
      }))
    );
  };

  const handleRemoveCluster = (clusterId) => {
    const targetCluster = clusterAllocations.find((c) => c.id === clusterId);
    if (targetCluster && isUuid(targetCluster.id)) {
      setRemovedClusterIds((prev) =>
        prev.includes(targetCluster.id) ? prev : [...prev, targetCluster.id]
      );
    }
    setClusterAllocations((prev) => prev.filter((c) => c.id !== clusterId));
    setClusterExecutionState((prev) => {
      if (!prev[clusterId]) return prev;
      const next = { ...prev };
      delete next[clusterId];
      return next;
    });
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
  const updateShippingPoint = (clusterId, shippingPointValue) => {
    const point = shippingPoints.find((p) => p.point_id === shippingPointValue);
    setClusterAllocations((prev) =>
      prev.map((cluster) =>
        cluster.id === clusterId
          ? {
              ...cluster,
              shippingPoint: shippingPointValue,
              shippingPointId: point ? point.id : null,
            }
          : cluster
      )
    );
  };

  const updateClusterExecution = (clusterId, nextState) => {
    setClusterExecutionState((prev) => ({
      ...prev,
      [clusterId]: {
        ...(prev[clusterId] || {}),
        ...nextState,
      },
    }));
  };

  const handleExecuteCluster = async (cluster) => {
    if (!user) {
      setError('请先登录后再执行发货任务');
      return;
    }
    if (!isUuid(cluster.id)) {
      updateClusterExecution(cluster.id, {
        status: 'error',
        error: '请先保存计划后再执行该集群',
      });
      return;
    }

    updateClusterExecution(cluster.id, { status: 'loading', error: null });
    try {
      const { data, error: functionError } = await supabase.functions.invoke('execute-plan', {
        body: {
          plan_id: id,
          plan_cluster_id: cluster.id,
          cluster_id: cluster.clusterId || cluster.id,
          user_id: user.id,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || '执行失败');
      }
      if (!data?.success) {
        throw new Error(data?.message || '执行失败');
      }

      let pdfUrl = data.pdfUrl || data.pdf_url;
      if (!pdfUrl && data.pdf_base64) {
        pdfUrl = createPdfObjectUrl(data.pdf_base64);
      }

      updateClusterExecution(cluster.id, {
        status: 'success',
        pdfUrl: pdfUrl || null,
        message: data?.message || '执行完成',
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('执行集群失败:', err);
      updateClusterExecution(cluster.id, {
        status: 'error',
        error: err.message || '执行失败，请稍后重试',
      });
    }
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
      Object.values(cluster.palletAllocations).forEach((pallet) => {
        Object.entries(pallet).forEach(([productId, boxes]) => {
          const product = products.find((p) => String(p.id) === String(productId));
          if (product) {
            palletItems += (boxes || 0) * product.itemsPerBox;
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
    if (saving || loading) return;
    if (!user) {
      setError('请先登录后再保存发货计划');
      return;
    }
    if (!planName.trim()) {
      setError('请输入计划名称');
      return;
    }
    const missingBarcode = products.find(
      (p) => !p.barcode || String(p.barcode).trim() === ''
    );
    if (missingBarcode) {
      setError(`请为产品 ${missingBarcode.sku} 填写箱条码`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const totalBoxes = products.reduce(
        (sum, product) => sum + (product.boxCount || 0),
        0
      );
      const totalSkus = products.length;

      const { error: updatePlanError } = await supabase
        .from('shipping_plans')
        .update({
          name: planName.trim(),
          total_boxes: totalBoxes,
          total_skus: totalSkus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updatePlanError) throw updatePlanError;

      const productPayload = products.map((product) => {
        const payload = {
          plan_id: id,
          sku: product.sku,
          ozon_id: product.ozonId,
          product_name: product.productName ?? null,
          box_count: product.boxCount || 0,
          items_per_box: product.itemsPerBox || 1,
          carton_barcode: product.barcode ? product.barcode.trim() : null,
        };
        if (isUuid(product.id)) {
          payload.id = product.id;
        }
        return payload;
      });

      if (productPayload.length > 0) {
        const { error: upsertProductsError } = await supabase
          .from('plan_products')
          .upsert(productPayload, { onConflict: 'id' });
        if (upsertProductsError) throw upsertProductsError;
      }

      if (removedProductIds.length > 0) {
        const { error: deleteProductsError } = await supabase
          .from('plan_products')
          .delete()
          .in('id', removedProductIds);
        if (deleteProductsError) throw deleteProductsError;
        setRemovedProductIds([]);
      }

      const clusterPayload = clusterAllocations.map((cluster) => {
        const payload = {
          plan_id: id,
          cluster_id: cluster.clusterId ?? null,
          cluster_code: cluster.clusterCode ?? null,
          cluster_name: cluster.clusterName || '未命名集群',
          shipping_point_id: cluster.shippingPointId ?? null,
          shipping_point: cluster.shippingPoint || null,
          pallets: cluster.pallets || 0,
          pallet_allocations: cluster.palletAllocations || null,
        };
        if (isUuid(cluster.id)) {
          payload.id = cluster.id;
        }
        return payload;
      });

      if (clusterPayload.length > 0) {
        const { error: upsertClustersError } = await supabase
          .from('plan_clusters')
          .upsert(clusterPayload, { onConflict: 'id' });
        if (upsertClustersError) throw upsertClustersError;
      }

      if (removedClusterIds.length > 0) {
        const { error: deleteClustersError } = await supabase
          .from('plan_clusters')
          .delete()
          .in('id', removedClusterIds);
        if (deleteClustersError) throw deleteClustersError;
        setRemovedClusterIds([]);
      }

      const allocationPayload = [];
      clusterAllocations.forEach((cluster) => {
        const clusterPlanId = isUuid(cluster.id) ? cluster.id : null;
        if (!clusterPlanId) return;
        cluster.allocations.forEach((allocation) => {
          const productPlanId = isUuid(allocation.productId)
            ? allocation.productId
            : allocation.productId;
          if (!productPlanId) return;
          const boxes = Math.max(0, Math.floor(allocation.boxes || 0));
          allocationPayload.push({
            plan_id: id,
            cluster_id: clusterPlanId,
            product_id: productPlanId,
            boxes,
          });
        });
      });

      const { error: deleteAllocationsError } = await supabase
        .from('plan_allocations')
        .delete()
        .eq('plan_id', id);
      if (deleteAllocationsError) throw deleteAllocationsError;

      if (allocationPayload.length > 0) {
        const { error: insertAllocationsError } = await supabase
          .from('plan_allocations')
          .insert(allocationPayload);
        if (insertAllocationsError) throw insertAllocationsError;
      }

      await fetchPlan();
      alert('计划保存成功！');
    } catch (err) {
      console.error('保存计划时出错:', err);
      setError(err.message || '保存计划时出错，请稍后重试');
    } finally {
      setSaving(false);
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
        Object.entries(boxAllocations).forEach(([productId, value]) => {
          const boxes = Math.max(0, Math.floor(Number(value) || 0));
          updateBoxAllocation(productId, currentClusterId, boxes);
        });
      }
      setIsBoxModalOpen(false);
    };

    const handleBoxChange = (productId, value) => {
      const numericValue = Number(value);
      setBoxAllocations((prev) => ({
        ...prev,
        [productId]: Number.isFinite(numericValue)
          ? Math.max(0, Math.floor(numericValue))
          : 0,
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
        Object.keys(newAllocations).forEach((key) => {
          const index = Number(key);
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
      setPalletAllocations((prev) => {
        const newAllocations = { ...prev };
        if (!newAllocations[palletIndex]) {
          newAllocations[palletIndex] = {};
        }
        const numericBoxes = Number(boxes);
        newAllocations[palletIndex][productId] = Number.isFinite(numericBoxes)
          ? Math.max(0, Math.floor(numericBoxes))
          : 0;
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
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
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
                  <button
                    onClick={() => handleExecuteCluster(cluster)}
                    className="btn btn-default"
                    disabled={
                      clusterExecutionState[cluster.id]?.status === 'loading' ||
                      !isUuid(cluster.id)
                    }
                    title={
                      isUuid(cluster.id)
                        ? ''
                        : '请先保存计划以生成集群记录后再执行'
                    }
                  >
                    {clusterExecutionState[cluster.id]?.status === 'loading'
                      ? '执行中...'
                      : '执行'}
                  </button>
                  <button
                    onClick={() => handleRemoveCluster(cluster.id)}
                    className="btn btn-destructive"
                  >
                    删除
                  </button>
                </div>
                <div className="flex flex-col items-end text-sm text-gray-500">
                  <span>总箱数: {getTotalBoxesForCluster(cluster.id)}</span>
                  <span>总数量: {getTotalItemsForCluster(cluster.id)}</span>
                </div>
                {clusterExecutionState[cluster.id]?.status === 'success' && (
                  <div className="text-xs text-green-600 text-right">
                    完成
                    {clusterExecutionState[cluster.id]?.completedAt &&
                      ` · ${new Date(
                        clusterExecutionState[cluster.id].completedAt
                      ).toLocaleString()}`}
                    {clusterExecutionState[cluster.id]?.pdfUrl && (
                      <a
                        href={clusterExecutionState[cluster.id].pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`${planName || 'plan'}-${cluster.clusterName}.pdf`}
                        className="ml-2 underline text-blue-600"
                      >
                        下载PDF
                      </a>
                    )}
                  </div>
                )}
                {clusterExecutionState[cluster.id]?.status === 'error' && (
                  <div className="text-xs text-red-600 text-right">
                    {clusterExecutionState[cluster.id].error}
                  </div>
                )}
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
