import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { CLUSTER_URL } from '../anchor/setup';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-(--color-panel-border)">
      <div>
        <h1 className="text-xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-(--color-accent) to-(--color-accent-2)">
            Solana Swap
          </span>{' '}
          <span className="text-(--color-text-dim) text-sm font-normal">2025</span>
        </h1>
        <p className="text-xs text-(--color-text-dim) mono">cluster: {CLUSTER_URL}</p>
      </div>
      <WalletMultiButton />
    </header>
  );
}
