import { useState } from 'react';
import Header from './components/Header';
import MarketDashboard from './components/MarketDashboard';
import AdminPanel from './components/AdminPanel';
import SwapPanel from './components/SwapPanel';
import TransactionHistory from './components/TransactionHistory';
import { useMarket } from './hooks/useMarket';

type Tab = 'dashboard' | 'admin' | 'swap' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'admin', label: 'Admin' },
  { id: 'swap', label: 'Swap' },
  { id: 'history', label: 'Historial' },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const {
    config,
    setConfig,
    reset,
    derived,
    market,
    vaultABalance,
    vaultBBalance,
    userTokenABalance,
    userTokenBBalance,
    loading,
    refresh,
  } = useMarket();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <nav className="flex gap-1 mb-4 border-b border-(--color-panel-border)">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-button ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <MarketDashboard
            config={config}
            market={market}
            vaultABalance={vaultABalance}
            vaultBBalance={vaultBBalance}
            derived={derived}
            loading={loading}
          />
        )}

        {tab === 'admin' && (
          <AdminPanel config={config} market={market} setConfig={setConfig} reset={reset} refresh={refresh} />
        )}

        {tab === 'swap' && (
          <SwapPanel
            config={config}
            market={market}
            userTokenABalance={userTokenABalance}
            userTokenBBalance={userTokenBBalance}
            refresh={refresh}
          />
        )}

        {tab === 'history' && <TransactionHistory />}
      </main>

      <footer className="text-center text-xs text-(--color-text-dim) py-4 border-t border-(--color-panel-border)">
        Master Blockchain 360 - CodeCrypto Academy - SOLANA SWAP
      </footer>
    </div>
  );
}

export default App;
