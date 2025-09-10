// SidebarContext.jsx
import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true); // ← NEW

  return (
    <SidebarContext.Provider value={{
      sidebarOpen,
      setSidebarOpen,
      sidebarVisible,
      setSidebarVisible, // ← expose this
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
