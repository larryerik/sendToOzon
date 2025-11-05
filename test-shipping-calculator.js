// 测试发货计划计算器Edge Function的脚本

import { createClient } from '@supabase/supabase-js';

// 使用项目中的配置
const supabaseUrl = "https://vrpsrhjrkouwskiipvrt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycHNyaGpya291d3NraWlwdnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTg2OTksImV4cCI6MjA3NzI5NDY5OX0.e0TcMi4OtvWWuZ3A0kX0jDO13gCr2sal6w9jzqbrIsI";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testShippingCalculator() {
  try {
    console.log('测试发货计划计算器...');
    
    // 测试用例1: 基本功能测试
    console.log('\n=== 测试用例1: 基本功能测试 ===');
    const testData1 = {
      products: [
        {
          id: "1",
          sku: "W_XuanZhuanChaZuo-BaiSe-Free",
          ozonId: "1334999081",
          boxCount: 20,      // 用户指定总箱数为20箱
          itemsPerBox: 10    // 每箱10个物品
        }
      ],
      clusters: [
        {
          id: 2,
          name: "ufa",
          nameCn: "乌法",
          safeDays: 7
        }
      ],
      user_id: "test-user-id"
    };

    console.log('发送测试数据:', JSON.stringify(testData1, null, 2));
    
    const { data: data1, error: error1 } = await supabase.functions.invoke('shipping-calculator', {
      body: testData1
    });

    if (error1) {
      console.error("调用Edge Function失败:", error1);
    } else {
      console.log("计算结果:", JSON.stringify(data1, null, 2));
    }
    
    // 测试用例2: 多产品多集群测试
    console.log('\n=== 测试用例2: 多产品多集群测试 ===');
    const testData2 = {
      products: [
        {
          id: "1334999081",
          sku: "W_XuanZhuanChaZuo-BaiSe-Free",
          ozonId: "1334999081",
          boxCount: 20,      // 用户指定总箱数为20箱
          itemsPerBox: 10    // 每箱10个物品
        },
        {
          id: "1335846224",
          sku: "W_HaiMianLiShuiJia-YinSe-2",
          ozonId: "1335846224",
          boxCount: 15,      // 用户指定总箱数为15箱
          itemsPerBox: 8     // 每箱8个物品
        }
      ],
      clusters: [
        {
          id: 2,
          name: "ufa",
          nameCn: "乌法",
          safeDays: 7
        }
      ],
      user_id: "184214ad-9010-4aaa-b8e4-d0d2fdb96aff"
    };

    console.log('发送测试数据:', JSON.stringify(testData2, null, 2));
    
    const { data: data2, error: error2 } = await supabase.functions.invoke('shipping-calculator', {
      body: testData2
    });

    if (error2) {
      console.error("调用Edge Function失败:", error2);
    } else {
      console.log("计算结果:", JSON.stringify(data2, null, 2));
      
      // 验证分配箱数为整数
      if (data2.results) {
        console.log('\n验证分配箱数为整数:');
        data2.results.forEach(result => {
          console.log(`  ${result.sku} 在 ${result.cluster_name}: ${result.recommended_boxes}箱 (整数: ${Number.isInteger(result.recommended_boxes)})`);
        });
      }
    }
    
  } catch (error) {
    console.error("测试过程中出错:", error);
  }
}

// 运行测试
testShippingCalculator();