// Ozon API 客户端工具
import { supabase } from '../supabaseClient';

/**
 * 获取Ozon产品列表
 * @param {Object} params - 请求参数
 * @param {string} params.clientId - Ozon Client ID
 * @param {string} params.apiKey - Ozon API密钥
 * @param {string} params.last_id - 上一次请求的ID，用于分页
 * @param {number} params.limit - 每页数量，默认10
 * @returns {Promise<Object>} 产品列表响应
 */
export async function getOzonProducts({ clientId, apiKey, last_id = '', limit = 10 } = {}) {
  try {
    // 检查必需的参数
    if (!clientId || !apiKey) {
      throw new Error('缺少Ozon Client ID或API密钥');
    }

    // 通过Supabase Edge Function调用Ozon API
    const { data, error } = await supabase.functions.invoke('ozon-products', {
      body: {
        clientId,
        apiKey,
        last_id,
        limit
      }
    });

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching Ozon products:', error);
    throw error;
  }
}