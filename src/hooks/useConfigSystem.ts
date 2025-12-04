// hooks/useSystemConfig.ts
import { useState, useEffect } from 'react';
import {configService} from '../services/database/config';
import { SystemConfig } from '../types/config';

export const useSystemConfig = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const allConfigs = await configService.getAllConfigs();
      setConfigs(allConfigs.system);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      // Inicializar com configurações padrão se necessário
      await configService.initializeDefaultConfigs();
      const allConfigs = await configService.getAllConfigs();
      setConfigs(allConfigs.system);
    } finally {
      setLoading(false);
    }
  };

  const getConfigValue = <T,>(category: string, key: string, defaultValue?: T): T => {
    const config = configs.find(c => c.category === category && c.key_name === key);
    return config ? config.value : defaultValue;
  };

  const updateConfig = async (category: string, key: string, value: any) => {
    const config = configs.find(c => c.category === category && c.key_name === key);
    if (config) {
      await configService.setConfig(
       {
         category:category,key_name: key, value:value,data_type: config.data_type, description: config.description
       }
      );
      await loadConfigs(); // Recarregar configurações
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  return {
    configs,
    loading,
    loadConfigs,
    getConfigValue,
    updateConfig
  };
};