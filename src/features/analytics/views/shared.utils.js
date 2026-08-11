// fetchProgressBars returns { items: [...] } from DB, but fallback is a plain array.
export function safeBarItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

// fetchConfig returns { configData: {...} } from DB, but fallback is the config object directly.
export function safeConfigData(data, fallback) {
  if (!data) return fallback || {};
  if (data.configData && typeof data.configData === 'object') return data.configData;
  return data;
}

// fetchViewTable returns { rows: [...] } from both DB and fallback, but guard anyway.
export function safeTableRows(data, fallbackRows) {
  if (!data) return fallbackRows || [];
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  return fallbackRows || [];
}
