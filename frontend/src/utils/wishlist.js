import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'green_thumbs_wishlist';
const MAX_ENTRIES = 100;

export async function getWishlist() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToWishlist(item) {
  try {
    const existing = await getWishlist();
    const entry = {
      ...item,
      id: 'wish_' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return entry;
  } catch {
    return null;
  }
}

export async function deleteFromWishlist(id) {
  try {
    const existing = await getWishlist();
    await AsyncStorage.setItem(KEY, JSON.stringify(existing.filter((e) => e.id !== id)));
  } catch {}
}
