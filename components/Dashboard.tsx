

import React, { useMemo } from 'react';
import { type WorkItem } from '../types';
import { PieChart, type PieChartData } from './PieChart';
import { AnimatedCounter } from './AnimatedCounter';

interface DashboardProps {
    rootWorkItems: WorkItem[];
    globalHours: { estimated: number; invested: number } | null;
    isCalculatingHours: boolean;
    isDateFilterActive: boolean;
}

const stateColorMapping: { [key: string]: string } = {
    'New': '#9CA3AF',       
    'Proposed': '#A5B4FC',
    'Active': '#60A5FA',    
    'In Progress': '#3B82F6',
    'Resolved': '#4ADE80', 
    'Done': '#22C55E',      
    'Closed': '#A78BFA',    
    'Removed': '#F87171',
};
const defaultColor = '#E5E7EB';

const StatCardSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-5 w-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


const StatCard: React.FC<{ title: string; value?: number; suffix?: string; icon: React.ReactNode; isLoading?: boolean; }> = ({ title, value, suffix = '', icon, isLoading = false }) => (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md flex items-center space-x-4 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
        <div className="bg-brand-primary/10 text-brand-primary rounded-full p-3 animate-pulse-icon">
            {icon}
        </div>
        <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <div className="text-2xl font-bold">
                {isLoading ? <StatCardSpinner /> : (
                    <>
                        <AnimatedCounter value={value ?? 0} />{suffix}
                    </>
                )}
            </div>
        </div>
    </div>
);


const RecentItem: React.FC<{ item: WorkItem }> = ({ item }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors">
        <div>
            <p className="font-semibold truncate" title={item.fields['System.Title']}>{item.fields['System.Title']}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">#{item.id}</p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${stateColorMapping[item.fields['System.State']] || defaultColor}33`, color: stateColorMapping[item.fields['System.State']] || defaultColor }}>
            {item.fields['System.State']}
        </span>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ rootWorkItems, globalHours, isCalculatingHours, isDateFilterActive }) => {

    const { 
        totalRootItems, 
        stateDistribution, 
        recentItems 
    } = useMemo(() => {
        const stateCounts: { [key: string]: number } = {};

        for (const item of rootWorkItems) {
            const state = item.fields['System.State'];
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }

        const pieData: PieChartData[] = Object.entries(stateCounts)
            .map(([label, value]) => ({
                label,
                value,
                color: stateColorMapping[label] || defaultColor,
            }))
            .sort((a, b) => b.value - a.value);

        return {
            totalRootItems: rootWorkItems.length,
            stateDistribution: pieData,
            recentItems: rootWorkItems.slice(0, 5), // Already sorted by date from API
        };
    }, [rootWorkItems]);

    if (rootWorkItems.length === 0) {
        return (
             <div className="text-center py-10 px-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">¡Bienvenido!</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">No se encontraron 'Product Backlog Items' asignados a ti. Cuando los tengas, aparecerán aquí.</p>
            </div>
        );
    }
    
    const hoursTitleSuffix = isDateFilterActive ? '(Rango Seleccionado)' : '(Global)';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatCard 
                    title="PBI Asignados" 
                    value={totalRootItems} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                />
                 <StatCard 
                    title={`Horas Estimadas ${hoursTitleSuffix}`}
                    value={globalHours?.estimated}
                    suffix="h"
                    isLoading={isCalculatingHours}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard 
                    title={`Horas Invertidas ${hoursTitleSuffix}`}
                    value={globalHours?.invested}
                    suffix="h"
                    isLoading={isCalculatingHours}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                />
            </div>
            
            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart */}
                <div className="lg:col-span-2 bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg mb-4">Distribución por Estado (PBI)</h3>
                    {stateDistribution.length > 0 ? (
                        <PieChart data={stateDistribution} />
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay datos para mostrar el gráfico.</p>
                    )}
                </div>

                {/* Recent Items */}
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md flex flex-col">
                     <h3 className="font-bold text-lg mb-4">Actividad Reciente (PBI)</h3>
                     <div className="space-y-2 flex-grow">
                        {recentItems.map(item => <RecentItem key={item.id} item={item} />)}
                     </div>
                </div>
            </div>
        </div>
    );
};