import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Settings = {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  whatsappNumber: string;
  catalogTitle: string;
  catalogSubtitle: string;
  catalogHeaderTitle: string;
  companyName?: string;
  companyCNPJ?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyCEP?: string;
  companyPhone?: string;
  companyEmail?: string;
  receiptTemplate?: string;
  contractTemplate?: string;
  receiptTitle?: string;
  receiptNotes?: string;
  contractTitle?: string;
  contractClauses?: string;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    logoUrl: '',
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    whatsappNumber: '',
    catalogTitle: 'Catálogo de Produtos',
    catalogSubtitle: 'Bem-vindo ao nosso catálogo!',
    catalogHeaderTitle: 'Título Principal',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();

    // Escuta mudanças em tempo real
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings' 
      }, () => {
        loadSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings({
          logoUrl: data.logo_url || '',
          primaryColor: data.primary_color || '#8B5CF6',
          secondaryColor: data.secondary_color || '#EC4899',
          whatsappNumber: data.whatsapp_number || '',
          catalogTitle: data.catalog_title || 'Catálogo de Produtos',
          catalogSubtitle: data.catalog_subtitle || 'Bem-vindo ao nosso catálogo!',
          catalogHeaderTitle: data.catalog_header_title || 'Título Principal',
          companyName: data.company_name,
          companyCNPJ: data.company_cnpj,
          companyAddress: data.company_address,
          companyCity: data.company_city,
          companyState: data.company_state,
          companyCEP: data.company_cep,
          companyPhone: data.company_phone,
          companyEmail: data.company_email,
          receiptTemplate: data.receipt_template,
          contractTemplate: data.contract_template,
          receiptTitle: data.receipt_title,
          receiptNotes: data.receipt_notes,
          contractTitle: data.contract_title,
          contractClauses: data.contract_clauses,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
};
