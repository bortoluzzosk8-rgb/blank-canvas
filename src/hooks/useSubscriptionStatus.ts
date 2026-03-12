import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionStatus = {
  status: 'trial' | 'active' | 'past_due' | 'expired' | 'blocked' | 'cancelled';
  trialDaysLeft: number | null;
  plan: string | null;
  expiresAt: Date | null;
  franchiseId: string | null;
  nextDueDate: Date | null;
  paymentMethod: string | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
};

export const useSubscriptionStatus = (userId: string | undefined) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSubscriptionStatus = async () => {
      try {
        // 1. Buscar franchise_id do usuário (pode ser franqueadora, vendedor ou motorista)
        let franchiseId: string | null = null;
        
        // Tentar user_franchises primeiro (franqueadora)
        const { data: ufRows } = await supabase
          .from('user_franchises')
          .select('franchise_id')
          .eq('user_id', userId)
          .limit(1);
        const ufData = ufRows?.[0] || null;
        
        if (ufData?.franchise_id) {
          franchiseId = ufData.franchise_id;
        } else {
          // Tentar drivers
          const { data: driverData } = await supabase
            .from('drivers')
            .select('franchise_id')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (driverData?.franchise_id) {
            franchiseId = driverData.franchise_id;
          } else {
            // Vendedores não têm franchise_id direto
            setSubscriptionStatus(null);
            setLoading(false);
            return;
          }
        }
        
        if (!franchiseId) {
          setSubscriptionStatus(null);
          setLoading(false);
          return;
        }
        
        // 2. Buscar franquia
        const { data: franchise } = await supabase
          .from('franchises')
          .select('id, parent_franchise_id, trial_ends_at, subscription_status, subscription_plan, subscription_expires_at, next_due_date, payment_method, asaas_customer_id, asaas_subscription_id')
          .eq('id', franchiseId)
          .single();
        
        if (!franchise) {
          setSubscriptionStatus(null);
          setLoading(false);
          return;
        }
        
        // Se for unidade filha, buscar franquia pai (raiz)
        let rootFranchise = franchise;
        if (franchise.parent_franchise_id) {
          const { data: parent } = await supabase
            .from('franchises')
            .select('id, parent_franchise_id, trial_ends_at, subscription_status, subscription_plan, subscription_expires_at, next_due_date, payment_method, asaas_customer_id, asaas_subscription_id')
            .eq('id', franchise.parent_franchise_id)
            .single();
          
          if (parent) {
            rootFranchise = parent;
          }
        }
        
        // 3. Calcular status
        const now = new Date();
        const trialEndsAt = rootFranchise?.trial_ends_at ? new Date(rootFranchise.trial_ends_at) : null;
        const subscriptionExpiresAt = rootFranchise?.subscription_expires_at ? new Date(rootFranchise.subscription_expires_at) : null;
        const nextDueDate = rootFranchise?.next_due_date ? new Date(rootFranchise.next_due_date) : null;
        
        // Calcular dias restantes do trial
        let trialDaysLeft: number | null = null;
        if (trialEndsAt && rootFranchise?.subscription_status === 'trial') {
          const diff = trialEndsAt.getTime() - now.getTime();
          trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }
        
        // Determinar status atual
        let status: 'trial' | 'active' | 'past_due' | 'expired' | 'blocked' | 'cancelled' = 
          (rootFranchise?.subscription_status as any) || 'trial';
        
        // Trial expirado
        if (status === 'trial' && trialEndsAt && now > trialEndsAt) {
          status = 'expired';
        }
        
        // Assinatura expirada
        if (status === 'active' && subscriptionExpiresAt && now > subscriptionExpiresAt) {
          status = 'expired';
        }
        
        // Past due por mais de 7 dias = blocked
        if (status === 'past_due' && nextDueDate) {
          const daysPastDue = Math.floor((now.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysPastDue > 7) {
            status = 'blocked';
          }
        }
        
        setSubscriptionStatus({
          status,
          trialDaysLeft,
          plan: rootFranchise?.subscription_plan || null,
          expiresAt: subscriptionExpiresAt,
          franchiseId: rootFranchise?.id || null,
          nextDueDate,
          paymentMethod: rootFranchise?.payment_method || null,
          asaasCustomerId: rootFranchise?.asaas_customer_id || null,
          asaasSubscriptionId: rootFranchise?.asaas_subscription_id || null,
        });
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [userId]);

  return { subscriptionStatus, loading };
};
