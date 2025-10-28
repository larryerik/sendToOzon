import { useState } from 'react';

function AccountSettings() {
  const [accountInfo, setAccountInfo] = useState({
    clientId: 'your-client-id',
    apiKey: 'your-api-key',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAccountInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: 调用保存 API
      console.log('保存账户信息:', accountInfo);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

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
                    name="clientId"
                    value={accountInfo.clientId}
                    onChange={handleChange}
                    className="input"
                  />
                ) : (
                  <div className="input font-mono">{accountInfo.clientId}</div>
                )}
                <p className="text-sm text-muted-foreground">你的 Ozon 账户 Client ID。</p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="label">API Key</label>
                {isEditing ? (
                  <input
                    type="password"
                    name="apiKey"
                    value={accountInfo.apiKey}
                    onChange={handleChange}
                    className="input"
                  />
                ) : (
                  <div className="input font-mono">
                    {'•'.repeat(Math.max(8, accountInfo.apiKey.length))}
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