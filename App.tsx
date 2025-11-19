
import React, { useState, useCallback, useEffect } from 'react';
import { PatInput } from './components/PatInput';
import { getInitialWorkItems, getWorkItemComments, getClientFeatures } from './services/azureDevopsService';
import { type WorkItem, type Comment } from './types';
import { WorkItemDetailModal } from './components/WorkItemDetailModal';
import { ReportsView } from './components/ReportsView';
import { ActiveTicketList } from './components/ActiveTicketList';
import { FinancialView } from './components/FinancialView';

const App: React.FC = () => {
    const [pat, setPat] = useState<string>('');
    const [orgName, setOrgName] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estado principal de datos
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [clientFeatures, setClientFeatures] = useState<WorkItem[]>([]); // Features que son Clientes
    const [hasFetched, setHasFetched] = useState(false);
    
    // Estado de UI
    const [activeTab, setActiveTab] = useState<'reports' | 'active' | 'financial'>('reports');
    const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const fetchInitialItems = useCallback(async (details: { pat: string, orgName: string, projectName: string, rememberMe: boolean }) => {
        const { pat: token, orgName: name, projectName: project, rememberMe } = details;
        
        if (rememberMe) {
            // Save minimal needed data, preserving structure but pat is main
            localStorage.setItem('azureDevOpsCreds', JSON.stringify({ pat: token, orgName: name, projectName: project }));
        } else {
            localStorage.removeItem('azureDevOpsCreds');
        }

        setIsLoading(true);
        setError(null);
        setPat(token);
        setOrgName(name);
        setProjectName(project);
        
        try {
            const orgUrl = `https://dev.azure.com/${name}`;
            
            // Ejecutar en paralelo para optimizar tiempo
            const [items, features] = await Promise.all([
                getInitialWorkItems(token, orgUrl, project),
                getClientFeatures(token, orgUrl, project)
            ]);

            setWorkItems(items);
            setClientFeatures(features);
            setHasFetched(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
            setPat(''); 
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const savedData = localStorage.getItem('azureDevOpsCreds');
        if (savedData) {
            try {
                const { pat } = JSON.parse(savedData);
                // Force Isbelsa/Soporte regardless of what might be in storage (for backward compat)
                const fixedOrg = 'isbelsa';
                const fixedProj = 'Soporte';
                
                if (pat) {
                    setTimeout(() => fetchInitialItems({ 
                        pat, 
                        orgName: fixedOrg, 
                        projectName: fixedProj, 
                        rememberMe: true 
                    }), 0);
                }
            } catch (e) {
                console.error("Error parsing saved creds", e);
            }
        }
    }, [fetchInitialItems]);

    const handleShowDetails = useCallback(async (item: WorkItem) => {
        setSelectedWorkItem(item);
        setIsModalLoading(true);
        setModalError(null);
        setComments([]);
        try {
            const orgUrl = `https://dev.azure.com/${orgName}`;
            const fetchedComments = await getWorkItemComments(pat, orgUrl, projectName, item.id);
            setComments(fetchedComments);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Error al cargar los comentarios.');
        } finally {
            setIsModalLoading(false);
        }
    }, [pat, orgName, projectName]);

    const handleCloseModal = () => {
        setSelectedWorkItem(null);
        setComments([]);
    };

    const handleReset = () => {
        setHasFetched(false);
        setWorkItems([]);
        setClientFeatures([]);
        setPat('');
        localStorage.removeItem('azureDevOpsCreds');
    };

    return (
        <div className="min-h-screen text-light-text dark:text-dark-text p-4 sm:p-6 md:p-8 bg-light-bg dark:bg-dark-bg transition-colors duration-300 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary tracking-tight">
                            <span className="text-brand-secondary">ISBELSA</span> SOPORTE
                        </h1>
                        {hasFetched && (
                            <p className="text-sm text-gray-500 mt-1 font-medium">Visor de Tickets y Reportes</p>
                        )}
                    </div>
                     {hasFetched && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => fetchInitialItems({ pat, orgName, projectName, rememberMe: true })}
                                className="bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all shadow-sm text-sm flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refrescar
                            </button>
                            <button
                                onClick={handleReset}
                                className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm border border-red-100 dark:border-red-800"
                            >
                                Salir
                            </button>
                        </div>
                    )}
                </header>

                {!hasFetched ? (
                    <PatInput onSubmit={fetchInitialItems} isLoading={isLoading} error={error} />
                ) : (
                    <>
                        {/* Tabs de Navegación */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto no-scrollbar">
                            <button
                                className={`py-3 px-6 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === 'reports'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('reports')}
                            >
                                📊 Reportes y Métricas
                            </button>
                             <button
                                className={`py-3 px-6 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === 'financial'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('financial')}
                            >
                                💰 Gestión de Contratos
                            </button>
                            <button
                                className={`py-3 px-6 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === 'active'
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('active')}
                            >
                                📋 Listado de Tickets
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="min-h-[600px]">
                            {activeTab === 'reports' ? (
                                <ReportsView workItems={workItems} />
                            ) : activeTab === 'financial' ? (
                                 <FinancialView 
                                    workItems={workItems} 
                                    clientFeatures={clientFeatures}
                                    orgName={orgName}
                                    projectName={projectName}
                                />
                            ) : (
                                <ActiveTicketList 
                                    workItems={workItems} 
                                    onShowDetails={handleShowDetails}
                                    pat={pat}
                                    orgName={orgName}
                                    projectName={projectName}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {selectedWorkItem && (
                <WorkItemDetailModal
                    item={selectedWorkItem}
                    comments={comments}
                    isLoading={isModalLoading}
                    error={modalError}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default App;