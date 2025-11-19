import React, { useState, useEffect } from 'react';

interface PatInputProps {
    onSubmit: (details: { pat: string, orgName: string, projectName: string, rememberMe: boolean }) => void;
    isLoading: boolean;
    error: string | null;
}

// Constantes fijas para Isbelsa
const FIXED_ORG = 'isbelsa';
const FIXED_PROJ = 'Soporte';

export const PatInput: React.FC<PatInputProps> = ({ onSubmit, isLoading, error }) => {
    const [pat, setPat] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPat, setShowPat] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const savedData = localStorage.getItem('azureDevOpsCreds');
        if (savedData) {
            try {
                const { pat } = JSON.parse(savedData);
                setPat(pat || '');
                setRememberMe(true);
            } catch (e) {
                localStorage.removeItem('azureDevOpsCreds');
            }
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pat.trim()) {
            onSubmit({ 
                pat: pat.trim(), 
                orgName: FIXED_ORG,
                projectName: FIXED_PROJ, 
                rememberMe 
            });
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Header Visual */}
                <div className="bg-gradient-to-r from-brand-primary to-brand-secondary p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-wide">ISBELSA SOPORTE</h2>
                        <p className="text-blue-100 text-sm mt-1">Portal de Gestión y Reportes</p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="pat-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Personal Access Token (PAT)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    id="pat-input"
                                    type={showPat ? "text" : "password"}
                                    value={pat}
                                    onChange={(e) => setPat(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    placeholder="Pegue su token de seguridad aquí"
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPat(!showPat)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                                >
                                    {showPat ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary"
                                    disabled={isLoading}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400">
                                    Recordar mi token
                                </label>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowHelp(!showHelp)}
                                className="text-sm text-brand-primary hover:text-brand-secondary font-semibold"
                            >
                                ¿Cómo obtenerlo?
                            </button>
                        </div>

                        {showHelp && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-xs text-gray-600 dark:text-gray-300 space-y-2 animate-fade-in border border-blue-100 dark:border-blue-800">
                                <p>1. Ingresa a Azure DevOps.</p>
                                <p>2. Ve a <strong>User Settings</strong> (icono usuario) &gt; <strong>Personal Access Tokens</strong>.</p>
                                <p>3. Crea uno nuevo con acceso <strong>Full Access</strong> o permisos de lectura de <strong>Work Items</strong>.</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            disabled={isLoading || !pat.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Conectando...
                                </>
                            ) : (
                                'Acceder al Sistema'
                            )}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 p-4 border-t border-red-100 dark:border-red-800">
                        <div className="flex items-center text-red-700 dark:text-red-300 text-sm">
                            <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    </div>
                )}
            </div>
             <p className="text-center text-gray-400 text-xs mt-8">
                &copy; {new Date().getFullYear()} Isbelsa Soporte. Todos los derechos reservados.
            </p>
        </div>
    );
};