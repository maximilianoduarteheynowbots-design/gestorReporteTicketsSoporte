
import React, { useState, useEffect, useMemo } from 'react';
import { type WorkItem } from '../types';
import { getWorkItemDetails } from '../services/azureDevopsService';

interface ActiveTicketListProps {
    workItems: WorkItem[];
    onShowDetails: (item: WorkItem) => void;
    pat: string;
    orgName: string;
    projectName: string;
}

type SortOption = 'id' | 'priority' | 'updated' | 'title';

// Orden específico solicitado para las columnas
const COLUMN_ORDER = [
    'Evaluación',
    'Documentación',
    'Implementación',
    'Testing',
    'Pendiente de liberacion',
    'Aprobación de Cliente',
    'Validación de cierre',
    'Resuelto'
];

const getPriorityLabel = (priority: number | undefined) => {
    if (priority === 1) return { label: 'Crítica', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300' };
    if (priority === 2) return { label: 'Alta', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300' };
    return { label: 'Normal', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300' };
};

const getDaysDifference = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const generateWebUrl = (orgName: string, projectName: string, id: number) => {
    return `https://dev.azure.com/${orgName}/${projectName}/_workitems/edit/${id}`;
};

// Función auxiliar para colorear columnas del tablero
const getBoardColumnColor = (column: string | undefined) => {
    if (!column) return 'bg-gray-100 text-gray-800';
    const lowerCol = column.toLowerCase();
    if (lowerCol.includes('done') || lowerCol.includes('resuelto') || lowerCol.includes('closed')) return 'bg-green-200 text-green-900';
    if (lowerCol.includes('progress') || lowerCol.includes('doing') || lowerCol.includes('active')) return 'bg-blue-100 text-blue-800';
    if (lowerCol.includes('test') || lowerCol.includes('qa')) return 'bg-purple-100 text-purple-800';
    if (lowerCol.includes('new') || lowerCol.includes('todo') || lowerCol.includes('proposed')) return 'bg-gray-200 text-gray-800';
    if (lowerCol.includes('blocked') || lowerCol.includes('bloqueado')) return 'bg-red-100 text-red-800';
    return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
};

// Componente interno para cargar bugs relacionados
const RelatedBugs: React.FC<{ links: string[]; pat: string; orgName: string; projectName: string }> = ({ links, pat, orgName, projectName }) => {
    const [bugs, setBugs] = useState<WorkItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBugs = async () => {
            if (links.length === 0) return;
            setLoading(true);
            try {
                const ids = links.map(url => parseInt(url.split('/').pop()!, 10));
                const details = await getWorkItemDetails(pat, `https://dev.azure.com/${orgName}`, ids);
                setBugs(details.filter(d => d.fields['System.WorkItemType'] === 'Bug'));
            } catch (e) {
                console.error("Error fetching related bugs", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBugs();
    }, [links, pat, orgName]);

    if (links.length === 0 || (!loading && bugs.length === 0)) return null;

    return (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-xs font-bold text-red-500 mb-2 uppercase tracking-wide flex items-center gap-2">
                {loading && <span className="animate-spin h-3 w-3 border-2 border-red-500 rounded-full border-t-transparent"></span>}
                Bugs Relacionados
            </p>
            <div className="space-y-2">
                {bugs.map(bug => (
                    <div key={bug.id} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <a 
                            href={generateWebUrl(orgName, projectName, bug.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium truncate max-w-[70%] text-red-800 dark:text-red-200 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            #{bug.id} - {bug.fields['System.Title']}
                        </a>
                        <span className="px-1.5 py-0.5 bg-white dark:bg-dark-card rounded shadow-sm text-gray-600 dark:text-gray-300 text-[10px]">{bug.fields['System.State']}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; colorClass?: string }> = ({ label, checked, onChange, colorClass = "bg-brand-primary" }) => (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 h-10">
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                />
                <div className={`block w-9 h-5 rounded-full transition-colors ${checked ? colorClass : 'bg-gray-400'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <span className="ml-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {label}
            </span>
        </label>
    </div>
);

export const ActiveTicketList: React.FC<ActiveTicketListProps> = ({ workItems, onShowDetails, pat, orgName, projectName }) => {
    // Filtros
    const [filterText, setFilterText] = useState('');
    const [clientFilter, setClientFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [columnFilter, setColumnFilter] = useState('all'); // Nuevo filtro de columna
    const [sortOption, setSortOption] = useState<SortOption>('updated');
    
    // Toggles de Estado
    const [showResolved, setShowResolved] = useState(false); 
    const [showNew, setShowNew] = useState(true);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Listas para Dropdowns
    const clients = useMemo(() => [...new Set(workItems.map(i => i.fields['Custom.Cliente']).filter(Boolean))].sort(), [workItems]);
    const assignees = useMemo(() => {
        const list = workItems.map(i => i.fields['System.AssignedTo']?.displayName || 'Sin Asignar');
        return [...new Set(list)].sort();
    }, [workItems]);
    
    const boardColumns = useMemo(() => {
        const list = workItems.map(i => i.fields['System.BoardColumn'] || 'Sin Columna');
        const uniqueList = [...new Set(list)];

        // Ordenar según COLUMN_ORDER
        return uniqueList.sort((a, b) => {
            const strA = String(a);
            const strB = String(b);
            const indexA = COLUMN_ORDER.findIndex(col => col.toLowerCase() === strA.toLowerCase());
            const indexB = COLUMN_ORDER.findIndex(col => col.toLowerCase() === strB.toLowerCase());

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1; // A está en la lista, va antes
            if (indexB !== -1) return 1;  // B está en la lista, va antes
            
            return strA.localeCompare(strB); // Alfabético para el resto
        });
    }, [workItems]);

    const filteredAndSorted = useMemo(() => {
        let items = workItems.filter(item => {
            const matchesText = item.fields['System.Title'].toLowerCase().includes(filterText.toLowerCase()) || item.id.toString().includes(filterText);
            const matchesClient = clientFilter === 'all' || item.fields['Custom.Cliente'] === clientFilter;
            
            const itemAssignee = item.fields['System.AssignedTo']?.displayName || 'Sin Asignar';
            const matchesAssignee = assigneeFilter === 'all' || itemAssignee === assigneeFilter;
            
            const itemColumn = item.fields['System.BoardColumn'] || 'Sin Columna';
            const matchesColumn = columnFilter === 'all' || itemColumn === columnFilter;
            
            // Lógica de Estados y Columnas
            const state = item.fields['System.State'];
            const boardColumn = (item.fields['System.BoardColumn'] || '').trim();
            
            // Normalización
            const normalizedColumn = boardColumn.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const isResolved = 
                state === 'Resolved' || 
                state === 'Done' || 
                state === 'Closed' || 
                normalizedColumn === 'resuelto';
            
            const isNew = 
                state === 'New' || 
                state === 'Proposed' || 
                state === 'To Do' || 
                normalizedColumn === 'evaluacion';

            const isActive = !isResolved && !isNew;

            let visible = false;
            if (isActive) visible = true;
            if (isResolved && showResolved) visible = true;
            if (isNew && showNew) visible = true;

            return matchesText && matchesClient && matchesAssignee && matchesColumn && visible;
        });

        return items.sort((a, b) => {
            switch (sortOption) {
                case 'id':
                    return b.id - a.id; 
                case 'title':
                    return a.fields['System.Title'].localeCompare(b.fields['System.Title']);
                case 'priority':
                    const pA = a.fields['Microsoft.VSTS.Common.Priority'] || 99;
                    const pB = b.fields['Microsoft.VSTS.Common.Priority'] || 99;
                    return pA - pB;
                case 'updated':
                default:
                    return new Date(b.fields['System.ChangedDate']).getTime() - new Date(a.fields['System.ChangedDate']).getTime();
            }
        });
    }, [workItems, filterText, clientFilter, assigneeFilter, columnFilter, sortOption, showResolved, showNew]);

    // Resetear pagina cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, clientFilter, assigneeFilter, columnFilter, showResolved, showNew]);

    // Lógica de paginación
    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSorted.slice(start, start + itemsPerPage);
    }, [filteredAndSorted, currentPage, itemsPerPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 100, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Barra de Herramientas */}
            <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-sm sticky top-0 z-20 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
                    <div className="flex-1 w-full xl:w-auto min-w-[200px]">
                        <input 
                            type="text" 
                            placeholder="Buscar por título o ID..." 
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                        />
                    </div>
                    
                    {/* Controles de Filtro y Orden */}
                    <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto justify-end">
                        <ToggleSwitch 
                            label="Nuevos" 
                            checked={showNew} 
                            onChange={setShowNew}
                            colorClass="bg-blue-400" 
                        />
                        
                        <ToggleSwitch 
                            label="Resueltos" 
                            checked={showResolved} 
                            onChange={setShowResolved}
                            colorClass="bg-green-500" 
                        />

                         <select 
                            className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary outline-none text-sm max-w-[150px]"
                            value={columnFilter}
                            onChange={e => setColumnFilter(e.target.value)}
                        >
                            <option value="all">Todas Columnas</option>
                            {boardColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select 
                            className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary outline-none text-sm max-w-[150px]"
                            value={assigneeFilter}
                            onChange={e => setAssigneeFilter(e.target.value)}
                        >
                            <option value="all">Todas Personas</option>
                            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>

                        <select 
                            className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary outline-none text-sm max-w-[150px]"
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value)}
                        >
                            <option value="all">Todos Clientes</option>
                            {clients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        <select 
                            className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                            value={sortOption}
                            onChange={e => setSortOption(e.target.value as SortOption)}
                        >
                            <option value="updated">Actualizado</option>
                            <option value="priority">Prioridad</option>
                            <option value="id">ID</option>
                            <option value="title">Título</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de Tickets */}
            <div className="grid grid-cols-1 gap-4">
                {paginatedItems.map(item => {
                    const daysOpen = getDaysDifference(item.fields['System.CreatedDate']);
                    const isOld = daysOpen > 15;
                    const priority = getPriorityLabel(item.fields['Microsoft.VSTS.Common.Priority']);
                    const missingClient = !item.fields['Custom.Cliente'];
                    
                    const estimated = item.fields['Custom.HorasEstimadas'] || 0;
                    const invested = item.investedHours || 0; 
                    const percent = estimated > 0 ? Math.min((invested / estimated) * 100, 100) : 0;
                    const isOverBudget = estimated > 0 && invested > estimated;

                    const relatedLinks = item.relations
                        ?.filter(r => r.rel === 'System.LinkTypes.Related')
                        .map(r => r.url) || [];
                        
                    const ticketUrl = generateWebUrl(orgName, projectName, item.id);
                    const boardColumn = item.fields['System.BoardColumn'];
                    const state = item.fields['System.State'];

                    return (
                        <div 
                            key={item.id} 
                            className="group relative bg-light-card dark:bg-dark-card p-5 rounded-xl shadow-sm hover:shadow-lg transition-all border-l-4 flex flex-col gap-3"
                            style={{ borderLeftColor: isOld ? '#EF4444' : '#3B82F6' }}
                            onClick={() => onShowDetails(item)}
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${priority.color}`}>
                                            {priority.label}
                                        </span>
                                        
                                        {/* AQUÍ: Estado movido a la izquierda (Tag) */}
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                                            {state}
                                        </span>

                                        {item.fields['Custom.TipoTarea'] && (
                                             <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                {item.fields['Custom.TipoTarea']}
                                            </span>
                                        )}
                                         <span 
                                            className="text-xs text-gray-400 ml-auto md:ml-0 cursor-help" 
                                            title={`Antigüedad: ${daysOpen} días\nCreado: ${new Date(item.fields['System.CreatedDate']).toLocaleDateString()}`}
                                        >
                                            {new Date(item.fields['System.ChangedDate']).toLocaleDateString()} (Act)
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-start gap-2">
                                        <a 
                                            href={ticketUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-lg font-bold text-gray-800 dark:text-gray-100 hover:text-brand-primary hover:underline transition-colors mb-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            #{item.id} {item.fields['System.Title']}
                                        </a>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mt-2">
                                        <span className="flex items-center gap-1 font-medium text-brand-secondary">
                                            👤 {item.fields['System.AssignedTo']?.displayName || 'Sin Asignar'}
                                        </span>

                                         {missingClient ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                                                ⚠️ Sin Cliente
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 font-medium">
                                                🏢 <span className="text-gray-900 dark:text-gray-200">{item.fields['Custom.Cliente']}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-start md:items-end justify-between min-w-[180px] gap-3">
                                     {/* AQUÍ: Columna movida a la derecha (Pill principal) */}
                                     <span className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider shadow-sm ${getBoardColumnColor(boardColumn)}`}>
                                        {boardColumn || state}
                                    </span>

                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                                        <div className="flex justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                                            <span>Invertido</span>
                                            <span>Estimado</span>
                                        </div>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className={`text-sm font-bold ${isOverBudget ? 'text-red-500' : 'text-brand-primary'}`}>
                                                {invested.toLocaleString()}h
                                            </span>
                                            <span className="text-xs font-medium text-gray-400">
                                                / {estimated}h
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-brand-primary'}`} 
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end">
                                <button 
                                    className="text-xs text-brand-primary hover:underline font-medium"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowDetails(item);
                                    }}
                                >
                                    Ver Detalles y Comentarios &rarr;
                                </button>
                            </div>

                            <RelatedBugs links={relatedLinks} pat={pat} orgName={orgName} projectName={projectName} />
                        </div>
                    );
                })}
                {filteredAndSorted.length === 0 && (
                    <div className="text-center py-12 text-gray-400 bg-light-card dark:bg-dark-card rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        No hay tickets visibles con los filtros actuales.
                    </div>
                )}
            </div>

            {/* Controles de Paginación */}
            {filteredAndSorted.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 flex-wrap justify-center">
                        <span className="font-semibold">Total: {filteredAndSorted.length}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span>Mostrar</span>
                        <select 
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-brand-primary outline-none"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={9999}>Todos</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                         <button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold"
                            title="Primera Página"
                        >
                            &lt;&lt;
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            &lt; Ant
                        </button>
                        
                        <span className="text-sm text-gray-500 dark:text-gray-400 mx-2 min-w-[80px] text-center">
                            Pág {currentPage} de {totalPages}
                        </span>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Sig &gt;
                        </button>
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold"
                            title="Última Página"
                        >
                            &gt;&gt;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
