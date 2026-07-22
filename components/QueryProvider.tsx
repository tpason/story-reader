"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { setupReaderChapterQueryPersist } from "@/lib/reader-query-persist";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 45,
            staleTime: 1000 * 60 * 4,
            refetchOnMount: false,
            refetchOnReconnect: "always",
            refetchOnWindowFocus: false,
            retry: 1
          }
        }
      })
  );

  useEffect(() => setupReaderChapterQueryPersist(queryClient), [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
