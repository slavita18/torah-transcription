const LIBRARY_KEY = 'torah_transcription_library';
const FOLDERS_KEY = 'torah_transcription_folders';
const API_KEY_KEY = 'torah_transcription_api_key';

export function getApiKey() {
  return localStorage.getItem(API_KEY_KEY) || '';
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key);
}

export function getFolders() {
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveFolder(folderName) {
  const folders = getFolders();
  if (!folders.includes(folderName)) {
    folders.push(folderName);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }
}

export function getLibrary() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveToLibrary(entry) {
  const library = getLibrary();
  const newEntry = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString('he-IL'),
    ...entry,
  };
  library.unshift(newEntry);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  if (newEntry.folder) saveFolder(newEntry.folder);
  return newEntry;
}

export function deleteFromLibrary(id) {
  const library = getLibrary().filter(e => e.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function updateLibraryEntry(id, updates) {
  const library = getLibrary().map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}
