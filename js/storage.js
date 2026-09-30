// Reads and writes localStorage, and carries on quietly if it's blocked.

export function readSetting(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage is blocked
  }
}
