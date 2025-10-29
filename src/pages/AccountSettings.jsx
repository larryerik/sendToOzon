import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function AccountSettings() {
  const [accountInfo, setAccountInfo] = useState({
    client_id: '',
    api_key: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // 获取当前用户信息

  // 获取账户信息
  useEffect(() => {
    if (user) {
      fetchAccountInfo();
    }
  }, [user]);

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_settings')
        .select('client_id, api_key')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
        throw error;
      }

      if (data) {
        setAccountInfo({
          client_id: data.client_id || '',
          api_key: data.api_key || '',
        });
      } else {
        // 如果没有记录，初始化为空值
        setAccountInfo({
          client_id: '',
          api_key: '',
        });
      }
    } catch (error) {
      console.error('获取账户信息失败:', error);
      alert('获取账户信息失败，请确保您已正确登录');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAccountInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('请先登录再执行此操作');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('account_settings')
        .upsert({
          user_id: user.id,
          client_id: accountInfo.client_id,
          api_key: accountInfo.api_key,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setIsEditing(false);
    } catch (error) {
      console.error('保存账户信息失败:', error);
      alert(`保存账户信息失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // 重新获取数据以恢复原始值
    fetchAccountInfo();
  };

  // 如果用户未登录，显示提示信息
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <p className="text-muted-foreground">您需要登录后才能查看和管理账户设置</p>
        </div>
      </div>
    );
  }

  // 加载状态显示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">账号设置</h1>
        <p className="text-muted-foreground">用于连接 Ozon API 的凭据，请妥善保管。</p>
      </div>

      <div className="card">
        <div className="card-content">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              {/* Client ID */}
              <div className="space-y-2">
                <label className="label">Client ID</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="client_id"
                    value={accountInfo.client_id}
                    onChange={handleChange}
                    className="input"
                  />
                ) : (
                  <div className="input font-mono">{accountInfo.client_id || '未设置'}</div>
                )}
                <p className="text-sm text-muted-foreground">你的 Ozon 账户 Client ID。</p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="label">API Key</label>
                {isEditing ? (
                  <input
                    type="password"
                    name="api_key"
                    value={accountInfo.api_key}
                    onChange={handleChange}
                    className="input"
                  />
                ) : (
                  <div className="input font-mono">
                    {accountInfo.api_key ? '•'.repeat(Math.max(8, accountInfo.api_key.length)) : '未设置'}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">API Key 具备高权限，仅在受信环境使用并避免泄露。</p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              {isEditing ? (
                <>
                  <button 
                    type="button" 
                    onClick={handleCancel} 
                    className="btn btn-outline"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-default"
                    disabled={saving}
                  >
                    {saving ? '保存中…' : '保存'}
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setIsEditing(true)} 
                  className="btn btn-default"
                >
                  编辑
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AccountSettings;