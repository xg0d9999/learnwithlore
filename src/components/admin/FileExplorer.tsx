import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  FileText, 
  Image as ImageIcon, 
  MoreVertical, 
  Search, 
  ChevronRight, 
  Plus,
  HardDrive,
  Clock,
  Star,
  Trash2,
  Share2,
  RefreshCw,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { 
  loadGapiScript, 
  loadGisScript, 
  initializeGapiClient, 
  initializeTokenClient, 
  listDriveFiles, 
  searchDriveFiles 
} from '../../services/googleDriveService';

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [path, setPath] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'Mi Unidad' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await listDriveFiles(folderId);
      setFiles(driveFiles || []);
    } catch (err: any) {
      setError(err?.result?.error?.message || 'Error al cargar archivos');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      fetchFiles(currentFolder);
      return;
    }
    setLoading(true);
    try {
      const results = await searchDriveFiles(query);
      setFiles(results || []);
    } catch (err) {
      setError('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  }, [currentFolder, fetchFiles]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadGapiScript();
        await loadGisScript();
        await initializeGapiClient();
        
        // Check if we have a token in session storage
        const storedToken = sessionStorage.getItem('gdrive_token');
        if (storedToken) {
          window.gapi.client.setToken({ access_token: storedToken });
          setIsAuthorized(true);
          fetchFiles('root');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Error al inicializar la API de Google');
      }
    };
    init();
  }, [fetchFiles]);

  const handleAuth = () => {
    const tokenClient = initializeTokenClient((resp: any) => {
      if (resp.error) {
        setError('Error de autenticación');
        return;
      }
      sessionStorage.setItem('gdrive_token', resp.access_token);
      setIsAuthorized(true);
      fetchFiles('root');
    });

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  const handleLogout = () => {
    window.gapi.client.setToken(null);
    sessionStorage.removeItem('gdrive_token');
    setIsAuthorized(false);
    setFiles([]);
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setPath([...path, { id: folderId, name: folderName }]);
    fetchFiles(folderId);
  };

  const navigateBack = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    const folderId = newPath[newPath.length - 1].id;
    setCurrentFolder(folderId);
    fetchFiles(folderId);
  };

  const getFileIcon = (file: FileItem) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') return <Folder className="text-amber-500 fill-amber-500/20" />;
    if (file.mimeType.includes('pdf')) return <FileText className="text-red-500" />;
    if (file.mimeType.includes('image')) return <ImageIcon className="text-blue-500" />;
    return <File className="text-slate-400" />;
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '--';
    const b = parseInt(bytes);
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <HardDrive className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 text-center">Conectar Google Drive</h2>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8 leading-relaxed">
          Sincroniza tus materiales de clase, exámenes y documentos directamente desde tu cuenta de Google Drive.
        </p>
        <button 
          onClick={handleAuth}
          className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 group"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Vincular Cuenta
        </button>
        {error && (
          <div className="mt-6 flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
      {/* Search & Actions Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar en Google Drive..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchFiles(currentFolder)}
            className={`p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
            title="Cerrar sesión de Google"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 border-r border-slate-100 dark:border-slate-800 p-4 space-y-1 hidden md:block">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
            <HardDrive className="w-4 h-4" />
            Mi Unidad
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
            <Share2 className="w-4 h-4" />
            Compartido
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
            <Clock className="w-4 h-4" />
            Reciente
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
            <Star className="w-4 h-4" />
            Destacados
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" />
            Papelera
          </button>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-6 text-sm overflow-x-auto whitespace-nowrap pb-2">
            {path.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                <button 
                  onClick={() => navigateBack(i)}
                  className={`hover:text-primary transition-colors ${i === path.length - 1 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                  {p.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Titles */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
            <div className="col-span-6 md:col-span-7">Nombre</div>
            <div className="col-span-3 md:col-span-2">Modificado</div>
            <div className="col-span-3 md:col-span-2">Tamaño</div>
            <div className="hidden md:block md:col-span-1"></div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                <Folder className="w-16 h-16 opacity-10" />
                <p>No se encontraron archivos</p>
              </div>
            ) : (
              files.map((file) => (
                <div 
                  key={file.id}
                  onDoubleClick={() => file.mimeType === 'application/vnd.google-apps.folder' && navigateToFolder(file.id, file.name)}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-default group items-center transition-colors border-b border-slate-50/50 dark:border-slate-800/50 last:border-0"
                >
                  <div className="col-span-6 md:col-span-7 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shadow-sm border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-600">
                      {getFileIcon(file)}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate pr-4">
                      {file.name}
                    </span>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-[11px] font-medium text-slate-500">
                    {formatDate(file.modifiedTime)}
                  </div>
                  <div className="col-span-3 md:col-span-2 text-[11px] font-medium text-slate-500">
                    {formatSize(file.size)}
                  </div>
                  <div className="hidden md:flex md:col-span-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="absolute bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
