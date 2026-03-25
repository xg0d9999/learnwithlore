// src/services/googleDriveService.ts

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const DISCOVERY_DOCS = [import.meta.env.VITE_GOOGLE_DRIVE_DISCOVERY_DOC || 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = import.meta.env.VITE_GOOGLE_DRIVE_SCOPES || 'https://www.googleapis.com/auth/drive';

let gapiInitialized = false;
let tokenClient: any = null;

export const loadGapiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

export const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

export const initializeGapiClient = async (): Promise<void> => {
  if (gapiInitialized) return;

  return new Promise((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        
        // Fallback explicit load just in case discoveryDocs fails silently
        if (!window.gapi.client.drive) {
          await new Promise((res) => window.gapi.client.load('drive', 'v3', res));
        }
        
        gapiInitialized = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
};

export const initializeTokenClient = (onTokenResponse: (resp: any) => void) => {
  if (tokenClient) return tokenClient;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: onTokenResponse,
  });

  return tokenClient;
};

export const listDriveFiles = async (folderId: string = 'root', customQuery?: string, orderBy: string = 'folder,name') => {
  try {
    if (!window.gapi?.client?.drive) {
      console.error('Google Drive API not loaded');
      return [];
    }
    const q = customQuery !== undefined ? customQuery : `'${folderId}' in parents and trashed = false`;
    const response = await window.gapi.client.drive.files.list({
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, iconLink)',
      q,
      orderBy,
    });
    return response?.result?.files || [];
  } catch (err) {
    console.error('Error listing files:', err);
    throw err;
  }
};

export const searchDriveFiles = async (query: string, folderId: string = 'root') => {
  try {
    if (!window.gapi?.client?.drive) {
      console.error('Google Drive API not loaded');
      return [];
    }
    // Si estamos buscando en toda la unidad o en una carpeta específica
    const folderFilter = folderId !== 'root' ? ` and '${folderId}' in parents` : '';
    const response = await window.gapi.client.drive.files.list({
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, iconLink)',
      q: `name contains '${query}' and trashed = false${folderFilter}`,
      orderBy: 'folder,name',
    });
    return response?.result?.files || [];
  } catch (err) {
    console.error('Error searching files:', err);
    throw err;
  }
};

export const deleteFile = async (fileId: string) => {
  try {
    await window.gapi.client.drive.files.update({
      fileId: fileId,
      resource: { trashed: true }
    });
    return true;
  } catch (err) {
    console.error('Error al enviar archivo a papelera:', err);
    throw err;
  }
};

export const renameFile = async (fileId: string, newName: string) => {
  try {
    const response = await window.gapi.client.drive.files.update({
      fileId: fileId,
      resource: { name: newName },
      fields: 'id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, iconLink'
    });
    return response.result;
  } catch (err) {
    console.error('Error al renombrar archivo:', err);
    throw err;
  }
};

export const duplicateFile = async (fileId: string, originalName: string) => {
  try {
    const response = await window.gapi.client.drive.files.copy({
      fileId: fileId,
      resource: { name: `Copia de ${originalName}` },
      fields: 'id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, iconLink'
    });
    return response.result;
  } catch (err) {
    console.error('Error al duplicar archivo:', err);
    throw err;
  }
};

export const uploadFile = async (file: File, folderId: string = 'root', onProgress?: (progress: number) => void) => {
  return new Promise((resolve, reject) => {
    const token = window.gapi?.client?.getToken()?.access_token;
    if (!token) {
      reject(new Error("No hay token de acceso"));
      return;
    }

    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    // Use the upload API endpoint for multipart
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Error al subir archivo: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Error de red al subir archivo'));
    xhr.send(form);
  });
};

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
