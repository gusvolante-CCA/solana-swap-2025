const HISTORY_KEY = 'solana-swap-tx-history';
const HISTORY_EVENT = 'solana-swap-tx-history-updated';

export interface TxEntry {
  signature: string;
  type: string;
  detail: string;
  timestamp: number;
}

export function getTxHistory(): TxEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TxEntry[];
  } catch {
    return [];
  }
}

export function addTxEntry(entry: TxEntry) {
  const history = getTxHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function clearTxHistory() {
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function subscribeTxHistory(callback: () => void): () => void {
  window.addEventListener(HISTORY_EVENT, callback);
  return () => window.removeEventListener(HISTORY_EVENT, callback);
}

export function explorerTxUrl(signature: string, clusterUrl: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(clusterUrl)}`;
}
