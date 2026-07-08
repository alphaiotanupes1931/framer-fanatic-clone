import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarState = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  rightCollapsed: boolean;
  setRightCollapsed: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarState>({
  collapsed: false,
  setCollapsed: () => {},
  rightCollapsed: false,
  setRightCollapsed: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, rightCollapsed, setRightCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}