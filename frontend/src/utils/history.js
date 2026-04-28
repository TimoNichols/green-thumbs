import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'green_thumbs_history';
const MAX_ENTRIES = 100;

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToHistory(report) {
  try {
    const existing = await getHistory();
    const entry = {
      ...report,
      id: 'scan_' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return entry;
  } catch {
    return null;
  }
}

export async function deleteFromHistory(id) {
  try {
    const existing = await getHistory();
    const updated = existing.filter((e) => e.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
