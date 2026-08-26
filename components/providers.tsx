"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, injected, WagmiProvider } from "wagmi";
import { hskChain, hskTransport } from "@/lib/chains";

const config = createConfig({ chains: [hskChain], connectors: [injected()], transports: { [hskChain.id]: hskTransport }, ssr: true });
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></WagmiProvider>;
}
