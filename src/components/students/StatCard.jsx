import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressBar } from "../../pages/Grades/NotasPage";

  export const StatCard = ({ title, value, subtitle, icon: Icon, color, trend,funcion=()=>{},progress=false,percent=-1}) => {
    const colorClasses = {
        blue: { bg: 'bg-white dark:bg-gray-800',bordBg:'bg-blue-500 ', iconBg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600', value: 'text-gray-900 dark:text-gray-100' },
        green: { bg: 'bg-white dark:bg-gray-800', bordBg:'bg-green-500',iconBg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600', value: 'text-green-600' },
        orange: { bg: 'bg-white dark:bg-gray-800', bordBg:'bg-orange-500',iconBg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600', value: 'text-orange-600' },
        red: { bg: 'bg-white dark:bg-gray-800', bordBg:'bg-red-500',iconBg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600', value: 'text-red-600' },
        purple: { bg: 'bg-white dark:bg-gray-800', bordBg:'bg-purple-300',iconBg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600', value: 'text-purple-600' },
    };

    const colors= colorClasses[color] || colorClasses.blue;
    const [borda,setBorda] =useState(false)
    return (
        <motion.div 
        onClick={()=>{funcion();setBorda(!borda);}}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05, boxShadow: '0 8px 15px rgba(0, 0, 0, 0.1)',transition: { duration: 0.3 } }}
        className={`${colors.bg}  rounded-xl cursor-pointer  shadow-md transition-shadow flex `}>
            <div className={`w-2 ${borda?colors.bordBg:colors.bg} transition-colors rounded-l-md h-full`}>

            </div>
        <motion.div 

        className={`${colors.bg}  p-5 w-full`}>
       
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-50">{title}</p>
                <p className={`text-2xl font-bold ${colors.value} mt-1`}>{value}</p>
                <div className="text-xs text-gray-500 dark:text-gray-50 mt-1">
                    {subtitle}
                </div>
            </div>
            <div className={`${colors.iconBg} p-3 rounded-xl`}>
                <Icon className={`${colors.text} text-lg`} />
            </div>
            
        </div>
        {progress?<>
                <div className="mt-2 w-full">
                    <ProgressBar value={percent} />
                </div>
            </>:<></>}
       </motion.div>
        </motion.div>
    );
};



