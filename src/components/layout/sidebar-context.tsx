import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarState = { collapsed: boolean; setCollapsed: (v: boolean) => void };

const SidebarContext = createContext<SidebarState>({ collapsed: false, setCollapsed: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <SidebarContext.Provider value={{ collapsed, setCollapsed }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return useContext(SidebarContext);
}