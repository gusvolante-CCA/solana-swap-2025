import { useEffect, useState } from 'react';
import { clearTxHistory, explorerTxUrl, getTxHistory, subscribeTxHistory, type TxEntry } from '../lib/history';
import { CLUSTER_URL } from '../anchor/setup';

export default function TransactionHistory() {
  const [history, setHistory] = useState<TxEntry[]>(getTxHistory());

  useEffect(() => subscribeTxHistory(() => setHistory(getTxHistory())), []);

  if (history.length === 0) {
    return <div className="panel p-6 text-center text-(--color-text-dim)">Todavía no hay transacciones registradas en esta sesión.</div>;
  }

  return (
    <div className="panel p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Historial de transacciones</h2>
        <button className="text-sm text-(--color-text-dim) hover:text-(--color-text)" onClick={clearTxHistory}>
          Limpiar
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {history.map((tx) => (
          <li key={tx.signature + tx.timestamp} className="flex justify-between border-b border-(--color-panel-border) pb-2 last:border-0">
            <div>
              <span className="font-semibold">{tx.type}</span>{' '}
              <span className="text-(--color-text-dim)">{tx.detail}</span>
              <div className="text-xs text-(--color-text-dim)">{new Date(tx.timestamp).toLocaleString()}</div>
            </div>
            <a
              className="mono text-(--color-accent-2) hover:underline"
              href={explorerTxUrl(tx.signature, CLUSTER_URL)}
              target="_blank"
              rel="noreferrer"
            >
              {tx.signature.slice(0, 8)}...
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
