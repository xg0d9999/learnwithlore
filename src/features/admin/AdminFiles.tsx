import React from 'react';
import FileExplorer from '../../components/admin/FileExplorer';

const AdminFiles: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Explorador de Archivos</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Accede y gestiona los recursos académicos de Google Drive.
        </p>
      </div>

      <div className="h-[calc(100vh-250px)]">
        <FileExplorer />
      </div>
    </div>
  );
};

export default AdminFiles;
