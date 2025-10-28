import { useState } from 'react';

function ClusterSelector({ isOpen, onClose, selectedClusters, onSelectClusters }) {
  // 模拟集群数据
  const clusters = [
    { id: 1, name: 'Cluster-Moscow', nameCn: '莫斯科集群', safeDays: 7 },
    { id: 2, name: 'Cluster-SPB', nameCn: '圣彼得堡集群', safeDays: 5 },
    { id: 3, name: 'Cluster-Kazan', nameCn: '喀山集群', safeDays: 10 },
    { id: 4, name: 'Cluster-Ekb', nameCn: '叶卡捷琳堡集群', safeDays: 8 },
  ];

  const [tempSelected, setTempSelected] = useState(selectedClusters);

  const handleToggle = (cluster) => {
    const exists = tempSelected.find((c) => c.id === cluster.id);
    if (exists) {
      setTempSelected(tempSelected.filter((c) => c.id !== cluster.id));
    } else {
      setTempSelected([...tempSelected, cluster]);
    }
  };

  const handleConfirm = () => {
    onSelectClusters(tempSelected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">选择发送集群</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {clusters.map((cluster) => {
              const isSelected = tempSelected.find((c) => c.id === cluster.id);
              return (
                <label
                  key={cluster.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!isSelected}
                    onChange={() => handleToggle(cluster)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {cluster.nameCn}
                    </div>
                    <div className="text-xs text-gray-500">
                      {cluster.name} · 安全天数: {cluster.safeDays}天
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            已选择 {tempSelected.length} 个集群
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClusterSelector;

