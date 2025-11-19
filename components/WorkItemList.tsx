

import React from 'react';
import { type WorkItem, type TaskSummary } from '../types';

interface WorkItemListProps {
    items: WorkItem[];
    onShowDetails: (item: WorkItem) => void;
    onNavigateToChildren: (item: WorkItem) => void;
    taskSummaries: Map<number, TaskSummary>;
    rootItems?: WorkItem[];
}

const getWorkItemTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
        case 'product backlog item':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'task':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'bug':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case 'feature':
             return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case 'linea':
             return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getWorkItemStateColor = (state: string) => {
    switch (state.toLowerCase()) {
        case 'new':
        case 'proposed':
            return 'bg-gray-200 text-gray-800';
        case 'active':
        case 'in progress':
             return 'bg-blue-200 text-blue-800';
        case 'resolved':
        case 'done':
            return 'bg-green-200 text-green-800';
        case 'closed':
            return 'bg-purple-200 text-purple-800';
        default:
            return 'bg-gray-200 text-gray-800';
    }
}

export const WorkItemList: React.FC<WorkItemListProps> = ({ items, onShowDetails, onNavigateToChildren, taskSummaries, rootItems }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
                const hasChildren = item.relations?.some(rel => rel.rel === 'System.LinkTypes.Hierarchy-Forward') || false;
                const isTask = item.fields['System.WorkItemType'] === 'Task';
                const summary = taskSummaries.get(item.id);
                
                const parentId = item.fields['System.Parent'];
                const parent = parentId && rootItems ? rootItems.find(p => p.id === parentId) : undefined;

                const cardBaseClasses = "bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4 flex flex-col justify-between transition-all duration-200";
                const cardInteractiveClasses = hasChildren ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : "";

                const handleCardClick = () => {
                    if (hasChildren) {
                        onNavigateToChildren(item);
                    }
                };

                const handleDetailClick = (e: React.MouseEvent) => {
                    e.stopPropagation(); // Previene que el click en el botón active el click de la tarjeta
                    onShowDetails(item);
                };

                const handleCardKeyPress = (e: React.KeyboardEvent) => {
                    if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
                        onNavigateToChildren(item);
                    }
                };

                return (
                    <div
                        key={item.id}
                        onClick={handleCardClick}
                        className={`${cardBaseClasses} ${cardInteractiveClasses}`}
                        role={hasChildren ? "button" : "article"}
                        tabIndex={hasChildren ? 0 : -1}
                        onKeyPress={handleCardKeyPress}
                        aria-label={hasChildren ? `Navegar a los hijos de ${item.fields['System.Title']}` : item.fields['System.Title']}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full ${getWorkItemTypeColor(item.fields['System.WorkItemType'])}`}>
                                    {item.fields['System.WorkItemType']}
                                </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${getWorkItemStateColor(item.fields['System.State'])}`}>
                                    {item.fields['System.State']}
                                </span>
                            </div>
                            <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{`#${item.id} - ${item.fields['System.Title']}`}</p>
                            
                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                {parent && (
                                    <p>
                                        <span className="font-semibold">Proyecto:</span> {parent.fields['System.Title']}
                                    </p>
                                )}
                                {item.fields['System.AssignedTo'] && (
                                    <p>
                                        <span className="font-semibold">Asignado a:</span> {item.fields['System.AssignedTo'].displayName}
                                    </p>
                                )}
                                {isTask && (
                                    <>
                                        <p>
                                            <span className="font-semibold">Horas Estimadas:</span> {summary !== undefined ? `${summary.estimated}h` : 'Calculando...'}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Horas Invertidas:</span> {summary !== undefined ? `${summary.invested.toLocaleString()}h` : 'Calculando...'}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end items-center">
                            <button
                                onClick={handleDetailClick}
                                className="flex items-center text-sm text-brand-primary font-semibold p-2 -m-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors"
                                aria-label={`Ver detalles de ${item.fields['System.Title']}`}
                            >
                                Ver detalles
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};