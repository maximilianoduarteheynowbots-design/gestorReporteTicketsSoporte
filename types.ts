
export interface WorkItemReference {
    id: number;
    url: string;
}

export interface WiqlResponse {
    workItems: WorkItemReference[];
}

export interface TimeEntry {
    date: string;
    hours: number;
}

export interface WorkItem {
    id: number;
    fields: {
        [key: string]: any;
        'System.Title': string;
        'System.State': string;
        'System.WorkItemType': string;
        'System.BoardColumn'?: string; // Campo para Columna del Tablero (Kanban)
        'System.AssignedTo'?: {
            displayName: string;
            uniqueName: string;
            imageUrl?: string;
        };
        'System.CreatedDate': string;
        'System.ChangedDate': string;
        'System.Description'?: string;
        
        // Campos Específicos
        'Microsoft.VSTS.Common.Priority'?: number;
        'Microsoft.VSTS.Common.Severity'?: string;
        'Microsoft.VSTS.Scheduling.TargetDate'?: string;
        'Microsoft.VSTS.Scheduling.CompletedWork'?: number; // Campo estándar de horas
        
        // Campos Custom provistos
        'Custom.Cliente'?: string;
        'Custom.Partner'?: string;
        'Custom.TipoTarea'?: string;
        'Custom.Modulo'?: string;
        'Custom.Criticidad'?: string;
        'Custom.NroJira'?: string;
        
        // Gestión de Horas
        'Custom.HorasEstimadas'?: number;
        'Custom.HorasEjecutadas'?: number; // Usualmente en el padre
        'Custom.Horas'?: number; 
        'Custom.HorasLinea'?: number; // CAMPO CRÍTICO DEL USUARIO
        'Custom.Fechalinea'?: string;
        
        // Flags booleanos
        'Custom.WhatsApp'?: boolean;
        'Custom.Telegram'?: boolean;
    };
    relations?: WorkItemRelation[];
    url: string;
    
    // Propiedades calculadas en el frontend
    investedHours?: number; // Suma de hijos tipo 'Linea'
    timeEntries?: TimeEntry[]; // Desglose de horas por fecha (proveniente de hijos 'Linea')
}

export interface WorkItemBatchResponse {
    count: number;
    value: WorkItem[];
}

export interface WorkItemRelation {
    rel: string;
    url: string;
    attributes: {
        isLocked?: boolean;
        name?: string;
    };
}

export interface NavigationLevel {
    id: number; 
    title: string;
}

export interface Filters {
    type: string;
    state: string;
    client: string;
    assignee: string;
}

export interface Comment {
    id: number;
    text: string;
    renderedText?: string;
    createdBy: {
        displayName: string;
        imageUrl?: string;
    };
    createdDate: string;
}

export interface CommentsResponse {
    count: number;
    comments: Comment[];
}

export interface TaskSummary {
    estimated: number;
    invested: number;
}

export interface ChildTaskFilters {
    client: string;
    createdDateStart: string;
    createdDateEnd: string;
    targetDateStart: string;
    targetDateEnd: string;
}