"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type EditorImagePayload = {
  src: string;
  alt?: string;
  id?: string;
};

type EditorImageContextValue = {
  selectedEditorImage: EditorImagePayload | null;
  setSelectedEditorImage: (image: EditorImagePayload | null) => void;
};

const EditorImageContext = createContext<EditorImageContextValue | undefined>(
  undefined,
);

export function EditorImageProvider({ children }: { children: React.ReactNode }) {
  const [selectedEditorImage, setSelectedEditorImage] =
    useState<EditorImagePayload | null>(null);

  const value = useMemo(
    () => ({
      selectedEditorImage,
      setSelectedEditorImage,
    }),
    [selectedEditorImage],
  );

  return (
    <EditorImageContext.Provider value={value}>
      {children}
    </EditorImageContext.Provider>
  );
}

export function useEditorImage() {
  const context = useContext(EditorImageContext);
  if (!context) {
    throw new Error("useEditorImage must be used inside <EditorImageProvider>");
  }
  return context;
}
