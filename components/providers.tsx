"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http, injected } from "wagmi";
import { type EIP1193Provider } from "viem";
import { hskTestnet, hskMainnet, supportedChains } from "@/lib/chains";

const config = createConfig({
  chains: supportedChains,
  connectors: [
    injected({ target: "metaMask" }),
    injected({ target: "phantom" }),
    injected({ target: "coinbaseWallet" }),
    injected({
      target: {
        id: "okx",
        name: "OKX Wallet",
        provider: (window) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((window as any)?.okxwallet ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((window as any)?.ethereum?.isOkxWallet ? (window as any)?.ethereum : undefined)) as
            | EIP1193Provider
            | undefined,
      },
    }),
    injected({
      target: {
        id: "rabby",
        name: "Rabby Wallet",
        provider: (window) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((window as any)?.rabby ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((window as any)?.ethereum?.isRabby ? (window as any)?.ethereum : undefined)) as
            | EIP1193Provider
            | undefined,
      },
    }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [hskTestnet.id]: http(hskTestnet.rpcUrls.default.http[0]),
    [hskMainnet.id]: http(hskMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
