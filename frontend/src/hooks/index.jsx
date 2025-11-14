import { useState } from "react";

export const useCustomHooks = () => {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (onSave) => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  return { content, setContent, isSaving, handleSave };
};
