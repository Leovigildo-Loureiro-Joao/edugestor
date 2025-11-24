import { useEffect, useRef, useState } from "react";

  export const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => {

    const colorClasses = {
        blue: { bg: 'bg-white', iconBg: 'bg-blue-100', text: 'text-blue-600', value: 'text-gray-900' },
        green: { bg: 'bg-white', iconBg: 'bg-green-100', text: 'text-green-600', value: 'text-green-600' },
        red: { bg: 'bg-white', iconBg: 'bg-red-100', text: 'text-red-600', value: 'text-red-600' },
        purple: { bg: 'bg-white', iconBg: 'bg-purple-100', text: 'text-purple-600', value: 'text-purple-600' }
    };

    const colors = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`${colors.bg} rounded-xl  p-5 shadow-md transition-shadow`}>
        <div className="flex items-center justify-between">
            <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${colors.value} mt-1`}>{value}</p>
            <div className="text-xs text-gray-500 mt-1">
                {subtitle}
            </div>
            </div>
            <div className={`${colors.iconBg} p-3 rounded-xl`}>
            <Icon className={`${colors.text} text-lg`} />
            </div>
        </div>
        </div>
    );
};



