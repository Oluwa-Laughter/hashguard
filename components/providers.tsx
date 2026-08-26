"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, injected, WagmiProvider, http } from "wagmi";
import { hskTestnet, hskMainnet, supportedChains } from "@/lib/chains";

const config = createConfig({
  chains: supportedChains,
  connectors: [
    injected({ target: "metaMask" }),
    injected({ target: "coinbaseWallet" }),
    injected({ target: "trust" }),
    injected()
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
