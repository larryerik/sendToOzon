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
  sku: string;
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
    const skus = products.map(p => p.sku);
    
    // 仅按 sku 查询，避免因集群名称不一致导致漏数
    const { data: historyDataList, error: historyError } = await supabase
      .from('products')
      .select('sku, cluster, stocks, daily_sales, updated_at, created_at')
      .in('sku', skus);

    if (historyError) {
      console.error('数据库查询错误:', historyError);
      // 如果查询失败，使用默认值继续计算
    }

    // 创建按 sku 分组的历史数据映射，内部按 cluster 归并并保留最新记录
    const historyBySku = new Map<string, ProductHistory[]>();
    if (historyDataList) {
      // 先按 sku 聚合
      const tempMap = new Map<string, ProductHistory[]>();
      historyDataList.forEach(item => {
        const list = tempMap.get(item.sku) || [];
        list.push(item as ProductHistory);
        tempMap.set(item.sku, list);
      });
      // 对每个 sku：按 cluster 归并，保留最新的 updated_at/created_at
      for (const [sku, list] of tempMap.entries()) {
        const clusterKeyMap = new Map<string, ProductHistory>();
        const toKey = (s?: string) => (s || '').toString().trim().toLowerCase();
        for (const rec of list) {
          const key = toKey(rec.cluster);
          const prev = clusterKeyMap.get(key);
          if (!prev) {
            clusterKeyMap.set(key, rec);
          } else {
            const prevTime = new Date(prev.updated_at || prev.created_at || 0).getTime();
            const curTime = new Date((rec as any).updated_at || (rec as any).created_at || 0).getTime();
            if (curTime >= prevTime) clusterKeyMap.set(key, rec);
          }
        }
        historyBySku.set(sku, Array.from(clusterKeyMap.values()));
      }
    }

    const normalize = (s?: string) => (s || '').toString().trim().toLowerCase();

    // 计算结果数组
    const results: CalculationResult[] = [];
    
    // 对于每个产品，根据历史数据和用户指定的总箱数来分配到各个集群
    for (const product of products) {
      // 计算该产品的总需求量
      const totalRequiredItems = product.boxCount * product.itemsPerBox;
      
      // 获取该产品在各集群的历史数据
      const clusterHistoryData: ClusterHistoryData[] = [];
      for (const cluster of clusters) {
        const candidates = historyBySku.get(product.sku) || [];
        const targetName = normalize(cluster.name);
        let historyData = candidates.find(h => targetName === normalize(h.cluster));
        // 回退1：若没匹配到且仅有一条候选，直接使用该条
        if (!historyData && candidates.length === 1) {
          historyData = candidates[0];
        }
        // 回退2：若仍未匹配，优先选择 cluster 为空/空白 的最新记录
        if (!historyData) {
          const emptyCluster = candidates.find(h => normalize(h.cluster) === '');
          if (emptyCluster) historyData = emptyCluster;
        }
        clusterHistoryData.push({
          cluster,
          historyData,
          stock: historyData?.stocks || 0,
          dailySales: historyData?.daily_sales || 1
        });
      }
      
      // 新算法：先算需求，再按需求占比分配用户的总箱数（不超过各自需求上限）
      const needPerCluster = clusterHistoryData.map((item) => {
        const demandItems = (item.dailySales || 0) * item.cluster.safeDays;
        const needItems = Math.max(0, demandItems - (item.stock || 0));
        const needBoxes = Math.ceil(needItems / product.itemsPerBox);
        return {
          cluster: item.cluster,
          stock: item.stock || 0,
          dailySales: item.dailySales || 0,
          demandItems,
          needItems,
          needBoxes,
        };
      });

      const totalNeedBoxes = needPerCluster.reduce((sum, n) => sum + n.needBoxes, 0);
      const targetTotalBoxes = product.boxCount; // 严格等于用户输入箱数

      // 若无需求，全部给0
      if (targetTotalBoxes === 0) {
        for (const n of needPerCluster) {
          results.push({
            cluster_id: n.cluster.id,
            cluster_name: n.cluster.nameCn || n.cluster.name,
            product_id: product.id,
            sku: product.sku,
            recommended_boxes: 0,
            reason: `推荐0箱（需求0），当前库存${n.stock}，日销量${n.dailySales}，建议维持${n.cluster.safeDays}天安全库存`,
          });
        }
        continue;
      }

      // 按需求占比初始分配（向下取整），记录小数余数，随后用最大余数法补齐到 targetTotalBoxes
      const allocations = needPerCluster.map((n) => {
        const ratio = totalNeedBoxes > 0 ? (n.needBoxes / totalNeedBoxes) : 0;
        const ideal = totalNeedBoxes > 0 ? (targetTotalBoxes * ratio) : 0;
        const base = Math.floor(ideal);
        const remainder = ideal - base;
        return { n, base, remainder, allocated: base };
      });

      let allocatedSum = allocations.reduce((sum, a) => sum + a.allocated, 0);
      let remain = targetTotalBoxes - allocatedSum;
      if (remain > 0) {
        const byRemainder = [...allocations].sort((a, b) => b.remainder - a.remainder);
        let i = 0;
        while (remain > 0 && i < byRemainder.length * 5) {
          for (const a of byRemainder) {
            if (remain <= 0) break;
            a.allocated += 1;
            remain -= 1;
          }
          i += 1;
        }
      }

      for (const a of allocations) {
        results.push({
          cluster_id: a.n.cluster.id,
          cluster_name: a.n.cluster.nameCn || a.n.cluster.name,
          product_id: product.id,
          sku: product.sku,
          recommended_boxes: a.allocated,
          reason: `推荐${a.allocated}箱（需求${a.n.needBoxes}箱），当前库存${a.n.stock}，日销量${a.n.dailySales}，建议维持${a.n.cluster.safeDays}天安全库存`,
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