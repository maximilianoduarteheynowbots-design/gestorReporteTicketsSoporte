import React from 'react';
import { type WorkItem } from '../types';

interface DashboardFilterProps {
    rootWorkItems: WorkItem[];
    selectedIds: number[];
    onSelectionChange: (ids: number[]) => void;
    dateRange: { startDate: string; endDate: string };
    onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
    onDateReset: () => void;
}

export const DashboardFilter: React.FC<DashboardFilterProps> = ({ 
    rootWorkItems, 
    selectedIds, 
    onSelectionChange,
    dateRange,
    onDateChange,
    onDateReset
}) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // FIX: The type for `option` was not being inferred correctly, resulting in an 'unknown' type.
        // Explicitly casting it to HTMLOptionElement resolves the issue.
        const selectedOptions = Array.from(e.target.selectedOptions).map((option: HTMLOptionElement) => parseInt(option.value, 10));
        onSelectionChange(selectedOptions);
    };

    return (
        <div className="p-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm space-y-4">
            <div>
                <label htmlFor="pbi-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar Dashboard por PBI (Ctrl+Click para selección múltiple, deseleccionar todo para ver el global)
                </label>
                <select
                    id="pbi-filter"
                    multiple
                    value={selectedIds.map(String)} // value needs to be an array of strings
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary h-24"
                >
                    {rootWorkItems.map(item => (
                        <option key={item.id} value={item.id}>
                            {`#${item.id} - ${item.fields['System.Title']}`}
                        </option>
                    ))}
                </select>
            </div>
             <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar Horas por Rango de Fechas (deja en blanco para ver el total)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                         <label htmlFor="start-date" className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                         <input
                            id="start-date"
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => onDateChange('startDate', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="sm:col-span-1">
                         <label htmlFor="end-date" className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                         <input
                            id="end-date"
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => onDateChange('endDate', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="sm:col-span-1">
                         <button
                            onClick={onDateReset}
                            className="w-full text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            Limpiar Fechas
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};