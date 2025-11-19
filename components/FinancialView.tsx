
import React, { useState, useMemo } from 'react';
import { type WorkItem } from '../types';

interface FinancialViewProps {
    workItems: WorkItem[]; // Los PBIs con sus entradas de tiempo
    clientFeatures: WorkItem[]; // Los Features que representan clientes (Presupuesto)
    orgName: string;
    projectName: string;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const FinancialView: React.FC<FinancialViewProps> = ({ workItems, clientFeatures, orgName, projectName }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyOverBudget, setShowOnlyOverBudget] = useState(false);

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: (currentYear + 1) - 2020 + 1}, (_, i) => 2020 + i);

    // Lógica principal: Agrupar horas por cliente en el periodo seleccionado
    const reportData = useMemo(() => {
        const clientStats: Record<string, { actualHours: number; ticketIds: Set<number> }> = {};

        // 1. Calcular Horas Reales (Actuals)
        workItems.forEach(item => {
            const clientName = item.fields['Custom.Cliente'] || 'Sin Cliente Asignado';
            
            if (item.timeEntries && item.timeEntries.length > 0) {
                item.timeEntries.forEach(entry => {
                    const date = new Date(entry.date);
                    if (date.getFullYear() === selectedYear && date.getMonth() === selectedMonth) {
                         if (!clientStats[clientName]) {
                             clientStats[clientName] = { actualHours: 0, ticketIds: new Set() };
                         }
                         clientStats[clientName].actualHours += entry.hours;
                         clientStats[clientName].ticketIds.add(item.id);
                    }
                });
            }
        });

        // 2. Cruzar con Features (Presupuesto)
        // Asumimos que el feature.Title hace match con Custom.Cliente
        const result = Object.entries(clientStats).map(([clientName, data]) => {
            // Buscar feature
            const feature = clientFeatures.find(f => f.fields['System.Title'].trim().toLowerCase() === clientName.trim().toLowerCase());
            
            // Intentar obtener presupuesto del Feature.
            // Prioridad: Custom.HorasMensuales -> Custom.HorasEstimadas -> 0
            let budget = 0;
            if (feature) {
                 budget = feature.fields['Custom.HorasMensuales'] || feature.fields['Custom.HorasEstimadas'] || 0;
            }

            return {
                clientName,
                actualHours: data.actualHours,
                budgetHours: budget,
                featureId: feature?.id,
                ticketCount: data.ticketIds.size
            };
        });

        // Agregar clientes que tienen Feature (Presupuesto) pero 0 horas consumidas este mes
        clientFeatures.forEach(feature => {
            const name = feature.fields['System.Title'];
            // Si no está ya en la lista de resultados
            if (!clientStats[name] && !clientStats[name.trim()] && !clientStats[name.toLowerCase()]) {
                const budget = feature.fields['Custom.HorasMensuales'] || feature.fields['Custom.HorasEstimadas'] || 0;
                // Solo mostrar si tienen presupuesto definido, para no ensuciar la lista
                if (budget > 0) {
                     result.push({
                        clientName: name,
                        actualHours: 0,
                        budgetHours: budget,
                        featureId: feature.id,
                        ticketCount: 0
                    });
                }
            }
        });

        // Ordenar: Primero los que se pasaron del presupuesto (Rojo), luego por consumo descendente
        return result.sort((a, b) => {
            const aOver = a.budgetHours > 0 && a.actualHours > a.budgetHours ? 1 : 0;
            const bOver = b.budgetHours > 0 && b.actualHours > b.budgetHours ? 1 : 0;
            if (aOver !== bOver) return bOver - aOver; // Primero los overbudget
            return b.actualHours - a.actualHours;
        });

    }, [workItems, clientFeatures, selectedYear, selectedMonth]);

    const filteredReport = reportData.filter(r => {
        const matchesSearch = r.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const isOverBudget = r.budgetHours > 0 && r.actualHours > r.budgetHours;

        if (showOnlyOverBudget && !isOverBudget) return false;
        
        return matchesSearch;
    });

    const totalActual = filteredReport.reduce((acc, curr) => acc + curr.actualHours, 0);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            
            {/* Header y Controles */}
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Gestión de Contratos y Horas
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Análisis de consumo mensual vs presupuesto asignado por cliente.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg items-center">
                    
                    {/* Switch Solo Excedidos */}
                    <label className="flex items-center gap-2 cursor-pointer px-2 border-r border-gray-200 dark:border-gray-600 mr-2 pr-4">
                        <div className="relative inline-flex items-center">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={showOnlyOverBudget}
                                onChange={(e) => setShowOnlyOverBudget(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                        </div>
                        <span className={`text-xs sm:text-sm font-medium ${showOnlyOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            Solo Excedidos
                        </span>
                    </label>

                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                    >
                        {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Resumen Mensual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h4 className="text-blue-800 dark:text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">Total Horas Consumidas</h4>
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-300">{totalActual.toLocaleString()} h</div>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400 mt-2">En {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                </div>
                
                <div className="md:col-span-2 bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <input 
                        type="text" 
                        placeholder="🔍 Filtrar cliente..." 
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid de Clientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredReport.map(client => {
                    const percent = client.budgetHours > 0 ? (client.actualHours / client.budgetHours) * 100 : 0;
                    const isOver = client.budgetHours > 0 && client.actualHours > client.budgetHours;
                    const isWarning = !isOver && percent > 80;
                    
                    let barColor = 'bg-brand-primary';
                    if (isOver) barColor = 'bg-red-500';
                    else if (isWarning) barColor = 'bg-orange-400';
                    else if (client.budgetHours === 0) barColor = 'bg-gray-400';

                    return (
                        <div key={client.clientName} className={`relative bg-light-card dark:bg-dark-card rounded-xl shadow-md overflow-hidden border-t-4 transition-transform hover:-translate-y-1 ${isOver ? 'border-red-500' : 'border-brand-secondary'}`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate" title={client.clientName}>
                                        {client.clientName}
                                    </h3>
                                    {client.featureId && (
                                        <a 
                                            href={`https://dev.azure.com/${orgName}/${projectName}/_workitems/edit/${client.featureId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
                                            title="Ver Contrato (Feature)"
                                        >
                                            Ver Contrato ↗
                                        </a>
                                    )}
                                </div>

                                <div className="flex items-end justify-between mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Consumido</span>
                                        <span className={`text-2xl font-bold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-brand-primary'}`}>
                                            {client.actualHours} h
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Asignado</span>
                                        <span className="text-xl font-medium text-gray-700 dark:text-gray-300">
                                            {client.budgetHours > 0 ? `${client.budgetHours} h` : '∞'}
                                        </span>
                                    </div>
                                </div>

                                {/* Barra de Progreso */}
                                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                                    <div 
                                        className={`h-full rounded-full ${barColor} transition-all duration-1000`} 
                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {client.ticketCount} tickets activos este mes
                                    </span>
                                    {isOver && (
                                        <span className="font-bold text-red-600 flex items-center gap-1 animate-pulse">
                                            ⚠️ Excedido por {(client.actualHours - client.budgetHours).toFixed(1)}h
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {filteredReport.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        {showOnlyOverBudget 
                            ? "¡Excelente! No hay clientes que hayan excedido su presupuesto este mes."
                            : "No se encontraron registros para este periodo o criterio de búsqueda."}
                    </div>
                )}
            </div>
        </div>
    );
};
