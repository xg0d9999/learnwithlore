import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  ChevronRight, 
  HardDrive,
  Clock,
  Star,
  Trash2,
  Share2,
  RefreshCw,
  LogOut,
  AlertCircle,
  Upload,
  Copy,
  Edit2,
  Eye,
  CheckSquare,
  Square,
  X,
  ExternalLink
} from 'lucide-react';
import { 
  loadGapiScript, 
  loadGisScript, 
  initializeGapiClient, 
  initializeTokenClient, 
  listDriveFiles, 
  searchDriveFiles,
  uploadFile,
  deleteFile,
  renameFile,
  duplicateFile
} from '../../services/googleDriveService';

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
}

const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [path, setPath] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'Mi Unidad' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [currentFilter, setCurrentFilter] = useState<{ id: string, name: string, query?: string, orderBy?: string }>({ id: 'root', name: 'Mi Unidad' });
  const [previewingFile, setPreviewingFile] = useState<FileItem | null>(null);

  // Clear selection on path/filter/search change
  useEffect(() => setSelectedFiles(new Set()), [path, currentFilter, searchQuery]);

  const fetchFiles = useCallback(async (folderId: string, customQuery?: string, orderBy?: string) => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await listDriveFiles(folderId, customQuery, orderBy);
      setFiles(driveFiles || []);
    } catch (err: any) {
      setError(err?.result?.error?.message || 'Error al cargar archivos');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const results = await searchDriveFiles(query, currentFilter.id);
      setFiles(results || []);
    } catch (err) {
      setError('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  }, [currentFilter.id]);

  // Debounced Search Effect (Hot Reload)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery);
      else if (isAuthorized && searchQuery === '') fetchFiles(currentFolder, currentFilter.query, currentFilter.orderBy);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch, fetchFiles, currentFolder, isAuthorized, currentFilter]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadGapiScript();
        await loadGisScript();
        await initializeGapiClient();
        
        // Check if we have a token in local storage
        const storedToken = localStorage.getItem('gdrive_token');
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
      localStorage.setItem('gdrive_token', resp.access_token);
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
    localStorage.removeItem('gdrive_token');
    setIsAuthorized(false);
    setFiles([]);
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setCurrentFilter({ id: folderId, name: folderName });
    setPath([...path, { id: folderId, name: folderName }]);
    setSearchQuery('');
    fetchFiles(folderId);
  };

  const navigateBack = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    const folderId = newPath[newPath.length - 1].id;
    setCurrentFolder(folderId);
    setCurrentFilter({ id: folderId, name: newPath[newPath.length - 1].name });
    setSearchQuery('');
    fetchFiles(folderId);
  };

  const openPreview = (file: FileItem) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
    } else {
      setPreviewingFile(file);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedFiles);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFiles(next);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length && files.length > 0) setSelectedFiles(new Set());
    else setSelectedFiles(new Set(files.map(f => f.id)));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    try {
      setUploadProgress(0);
      await uploadFile(file, currentFilter.id === 'root' ? currentFolder : 'root', (prog) => setUploadProgress(prog));
      fetchFiles(currentFilter.id === 'root' ? currentFolder : 'root', currentFilter.query, currentFilter.orderBy);
    } catch (err: any) {
      setError(err.message || 'Error al subir archivo');
    } finally {
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;
    if (!window.confirm(`¿Enviar ${selectedFiles.size} archivo(s) a la papelera?`)) return;
    setLoading(true);
    try {
      await Promise.all(Array.from(selectedFiles).map(id => deleteFile(id)));
      setSelectedFiles(new Set());
      fetchFiles(currentFilter.id === 'root' ? currentFolder : 'root', currentFilter.query, currentFilter.orderBy);
    } catch (err) {
      setError('Error al eliminar');
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (selectedFiles.size === 0) return;
    setLoading(true);
    try {
      await Promise.all(Array.from(selectedFiles).map(id => {
        const file = files.find(f => f.id === id);
        return duplicateFile(id, file?.name || 'archivo');
      }));
      setSelectedFiles(new Set());
      fetchFiles(currentFilter.id === 'root' ? currentFolder : 'root', currentFilter.query, currentFilter.orderBy);
    } catch (err) {
      setError('Error al duplicar');
      setLoading(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFileId || !newFileName.trim()) return;
    setLoading(true);
    try {
      await renameFile(renamingFileId, newFileName.trim());
      setRenamingFileId(null);
      setNewFileName('');
      fetchFiles(currentFilter.id === 'root' ? currentFolder : 'root', currentFilter.query, currentFilter.orderBy);
    } catch (err) {
      setError('Error al renombrar');
      setLoading(false);
    }
  };

  const startRename = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFileId(file.id);
    setNewFileName(file.name);
  };

  const handleNavigationFilter = (filterId: string, filterName: string, query?: string, orderBy?: string) => {
    setCurrentFilter({ id: filterId, name: filterName, query, orderBy });
    setSearchQuery('');
    setPath([{ id: filterId, name: filterName }]);
    fetchFiles(filterId === 'root' ? currentFolder : 'root', query, orderBy);
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
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-semibold mr-2 transition-all">
              <span className="mr-2 hidden md:inline">{selectedFiles.size} seleccionados</span>
              <button onClick={handleDuplicate} title="Duplicar" className="p-1.5 hover:bg-primary/20 rounded-md transition-colors">
                <Copy className="w-4 h-4" />
              </button>
              {selectedFiles.size === 1 && (
                <button onClick={(e) => startRename(files.find(f => f.id === Array.from(selectedFiles)[0])!, e)} title="Renombrar" className="p-1.5 hover:bg-primary/20 rounded-md transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={handleDelete} title="Eliminar" className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-md transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button 
            onClick={() => fetchFiles(currentFilter.id === 'root' ? currentFolder : 'root', currentFilter.query, currentFilter.orderBy)}
            className={`p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Subir Archivo</span>
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploadProgress !== null} />
          </label>
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
          <button 
            onClick={() => handleNavigationFilter('root', 'Mi Unidad')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFilter.id === 'root' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <HardDrive className="w-4 h-4" />
            Mi Unidad
          </button>
          <button 
            onClick={() => handleNavigationFilter('shared', 'Compartido', "sharedWithMe = true")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFilter.id === 'shared' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Share2 className="w-4 h-4" />
            Compartido
          </button>
          <button 
            onClick={() => handleNavigationFilter('recent', 'Reciente', "trashed = false", "modifiedTime desc")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFilter.id === 'recent' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Clock className="w-4 h-4" />
            Reciente
          </button>
          <button 
            onClick={() => handleNavigationFilter('starred', 'Destacados', "starred = true and trashed = false")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFilter.id === 'starred' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Star className="w-4 h-4" />
            Destacados
          </button>
          <button 
            onClick={() => handleNavigationFilter('trash', 'Papelera', "trashed = true")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFilter.id === 'trash' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
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
            <div className="col-span-6 md:col-span-7 flex items-center gap-3">
              <button onClick={toggleSelectAll} className="p-0.5 text-slate-400 hover:text-primary transition-colors focus:outline-none">
                {files.length > 0 && selectedFiles.size === files.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              </button>
              Nombre
            </div>
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
              <>
                {uploadProgress !== null && (
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl items-center border-b border-slate-50/50 dark:border-slate-800/50 mb-2">
                    <div className="col-span-12 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center animate-pulse">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Subiendo archivo...</div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary w-10 text-right">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
                {files.map((file) => (
                  <div 
                    key={file.id}
                    onClick={() => openPreview(file)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl cursor-default group items-center transition-colors border-b border-slate-50/50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 select-none ${selectedFiles.has(file.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <div className="col-span-6 md:col-span-7 flex items-center gap-3">
                      <button onClick={(e) => toggleSelect(file.id, e)} className="p-0.5 text-slate-300 hover:text-primary transition-colors focus:outline-none">
                        {selectedFiles.has(file.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100" />}
                      </button>
                      <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shadow-sm border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-600 overflow-hidden relative">
                        {file.thumbnailLink && !file.mimeType.includes('folder') ? (
                          <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          getFileIcon(file)
                        )}
                      </div>
                      {renamingFileId === file.id ? (
                        <form onSubmit={handleRenameSubmit} className="flex-1 pr-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            autoFocus
                            type="text" 
                            value={newFileName} 
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-primary rounded focus:outline-none"
                            onBlur={handleRenameSubmit}
                          />
                        </form>
                      ) : (
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate pr-4">
                          {file.name}
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 md:col-span-2 text-[11px] font-medium text-slate-500">
                      {formatDate(file.modifiedTime)}
                    </div>
                    <div className="col-span-3 md:col-span-2 text-[11px] font-medium text-slate-500">
                      {formatSize(file.size)}
                    </div>
                    <div className="hidden md:flex md:col-span-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <button onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }} title="Vista Previa" className="p-1 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">
                        <Eye className="w-4 h-4 text-slate-400 hover:text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
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

      {/* Preview Modal */}
      {previewingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8 animate-in mt-[-1rem] -mx-4 fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                  {getFileIcon(previewingFile)}
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200 truncate pr-4">
                  {previewingFile.name}
                </span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md hidden md:inline">
                  {formatSize(previewingFile.size)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.open(previewingFile.webViewLink, '_blank')} 
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Abrir en Drive</span>
                </button>
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button 
                  onClick={() => setPreviewingFile(null)} 
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Cerrar vista previa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
              {previewingFile.id ? (
                <iframe 
                  src={`https://drive.google.com/file/d/${previewingFile.id}/preview`} 
                  className="w-full h-full border-0 absolute inset-0"
                  allow="autoplay"
                  title={`Vista Previa: ${previewingFile.name}`}
                ></iframe>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500 font-medium">
                  Este archivo no soporta previsualización incrustada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
