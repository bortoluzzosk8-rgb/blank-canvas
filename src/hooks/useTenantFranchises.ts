import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Franchise = {
  id: string;
  name: string;
  city: string;
};

/**
 * Hook para buscar franquias filtradas pelo tenant do usuário logado.
 * Garante isolamento multi-tenant: cada cliente SaaS vê apenas suas próprias unidades.
 * 
 * Retorna:
 * - A franquia raiz do usuário (onde parent_franchise_id IS NULL)
 * - As unidades filhas dessa franquia (onde parent_franchise_id = id_da_franquia_raiz)
 */
export function useTenantFranchises() {
  const { user } = useAuth();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFranchises = async () => {
      if (!user?.id) {
        setFranchises([]);
        setLoading(false);
        return;
      }

      try {
        // Buscar a franquia raiz do usuário logado
        const { data: userFranchiseRows } = await supabase
          .from("user_franchises")
          .select("franchise_id")
          .eq("user_id", user.id)
          .limit(1);
        const userFranchiseData = userFranchiseRows?.[0] || null;

        if (!userFranchiseData?.franchise_id) {
          setFranchises([]);
          setLoading(false);
          return;
        }

        const rootFranchiseId = userFranchiseData.franchise_id;

        // Buscar a franquia raiz + unidades filhas
        const { data, error } = await supabase
          .from("franchises")
          .select("id, name, city")
          .eq("status", "active")
          .or(`id.eq.${rootFranchiseId},parent_franchise_id.eq.${rootFranchiseId}`)
          .order("name");

        if (error) throw error;
        setFranchises(data || []);
      } catch (error) {
        console.error("Error fetching franchises:", error);
        toast.error("Erro ao carregar unidades");
      } finally {
        setLoading(false);
      }
    };

    fetchFranchises();
  }, [user?.id]);

  return { franchises, loading, refetch: () => {} };
}
