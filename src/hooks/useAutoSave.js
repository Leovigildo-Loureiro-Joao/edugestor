// hooks/useAutoSave.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useAutoSave = (storageKey, initialData, delay = 2000) => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📂 Rascunho recuperado do localStorage:', parsed.data);
        return parsed.data;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar rascunho:', error);
    }
    return initialData;
  });
  
  const [lastSave, setLastSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef();

  const saveDraft = useCallback((newData, action = 'auto-save') => {
    try {
      const historyItem = {
        timestamp: Date.now(),
        data: newData,
        action
      };
      
      localStorage.setItem(storageKey, JSON.stringify(historyItem));
      setLastSave(historyItem.timestamp);
      setHasUnsavedChanges(false);
      
      if (action === 'manual-save') {
        console.log('💾 Rascunho salvo manualmente:', newData);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar rascunho:', error);
    }
  }, [storageKey]);

  // Auto-save
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Só salva se houver mudanças
    if (hasUnsavedChanges) {
      timeoutRef.current = setTimeout(() => {
        if (Object.values(data).some(value => value !== '' && value !== null)) {
          saveDraft(data, 'auto-save');
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, saveDraft, delay, hasUnsavedChanges]);

  const updateData = useCallback((newData) => {
    setData(newData);
    setHasUnsavedChanges(true);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setLastSave(null);
    setHasUnsavedChanges(false);
    console.log('🗑️ Rascunho limpo');
  }, [storageKey]);

  return {
    data,
    setData: updateData,
    lastSave,
    saveDraft: () => saveDraft(data, 'manual-save'),
    clearDraft,
    hasUnsavedChanges
  };
};