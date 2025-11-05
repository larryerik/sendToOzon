// Ozon产品列表组件
import React, { useState, useEffect } from 'react';
import { getOzonProducts } from '../utils/ozonApiClient';

const OzonProductList = ({ clientId, apiKey }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastId, setLastId] = useState('');

  useEffect(() => {
    if (clientId && apiKey) {
      loadProducts();
    }
  }, [clientId, apiKey]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getOzonProducts({ 
        clientId,
        apiKey,
        last_id: lastId, 
        limit: 10 
      });
      setProducts(prev => [...prev, ...response.result.items]);
      setLastId(response.result.last_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    loadProducts();
  };

  // 检查是否提供了API密钥和Client ID
  if (!clientId || !apiKey) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        请提供Ozon Client ID和API密钥
      </div>
    );
  }

  if (loading && products.length === 0) {
    return <div className="text-center py-4">加载中...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        错误: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Ozon产品列表</h2>
      
      {products.length === 0 ? (
        <div className="text-center py-4 text-gray-500">暂无产品</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.product_id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold">{product.offer_id}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p>产品ID: {product.product_id}</p>
                <p>FBO库存: {product.has_fbo_stocks ? '有' : '无'}</p>
                <p>FBS库存: {product.has_fbs_stocks ? '有' : '无'}</p>
                <p>已归档: {product.archived ? '是' : '否'}</p>
                <p>有折扣: {product.is_discounted ? '是' : '否'}</p>
                
                {product.quants && product.quants.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">包装规格:</p>
                    <ul className="list-disc pl-5">
                      {product.quants.map((quant, index) => (
                        <li key={index}>
                          {quant.quant_code} (数量: {quant.quant_size})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lastId && (
        <div className="text-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OzonProductList;