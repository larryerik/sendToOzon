// 获取Ozon产品列表的Edge Function

interface Product {
  product_id: number;
  offer_id: string;
  has_fbo_stocks: boolean;
  has_fbs_stocks: boolean;
  archived: boolean;
  is_discounted: boolean;
  quants: Array<{
    quant_code: string;
    quant_size: number;
  }>;
}

interface ProductListResponse {
  result: {
    items: Product[];
    total: number;
    last_id: string;
  };
}

Deno.serve(async (_req) => {
  // 处理预检请求
  if (_req.method === 'OPTIONS') {
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
    const { clientId, apiKey, last_id = "", limit = 10 } = await _req.json();

    if (!clientId || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing Ozon API credentials" }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    // 构造请求到Ozon API
    const response = await fetch("https://api-seller.ozon.ru/v3/product/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Id": clientId,
        "Api-Key": apiKey,
      },
      body: JSON.stringify({
        filter: {
          visibility: "ALL"
        },
        last_id,
        limit
      })
    });

    if (!response.ok) {
      throw new Error(`Ozon API error: ${response.statusText}`);
    }

    const data: ProductListResponse = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: { 
          "Content-Type": "application/json",
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