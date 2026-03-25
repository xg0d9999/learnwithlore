// src/services/googleDriveService.ts

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const DISCOVERY_DOCS = [import.meta.env.VITE_GOOGLE_DRIVE_DISCOVERY_DOC];
const SCOPES = import.meta.env.VITE_GOOGLE_DRIVE_SCOPES;

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

export const listDriveFiles = async (folderId: string = 'root') => {
  try {
    const response = await window.gapi.client.drive.files.list({
      pageSize: 30,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink)',
      q: `'${folderId}' in parents and trashed = false`,
      orderBy: 'folder,name',
    });
    return response.result.files;
  } catch (err) {
    console.error('Error listing files:', err);
    throw err;
  }
};

export const searchDriveFiles = async (query: string) => {
  try {
    const response = await window.gapi.client.drive.files.list({
      pageSize: 30,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink)',
      q: `name contains '${query}' and trashed = false`,
      orderBy: 'folder,name',
    });
    return response.result.files;
  } catch (err) {
    console.error('Error searching files:', err);
    throw err;
  }
};

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
