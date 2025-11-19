
import React, { useMemo } from 'react';
import { type WorkItem } from '../types';
import { PieChart } from './PieChart';
import { AnimatedCounter } from './AnimatedCounter';

interface ReportsViewProps {
    workItems: WorkItem[];
}

// Utilidad para calcular días de antigüedad
const getDaysDifference = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

// Utilidad para limpiar el nombre de la persona
const getAssigneeName = (item: WorkItem) => item.fields['System.AssignedTo']?.displayName || 'Sin Asignar';

// Utilidad para determinar si es "Resuelto"
const isTicketResolved = (item: WorkItem) => {
    const state = item.fields['System.State'];
    const boardColumn = (item.fields['System.BoardColumn'] || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return state === 'Resolved' || state === 'Done' || state === 'Closed' || boardColumn === 'resuelto';
};

// Orden específico solicitado
const COLUMN_ORDER = [
    'Evaluación',
    'Documentación',
    'Implementación',
    'Testin',
    'Testing', // Agregado por si acaso viene corregido del sistema
    'Pendiente de liberacion',
    'Aprobación de Cliente',
    'Validación de cierre'
];

export const ReportsView: React.FC<ReportsViewProps> = ({ workItems }) => {
    
    const stats = useMemo(() => {
        // 1. Separar Activos vs Resueltos
        const activeTickets: WorkItem[] = [];
        const resolvedTickets: WorkItem[] = [];

        workItems.forEach(item => {
            if (isTicketResolved(item)) {
                resolvedTickets.push(item);
            } else {
                activeTickets.push(item);
            }
        });

        // 2. KPI Asignación (Sobre Activos)
        let assignedCount = 0;
        let unassignedCount = 0;
        
        // 3. Desglose por Persona (Activos)
        const personStats: Record<string, { total: number; columns: Record<string, number> }> = {};
        
        // 4. Datos para gráficos existentes
        const clientCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        const allColumns = new Set<string>(); 

        activeTickets.forEach(item => {
            // Asignación
            const assignee = getAssigneeName(item);
            if (assignee === 'Sin Asignar') unassignedCount++; else assignedCount++;

            // Stats por Persona (Usando System.BoardColumn)
            if (!personStats[assignee]) {
                personStats[assignee] = { total: 0, columns: {} };
            }
            personStats[assignee].total++;
            
            // Obtener Columna del Board
            const boardCol = (item.fields['System.BoardColumn'] || 'Sin Columna').trim();
            
            allColumns.add(boardCol);
            personStats[assignee].columns[boardCol] = (personStats[assignee].columns[boardCol] || 0) + 1;

            // Stats Cliente
            const client = item.fields['Custom.Cliente'] || 'Sin Cliente';
            clientCounts[client] = (clientCounts[client] || 0) + 1;

            // Stats Tipo
            const type = item.fields['Custom.TipoTarea'] || item.fields['System.WorkItemType'];
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // 5. Calcular Top Resueltos por Persona
        const resolvedByPerson: Record<string, number> = {};
        resolvedTickets.forEach(item => {
            const assignee = getAssigneeName(item);
            resolvedByPerson[assignee] = (resolvedByPerson[assignee] || 0) + 1;
        });
        
        const topResolved = Object.entries(resolvedByPerson)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);


        // --- ORDENAMIENTO Y TRANSFORMACIÓN ---

        // Ordenar columnas según lista predefinida
        const sortedColumns = Array.from(allColumns).sort((a, b) => {
            // Normalización simple para comparación (ignorar case, mantener acentos si coincide exacto)
            const indexA = COLUMN_ORDER.findIndex(col => col.toLowerCase() === a.toLowerCase());
            const indexB = COLUMN_ORDER.findIndex(col => col.toLowerCase() === b.toLowerCase());

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1; // A está en la lista, va antes
            if (indexB !== -1) return 1;  // B está en la lista, va antes
            
            return a.localeCompare(b); // Alfabético para el resto
        });

        // Ordenar Personas: Mayor cantidad de tickets primero, PERO "Sin Asignar" siempre al final
        const personList = Object.entries(personStats)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => {
                if (a.name === 'Sin Asignar') return 1;
                if (b.name === 'Sin Asignar') return -1;
                return b.total - a.total;
            });

        // Top 10 Antigüedad
        const topOldest = [...activeTickets]
            .sort((a, b) => new Date(a.fields['System.CreatedDate']).getTime() - new Date(b.fields['System.CreatedDate']).getTime())
            .slice(0, 10);

        // Top 10 "Abandonados"
        const topStale = [...activeTickets]
            .sort((a, b) => new Date(a.fields['System.ChangedDate']).getTime() - new Date(b.fields['System.ChangedDate']).getTime())
            .slice(0, 10);

        const clientData = Object.entries(clientCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);

        // Crear datos de tipo, asignar colores, Y LUEGO ORDENAR por valor descendente
        const typeDataRaw = Object.entries(typeCounts).map(([label, value], index) => ({
            label,
            value,
            color: `hsl(${index * 40 + 10}, 80%, 50%)` 
        }));
        
        // Ordenar para que la torta se vea de mayor a menor
        const typeData = typeDataRaw.sort((a, b) => b.value - a.value);

        return {
            totalActive: activeTickets.length,
            totalResolved: resolvedTickets.length,
            assignedCount,
            unassignedCount,
            personList,
            boardColumns: sortedColumns,
            clientData,
            typeData,
            topOldest,
            topStale,
            topResolved
        };
    }, [workItems]);


    return (
        <div className="space-y-10 animate-fade-in pb-10">
            
            {/* SECCIÓN 1: KPIs Generales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Activos */}
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md border-l-4 border-brand-primary">
                    <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider mb-2">Total Tickets Activos</h3>
                    <div className="text-5xl font-bold text-brand-primary">
                        <AnimatedCounter value={stats.totalActive} />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">En proceso y pendientes</p>
                </div>

                {/* Asignados vs No Asignados */}
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md border-l-4 border-purple-500 md:col-span-2 flex flex-col justify-center">
                    <h3 className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider mb-4">Eficiencia de Asignación (Activos)</h3>
                    <div className="flex items-center justify-between mb-2 text-sm font-bold">
                        <span className="text-green-600">Asignados: {stats.assignedCount}</span>
                        <span className="text-red-500">Sin Asignar: {stats.unassignedCount}</span>
                    </div>
                    <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative flex">
                        <div 
                            className="h-full bg-green-500 transition-all duration-1000" 
                            style={{ width: `${stats.totalActive > 0 ? (stats.assignedCount / stats.totalActive) * 100 : 0}%` }}
                            title="Asignados"
                        ></div>
                        <div 
                            className="h-full bg-red-500 transition-all duration-1000" 
                            style={{ width: `${stats.totalActive > 0 ? (stats.unassignedCount / stats.totalActive) * 100 : 0}%` }}
                            title="Sin Asignar"
                        ></div>
                    </div>
                    <div className="text-center mt-2 text-xs text-gray-500">
                        {stats.totalActive > 0 ? Math.round((stats.assignedCount / stats.totalActive) * 100) : 0}% de cobertura
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: Matriz Estados (Tabla Full Width) */}
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md overflow-x-auto">
                <h3 className="font-bold text-lg mb-6 border-b dark:border-gray-700 pb-2">Detalle por Columna del Tablero</h3>
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-4 py-3 rounded-tl-lg border-b dark:border-gray-600 sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">Persona</th>
                            {stats.boardColumns.map(col => (
                                <th key={col} scope="col" className="px-4 py-3 text-center whitespace-nowrap border-b dark:border-gray-600">{col}</th>
                            ))}
                            <th scope="col" className="px-4 py-3 text-right rounded-tr-lg border-b dark:border-gray-600 font-bold bg-gray-100 dark:bg-gray-800">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.personList.map((person, idx) => (
                            <tr key={person.name} className={`border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-dark-card' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[200px] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]" 
                                    style={{ backgroundColor: idx % 2 === 0 ? 'var(--color-light-card)' : 'var(--color-bg-alt)' }}>
                                    {person.name}
                                </td>
                                {stats.boardColumns.map(col => (
                                    <td key={col} className="px-4 py-3 text-center border-l border-gray-100 dark:border-gray-700/50">
                                        {person.columns[col] ? (
                                            <span className="inline-block w-8 h-6 leading-6 text-center rounded-md bg-brand-primary/10 text-brand-primary font-bold text-xs">
                                                {person.columns[col]}
                                            </span>
                                        ) : <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>}
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-right font-bold border-l border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 text-brand-secondary">
                                    {person.total}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* SECCIÓN 3: Cliente y Tipo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md h-[480px] flex flex-col">
                    <h3 className="font-bold text-lg mb-6 border-b dark:border-gray-700 pb-2 flex-shrink-0">Tickets por Cliente</h3>
                    <div className="overflow-y-auto flex-1 pr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {stats.clientData.map((d, idx) => (
                                <div key={d.label} className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-bold text-gray-400 flex-shrink-0">#{idx + 1}</span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words leading-tight" title={d.label}>{d.label}</span>
                                    </div>
                                    <span className="bg-brand-secondary/20 text-brand-secondary font-bold px-2 py-0.5 rounded text-xs ml-2 flex-shrink-0">
                                        {d.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md flex flex-col items-center h-[480px] overflow-y-auto">
                    <h3 className="font-bold text-lg mb-6 border-b dark:border-gray-700 pb-2 w-full text-left flex-shrink-0">Por Tipo de Tarea</h3>
                    <div className="flex-1 flex items-center justify-center w-full">
                        <PieChart data={stats.typeData} size={220} vertical={true} />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 4: Tops (Antigüedad y Abandono) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TOP ANTIGUOS */}
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md border-t-4 border-orange-500">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-2xl">🕰️</span> Top 10 Más Antiguos (Activos)
                    </h3>
                    <div className="space-y-3">
                        {stats.topOldest.map(item => {
                             const days = getDaysDifference(item.fields['System.CreatedDate']);
                             return (
                                <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                    <div className="overflow-hidden">
                                        <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200" title={item.fields['System.Title']}>
                                            #{item.id} {item.fields['System.Title']}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{getAssigneeName(item)}</p>
                                    </div>
                                    <span className="flex-shrink-0 bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                        {days} días
                                    </span>
                                </div>
                             );
                        })}
                    </div>
                </div>

                {/* TOP SIN ACTIVIDAD */}
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md border-t-4 border-red-500">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-2xl">🕸️</span> Top 10 Sin Actividad Reciente
                    </h3>
                    <div className="space-y-3">
                        {stats.topStale.map(item => {
                             const days = getDaysDifference(item.fields['System.ChangedDate']);
                             return (
                                <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                    <div className="overflow-hidden">
                                        <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200" title={item.fields['System.Title']}>
                                            #{item.id} {item.fields['System.Title']}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{getAssigneeName(item)}</p>
                                    </div>
                                    <span className="flex-shrink-0 bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                        {days} días quieto
                                    </span>
                                </div>
                             );
                        })}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 5: Top Resueltos */}
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-md border-t-4 border-green-500">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="text-2xl">✅</span> Top Productividad: Tickets Resueltos/Cerrados
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.topResolved.map((person, idx) => (
                        <div key={person.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                    idx === 1 ? 'bg-gray-200 text-gray-600' : 
                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-brand-primary/10 text-brand-primary'
                                }`}>
                                    {idx + 1}
                                </div>
                                <span className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{person.name}</span>
                            </div>
                            <span className="font-bold text-brand-secondary">{person.count}</span>
                        </div>
                    ))}
                    {stats.topResolved.length === 0 && (
                        <p className="text-gray-500 text-sm col-span-full text-center py-4">Aún no hay tickets resueltos registrados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
