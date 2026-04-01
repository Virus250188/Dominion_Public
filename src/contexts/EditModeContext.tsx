"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface EditModeContextValue {
  editMode: boolean;
  toggleEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: false,
  toggleEditMode: () => {},
});

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = useCallback(() => setEditMode((prev) => !prev), []);

  return (
    <EditModeContext.Provider value={{ editMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
