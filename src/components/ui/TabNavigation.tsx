import React from 'react';
import { useNavigate } from 'react-router-dom';

const TabNavigation = ({ tabs, activeTab, onTabChange, path }: { tabs: any[], activeTab: string, onTabChange: (tabId: string) => void, path: string }) => {
  const navigate = useNavigate();

  const renderIcon = (icon: any) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const Icon = icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className=" w-full">
    <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-xl shadow-md p-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            onTabChange(tab.id);
            navigate(path + tab.id);
          }}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {renderIcon(tab.icon)}
          <span className="hidden sm:inline font-medium">{tab.label}</span>
          {tab.count && tab.count !== undefined && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              activeTab === tab.id
                ? 'bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-500'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
</div>
    );
};

export default TabNavigation;
