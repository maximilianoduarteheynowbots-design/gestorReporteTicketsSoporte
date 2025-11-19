
import { type WiqlResponse, type WorkItemBatchResponse, type WorkItem, type CommentsResponse, type Comment, type TimeEntry } from '../types';

const fetchAzureApi = async <T,>(url: string, pat: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Basic ${btoa(`:${pat}`)}`);
    if (options.method === 'POST' || options.method === 'PATCH') {
        headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (error) {
        throw new Error('Error de red o CORS. Verifica tu conexión.');
    }

    const responseText = await response.text();

    if (!response.ok) {
        let errorMessage = `Error de API: ${response.status}`;
        if (response.status === 401) {
            errorMessage = 'Token (PAT) inválido o expirado.';
        } else if (responseText) {
             try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorMessage;
             } catch (e) {
                 // Fallback
             }
        }
        throw new Error(errorMessage);
    }
    
    if (!responseText) return null as T;
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error('Respuesta inválida del servidor.');
    }
};

// Función auxiliar para obtener detalles (incluyendo relaciones)
export const getWorkItemDetails = async (pat: string, orgUrl: string, ids: number[]): Promise<WorkItem[]> => {
    if (ids.length === 0) return [];

    const BATCH_SIZE = 200;
    const uniqueIds = [...new Set(ids)];
    const idChunks: number[][] = [];

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
        idChunks.push(uniqueIds.slice(i, i + BATCH_SIZE));
    }

    const fetchPromises = idChunks.map(async (chunk) => {
        const idsString = chunk.join(',');
        // Pedimos campos y relaciones explícitamente
        const detailsUrl = `${orgUrl}/_apis/wit/workitems?ids=${idsString}&$expand=relations&api-version=7.1-preview.3`;

        try {
            const detailsResult = await fetchAzureApi<WorkItemBatchResponse>(detailsUrl, pat, {
                method: 'GET'
            });
            return detailsResult?.value || [];
        } catch (error) {
            console.warn(`Error obteniendo lote de tickets (ids: ${idsString}). Puede deberse a items eliminados o permisos (TF401232). Se omitirán estos items.`, error);
            return [];
        }
    });

    const resultsArrays = await Promise.all(fetchPromises);
    return resultsArrays.flat();
};

// Obtener Features (Clientes) para la gestión de contratos
export const getClientFeatures = async (pat: string, orgUrl: string, projectName: string): Promise<WorkItem[]> => {
    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    
    // Buscamos Features en el proyecto. 
    // Asumimos que estos Features representan los contratos/clientes.
    const query = {
        query: `
            SELECT [System.Id] 
            FROM WorkItems 
            WHERE [System.TeamProject] = @project 
            AND [System.WorkItemType] = 'Feature'
            AND [System.State] NOT IN ('Removed', 'Cut')
        `
    };

    try {
        const result = await fetchAzureApi<WiqlResponse>(wiqlUrl, pat, {
            method: 'POST',
            body: JSON.stringify(query)
        });

        const ids = result.workItems?.map(wi => wi.id) || [];
        if (ids.length === 0) return [];

        return await getWorkItemDetails(pat, orgUrl, ids);
    } catch (error) {
        console.warn("No se pudieron cargar los Features (Clientes).", error);
        return [];
    }
};

// Nueva implementación robusta basada en BFS (Breadth-First Search)
export const getInitialWorkItems = async (pat: string, orgUrl: string, projectName: string): Promise<WorkItem[]> => {
    const wiqlUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=7.1-preview.2`;
    
    // 1. Obtener IDs de TODOS los tickets activos del proyecto (eliminado filtro @Me)
    // SE AGREGO EL FILTRO [System.AreaPath] = 'Soporte' y SOLO PBIs
    // MODIFICACION: Se eliminó 'Closed' del filtro NOT IN para permitir cargar historial financiero
    const flatQuery = {
        query: `
            SELECT [System.Id] 
            FROM WorkItems 
            WHERE [System.TeamProject] = @project 
            AND [System.AreaPath] = 'Soporte'
            AND [System.WorkItemType] = 'Product Backlog Item'
            AND [System.State] NOT IN ('Removed', 'Cut')
        `
    };

    const flatResult = await fetchAzureApi<WiqlResponse>(wiqlUrl, pat, {
        method: 'POST',
        body: JSON.stringify(flatQuery)
    });

    const rootIds = flatResult.workItems?.map(wi => wi.id) || [];

    if (rootIds.length === 0) {
        return [];
    }

    // 2. Cargar detalles de los roots
    const rootItems = await getWorkItemDetails(pat, orgUrl, rootIds);
    
    // Mapa para acceso rápido y evitar duplicados
    const itemMap = new Map<number, WorkItem>();
    rootItems.forEach(item => itemMap.set(item.id, item));

    // Mapa de relaciones Parent -> Children IDs
    const parentChildMap = new Map<number, number[]>();

    // Cola de IDs para procesar (buscar sus hijos)
    let processingQueue: WorkItem[] = [...rootItems];
    
    // Set para saber qué IDs ya hemos pedido a la API para no repetir
    const fetchedIds = new Set<number>(rootIds);

    // 3. Bucle de expansión profunda (Fetch Descendants)
    while (processingQueue.length > 0) {
        const currentBatch = processingQueue;
        processingQueue = []; // Limpiar para la siguiente iteración
        
        const childIdsToFetch = new Set<number>();

        // Analizar relaciones de los items actuales
        for (const item of currentBatch) {
            if (item.relations) {
                for (const rel of item.relations) {
                    // LinkType Hierarchy-Forward es el estándar para Padre -> Hijo
                    if (rel.rel === 'System.LinkTypes.Hierarchy-Forward' && rel.url) {
                        // Extraer ID de la URL si no viene explícito
                        const urlParts = rel.url.split('/');
                        const childId = parseInt(urlParts[urlParts.length - 1], 10);
                        
                        if (childId) {
                            // Registrar relación
                            if (!parentChildMap.has(item.id)) {
                                parentChildMap.set(item.id, []);
                            }
                            parentChildMap.get(item.id)?.push(childId);

                            // Si no lo tenemos, agendar para fetch
                            if (!fetchedIds.has(childId)) {
                                childIdsToFetch.add(childId);
                                fetchedIds.add(childId);
                            }
                        }
                    }
                }
            }
        }

        // Si hay nuevos hijos que cargar
        if (childIdsToFetch.size > 0) {
            const newItems = await getWorkItemDetails(pat, orgUrl, Array.from(childIdsToFetch));
            newItems.forEach(item => {
                itemMap.set(item.id, item);
                processingQueue.push(item); // Añadir a la cola para buscar SUS hijos (nietos)
            });
        }
    }

    // 4. Función recursiva de cálculo y recolección de entradas de tiempo
    interface CalculationResult {
        totalHours: number;
        timeEntries: TimeEntry[];
    }

    const calculateHoursRecursively = (itemId: number): CalculationResult => {
        let total = 0;
        let entries: TimeEntry[] = [];
        
        const childrenIds = parentChildMap.get(itemId) || [];
        
        for (const childId of childrenIds) {
            const child = itemMap.get(childId);
            if (!child) continue;
            
            const type = child.fields['System.WorkItemType']?.toLowerCase() || '';
            // Normalizar para remover acentos (Línea -> Linea)
            const normalizedType = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            // Prioridad de campos de horas
            const hours = Number(child.fields['Custom.HorasLinea']) || 
                          Number(child.fields['Custom.Horas']) || 
                          Number(child.fields['Custom.HorasEjecutadas']) || 
                          Number(child.fields['Microsoft.VSTS.Scheduling.CompletedWork']) || 
                          0;

            // Si es tipo Linea (sin importar nivel), sumamos sus horas y guardamos la entrada
            if (normalizedType.includes('linea')) {
                total += hours;
                
                // Obtener fecha: Custom.Fechalinea o CreatedDate como fallback
                const entryDate = child.fields['Custom.Fechalinea'] || child.fields['System.CreatedDate'];
                if (entryDate && hours > 0) {
                    entries.push({
                        date: entryDate,
                        hours: hours
                    });
                }
            }
            
            // Recursión
            const childResult = calculateHoursRecursively(childId);
            total += childResult.totalHours;
            entries = [...entries, ...childResult.timeEntries];
        }
        return { totalHours: total, timeEntries: entries };
    };

    // 5. Construir resultado final inyectando horas y entradas a los roots
    const finalItems: WorkItem[] = [];
    
    rootIds.forEach(id => {
        const item = itemMap.get(id);
        if (item) {
            const calculation = calculateHoursRecursively(id);
            finalItems.push({
                ...item,
                investedHours: calculation.totalHours,
                timeEntries: calculation.timeEntries
            });
        }
    });

    // Ordenar por fecha
    return finalItems.sort((a, b) => 
        new Date(b.fields['System.ChangedDate']).getTime() - new Date(a.fields['System.ChangedDate']).getTime()
    );
};

export const getWorkItemComments = async (pat: string, orgUrl: string, projectName: string, workItemId: number): Promise<Comment[]> => {
    const commentsUrl = `${orgUrl}/${projectName}/_apis/wit/workitems/${workItemId}/comments?$expand=renderedText&api-version=7.1-preview.3`;
    const result = await fetchAzureApi<CommentsResponse>(commentsUrl, pat);
    return result?.comments || [];
};
