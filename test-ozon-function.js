// 测试Ozon Edge Function的脚本
// 请替换下面的clientId和apiKey为您的实际凭据

import { createClient } from '@supabase/supabase-js';

// 替换为您的Supabase项目URL和匿名密钥
const supabaseUrl = "https://vrpsrhjrkouwskiipvrt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycHNyaGpya291d3NraWlwdnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTg2OTksImV4cCI6MjA3NzI5NDY5OX0.e0TcMi4OtvWWuZ3A0kX0jDO13gCr2sal6w9jzqbrIsI";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 请替换下面的clientId和apiKey为您的实际凭据
const clientId = "2531878";
const apiKey = "e1ef9f60-bbc0-4190-9906-6a125503f553";

async function testOzonFunction() {
  try {
    // 使用Supabase客户端调用Edge Function
    const { data, error } = await supabase.functions.invoke('ozon-products', {
      body: {
        clientId,
        apiKey,
        limit: 5
      }
    });

    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// 运行测试
testOzonFunction();