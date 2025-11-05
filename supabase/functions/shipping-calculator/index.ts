// 发货计划计算器Edge Function
// 根据产品数据、集群信息和历史数据计算每个SKU、每个集群应该发多少箱货

// 从Supabase导入createClient
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

type ProductData = {
  id: string;
  sku: string;
  ozonId: string;
  boxCount: number;    // 用户指定的总箱数
  itemsPerBox: number; // 每箱物品数量
};

type ClusterData = {
  id: number;
  name: string;
  nameCn: string;
  safeDays: number;
};

type ProductHistory = {
  id: string;
  ozon_id: string;
  cluster: string;
  stocks: number;
  daily_sales: number;
  created_at: string;
  updated_at: string;
};

type ClusterHistoryData = {
  cluster: ClusterData;
  historyData?: ProductHistory;
  stock: number;
  dailySales: number;
};

type ClusterAllocation = {
  cluster: ClusterData;
  boxes: number;
};

type CalculationResult = {
  cluster_id: number;
  cluster_name: string;
  product_id: string;
  sku: string;
  recommended_boxes: number;
  reason: string;
};

type RequestData = {
  products: ProductData[];
  clusters: ClusterData[];
  user_id: string;
};

// 从环境变量获取Supabase配置
const supabaseUrl = 'https://vrpsrhjrkouwskiipvrt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycHNyaGpya291d3NraWlwdnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTg2OTksImV4cCI6MjA3NzI5NDY5OX0.e0TcMi4OtvWWuZ3A0kX0jDO13gCr2sal6w9jzqbrIsI';

Deno.serve(async (req: Request) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
      },
    });
  }
  
  try {
    // 从请求体获取参数
    const { products, clusters, user_id }: RequestData = await req.json();
    
    if (!products || !clusters || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: products, clusters, or user_id" }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    // 创建Supabase客户端实例
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 批量获取所有相关的历史数据
    const ozonIds = products.map(p => p.ozonId);
    const clusterNames = clusters.map(c => c.name);
    
    const { data: historyDataList, error: historyError } = await supabase
      .from('products')
      .select('ozon_id, cluster, stocks, daily_sales')
      .in('ozon_id', ozonIds)
      .in('cluster', clusterNames);

    if (historyError) {
      console.error('数据库查询错误:', historyError);
      // 如果查询失败，使用默认值继续计算
    }

    // 创建历史数据映射以便快速查找
    const historyMap = new Map<string, ProductHistory>();
    if (historyDataList) {
      historyDataList.forEach(item => {
        const key = `${item.ozon_id}-${item.cluster}`;
        historyMap.set(key, item);
      });
    }

    // 计算结果数组
    const results: CalculationResult[] = [];
    
    // 对于每个产品，根据历史数据和用户指定的总箱数来分配到各个集群
    for (const product of products) {
      // 计算该产品的总需求量
      const totalRequiredItems = product.boxCount * product.itemsPerBox;
      
      // 获取该产品在各集群的历史数据
      const clusterHistoryData: ClusterHistoryData[] = [];
      for (const cluster of clusters) {
        const key = `${product.ozonId}-${cluster.name}`;
        const historyData = historyMap.get(key);
        clusterHistoryData.push({
          cluster,
          historyData,
          stock: historyData?.stocks || 0,
          dailySales: historyData?.daily_sales || 1
        });
      }
      
      // 计算各集群的权重（基于日销量）
      const totalDailySales = clusterHistoryData.reduce((sum, item) => sum + item.dailySales, 0);
      
      // 存储各集群的分配箱数
      const clusterAllocations: ClusterAllocation[] = [];
      let totalAllocatedBoxes = 0;
      
      // 为每个集群计算分配箱数（确保为整数）
      for (let i = 0; i < clusterHistoryData.length; i++) {
        const item = clusterHistoryData[i];
        const { cluster, dailySales } = item;
        
        // 基于日销量占比分配箱数
        let allocatedBoxes = 0;
        if (totalDailySales > 0) {
          const ratio = dailySales / totalDailySales;
          // 使用四舍五入确保为整数
          allocatedBoxes = Math.round(product.boxCount * ratio);
        } else {
          // 如果总日销量为0，则平均分配
          allocatedBoxes = Math.round(product.boxCount / clusters.length);
        }
        
        clusterAllocations.push({cluster, boxes: allocatedBoxes});
        totalAllocatedBoxes += allocatedBoxes;
      }
      
      // 调整分配以确保总箱数等于用户指定的箱数
      const difference = product.boxCount - totalAllocatedBoxes;
      if (difference !== 0 && clusterAllocations.length > 0) {
        // 将差值分配给日销量最高的集群
        const maxSalesCluster = clusterAllocations.reduce((max, current) => {
          const currentDailySales = clusterHistoryData.find(chd => chd.cluster.id === current.cluster.id)?.dailySales || 0;
          const maxDailySales = clusterHistoryData.find(chd => chd.cluster.id === max.cluster.id)?.dailySales || 0;
          return currentDailySales > maxDailySales ? current : max;
        });
        maxSalesCluster.boxes += difference;
      }
      
      // 为每个集群计算推荐发货箱数（包括安全库存）
      for (const allocation of clusterAllocations) {
        const { cluster, boxes: allocatedBoxes } = allocation;
        
        // 获取该集群的历史数据
        const historyItem = clusterHistoryData.find(item => item.cluster.id === cluster.id);
        const stock = historyItem?.stock || 0;
        const dailySales = historyItem?.dailySales || 1;
        
        // 计算分配的物品数量
        const allocatedItems = allocatedBoxes * product.itemsPerBox;
        
        // 计算安全库存需求
        const safetyStock = dailySales * cluster.safeDays;
        const recommendedItems = Math.max(0, allocatedItems + safetyStock - stock);
        const recommendedBoxes = Math.ceil(recommendedItems / product.itemsPerBox);
        
        results.push({
          cluster_id: cluster.id,
          cluster_name: cluster.nameCn || cluster.name,
          product_id: product.id,
          sku: product.sku,
          recommended_boxes: recommendedBoxes,
          reason: `分配${allocatedBoxes}箱，当前库存${stock}，日销量${dailySales}，建议维持${cluster.safeDays}天安全库存`
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        message: "计算完成"
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          "Content-Length": JSON.stringify({ success: true, results, message: "计算完成" }).length.toString(),
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
});