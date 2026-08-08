import AsyncStorage from '@react-native-async-storage/async-storage';

export const GAS_URL_KEY = 'jobmail_gas_url';

export async function getGasUrl(): Promise<string> {
  try {
    const url = await AsyncStorage.getItem(GAS_URL_KEY);
    return url || '';
  } catch (e) {
    return '';
  }
}

export async function setGasUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(GAS_URL_KEY, url.trim());
}

export async function fetchLamaran(sheetName: string = 'Applied') {
  const baseUrl = await getGasUrl();
  if (!baseUrl) {
    throw new Error('URL Google Apps Script belum diatur di menu Setup.');
  }

  // DI-FIX: Menggunakan parameter `sheet` agar sesuai dengan Web App GAS
  const response = await fetch(`${baseUrl}?action=getLamaran&sheet=${encodeURIComponent(sheetName)}`);
  
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status === 'error') {
    throw new Error(data.message || 'Gagal mengambil data dari GAS');
  }

  return data;
}

export async function addLamaran(payload: any) {
  const baseUrl = await getGasUrl();
  if (!baseUrl) {
    throw new Error('URL Google Apps Script belum diatur di menu Setup.');
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'addLamaran',
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return await response.json();
}
