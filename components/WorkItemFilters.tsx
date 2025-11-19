import React from 'react';
import { type Filters } from '../types';

interface WorkItemFiltersProps {
    filters: Filters;
    onFilterChange: (filterKey: keyof Filters, value: string) => void;
    availableTypes: string[];
    availableStates: string[];
    availableAssignees: string[];
}

export const WorkItemFilters: React.FC<WorkItemFiltersProps> = ({
    filters,
    onFilterChange,
    availableTypes,
    availableStates,
    availableAssignees,
}) => {
    const renderSelect = (
        id: keyof Filters,
        label: string,
        options: string[]
    ) => (
        <div className="flex-1 min-w-[150px]">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <select
                id={id}
                name={id}
                value={filters[id]}
                onChange={(e) => onFilterChange(id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-light-card dark:bg-dark-card focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
                <option value="all">Todos</option>
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="p-4 mb-4 bg-light-card/80 dark:bg-dark-card/80 rounded-lg shadow-sm flex flex-col sm:flex-row gap-4 items-center flex-wrap">
            {availableTypes.length > 0 && renderSelect('type', 'Filtrar por Tipo', availableTypes)}
            {availableStates.length > 0 && renderSelect('state', 'Filtrar por Estado', availableStates)}
            {availableAssignees.length > 0 && renderSelect('assignee', 'Filtrar por Asignado', availableAssignees)}
        </div>
    );
};