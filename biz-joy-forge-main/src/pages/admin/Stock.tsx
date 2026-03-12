import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Equipment, ArchivedEquipment, Franchise, MovementHistory, MovementNeed } from "@/types/inventory";
import { useTenantFranchises } from "@/hooks/useTenantFranchises";
import { Dashboard } from "@/components/inventory/Dashboard";
import { KanbanBoard } from "@/components/inventory/KanbanBoard";
import { DeletedEquipmentTable } from "@/components/inventory/DeletedEquipmentTable";
import { MovementNeedsTable } from "@/components/inventory/MovementNeedsTable";
import { MovementHistoryTable, GlobalMovementHistory } from "@/components/inventory/MovementHistoryTable";
import { StockAvailabilityQuery } from "@/components/inventory/StockAvailabilityQuery";
import { ProductAnalysis } from "@/components/inventory/ProductAnalysis";
import { Modal } from "@/components/inventory/Modal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, Plus, X, ImagePlus } from "lucide-react";
import { autoSubstituteItems } from "@/lib/autoSubstituteItems";
import { useNavigate } from "react-router-dom";

const Stock = () => {
  const navigate = useNavigate();
  const { isFranqueadora, isVendedor, userFranchise } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMovementNeeds, setLoadingMovementNeeds] = useState(false);
  const [movementNeedsLoaded, setMovementNeedsLoaded] = useState(false);

  const { franchises } = useTenantFranchises();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [archived, setArchived] = useState<ArchivedEquipment[]>([]);
  const [products, setProducts] = useState<{id: string; name: string}[]>([]);
  const [movementNeeds, setMovementNeeds] = useState<MovementNeed[]>([]);
  const [movingItem, setMovingItem] = useState(false);
  const [checkingSubstitutions, setCheckingSubstitutions] = useState(false);
  const [substitutionCount, setSubstitutionCount] = useState(0);

  const [activeTab, setActiveTab] = useState<"ativos" | "excluidos" | "dashboard" | "movimentacoes" | "consulta" | "analise" | "historico">("ativos");
  const [globalMovementHistory, setGlobalMovementHistory] = useState<GlobalMovementHistory[]>([]);
  const [loadingGlobalHistory, setLoadingGlobalHistory] = useState(false);
  const [activeFranchise, setActiveFranchise] = useState("");
  const [search, setSearch] = useState("");

  // Equipment modal
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [equipName, setEquipName] = useState("");
  const [equipValue, setEquipValue] = useState("");
  const [equipRentalValue, setEquipRentalValue] = useState("");
  const [equipCode, setEquipCode] = useState("");
  const [equipDate, setEquipDate] = useState("");
  const [equipImageUrls, setEquipImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [equipFranchiseId, setEquipFranchiseId] = useState("");

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editRentalValue, setEditRentalValue] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [editFranchiseId, setEditFranchiseId] = useState("");

  // Delete modal
  const [delModalOpen, setDelModalOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<Equipment | null>(null);
  const [delReason, setDelReason] = useState<"vendido" | "sucateado" | "outro">("vendido");
  const [delNotes, setDelNotes] = useState("");

  // Maintenance modal
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintEqId, setMaintEqId] = useState("");
  const [maintNote, setMaintNote] = useState("");
  const [maintBlocksReservations, setMaintBlocksReservations] = useState(false);
  const [maintExitOpen, setMaintExitOpen] = useState(false);
  const [maintExitEqId, setMaintExitEqId] = useState("");

  // History modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<MovementHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Permanent delete modal
  const [permDelModalOpen, setPermDelModalOpen] = useState(false);
  const [permDelTarget, setPermDelTarget] = useState<ArchivedEquipment | null>(null);

  const getFranchiseDisplayName = (franchise: Franchise) => {
    return franchise.city && franchise.city !== "A definir" 
      ? franchise.city 
      : franchise.name;
  };

  const franchiseCityMap = useMemo(() => new Map(franchises.map((f) => [f.id, getFranchiseDisplayName(f)])), [franchises]);
  const franchiseNameById = (id: string) => franchiseCityMap.get(id) || "—";

  const { filtered, columns, totals } = useMemo(() => {
    const q = (search || "").toLowerCase();
    const filteredLocal = equipment.filter(
      (e) =>
        (!activeFranchise || e.franchiseId === activeFranchise) &&
        (!q || e.name.toLowerCase().includes(q))
    );
    const columnsLocal: any = { disponivel: [], manutencao: [] };
    const totalsLocal: any = { disponivel: 0, manutencao: 0 };
    for (const e of filteredLocal) {
      columnsLocal[e.status].push(e);
      totalsLocal[e.status] += e.value;
    }
    return { filtered: filteredLocal, columns: columnsLocal, totals: totalsLocal };
  }, [equipment, activeFranchise, search]);

  useEffect(() => {
    loadData();
  }, []);

  // Lazy load movement needs when tab is selected
  useEffect(() => {
    if (activeTab === "movimentacoes" && !movementNeedsLoaded && !loadingMovementNeeds) {
      loadMovementNeedsOptimized();
    }
  }, [activeTab, movementNeedsLoaded, loadingMovementNeeds]);

  async function loadData() {
    try {
      setLoading(true);

      // Franchises are now loaded from useTenantFranchises hook
      if (!isFranqueadora && !isVendedor && userFranchise) {
        setActiveFranchise(userFranchise.id);
        setEquipFranchiseId(userFranchise.id);
      }

      // Load products for dropdown
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      setProducts(productsData || []);

      // Load inventory items - vendedor vê todos
      let itemsQuery = supabase
        .from("inventory_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isFranqueadora && !isVendedor && userFranchise) {
        itemsQuery = itemsQuery.eq("franchise_id", userFranchise.id);
      }

      const { data: itemsData, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;

      const equipmentList: Equipment[] = (itemsData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        value: Number(item.value),
        rentalValue: Number(item.rental_value || 0),
        code: item.code,
        manufactureDate: item.manufacture_date,
        franchiseId: item.franchise_id || "",
        status: item.status,
        maintenanceNote: item.maintenance_note,
        imageUrl: item.image_url || [],
        notes: item.notes,
        blocksReservations: item.blocks_reservations || false,
      }));

      setEquipment(equipmentList);

      // Load archived items - apenas franqueadora e franqueado veem
      if (!isVendedor) {
        let archiveQuery = supabase
          .from("inventory_archive")
          .select("*")
          .order("deleted_at", { ascending: false });

        if (!isFranqueadora && userFranchise) {
          archiveQuery = archiveQuery.eq("franchise_id", userFranchise.id);
        }

        const { data: archiveData, error: archiveError } = await archiveQuery;
        if (archiveError) throw archiveError;

        const archivedList: ArchivedEquipment[] = (archiveData || []).map((a: any) => ({
          id: a.id,
          originalItemId: a.original_item_id,
          name: a.name,
          value: Number(a.value),
          rentalValue: Number(a.rental_value || 0),
          code: a.code,
          manufactureDate: a.manufacture_date,
          franchiseId: a.franchise_id,
          deletedAt: a.deleted_at,
          deletedBy: a.deleted_by,
          reason: a.reason,
          notes: a.notes,
          imageUrl: a.image_url || [],
        }));

        setArchived(archivedList);
      }

      // Movement needs are now loaded lazily when the tab is selected
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function addEquipment() {
    if (!equipName || !equipValue || !equipFranchiseId) {
      toast.error("Preencha nome, valor e unidade");
      return;
    }

    try {
      const generatedCode = equipCode || `EQ-${Date.now()}`;

      const { error } = await supabase
        .from("inventory_items")
        .insert({
          name: equipName,
          value: parseFloat(equipValue),
          rental_value: parseFloat(equipRentalValue) || 0,
          code: generatedCode,
          manufacture_date: equipDate || null,
          franchise_id: equipFranchiseId,
          status: "disponivel",
          image_url: equipImageUrls.length > 0 ? equipImageUrls : null,
        });

      if (error) throw error;

      toast.success(`Equipamento "${equipName}" adicionado com sucesso`);
      
      // Verificar se há itens emprestados que podem usar este novo item
      const subsCount = await autoSubstituteItems({
        silent: false,
        franchiseId: equipFranchiseId,
        productName: equipName,
      });
      
      setEquipModalOpen(false);
      resetEquipForm();
      
      if (subsCount > 0) {
        setMovementNeedsLoaded(false);
      }
      
      loadData();
    } catch (error: any) {
      console.error("Error adding equipment:", error);
      toast.error("Erro ao adicionar: " + (error.message || ""));
    }
  }

  function resetEquipForm() {
    setEquipName("");
    setEquipValue("");
    setEquipRentalValue("");
    setEquipCode("");
    setEquipDate("");
    setEquipFranchiseId(activeFranchise || franchises[0]?.id || "");
    setEquipImageUrls([]);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('inventory-images')
      .upload(fileName, file);
    
    if (error) {
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('inventory-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }

  async function handleEquipImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    const url = await uploadImage(file);
    if (url) {
      setEquipImageUrls(prev => [...prev, url]);
    }
    setUploadingImage(false);
    e.target.value = '';
  }

  async function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    const url = await uploadImage(file);
    if (url) {
      setEditImageUrls(prev => [...prev, url]);
    }
    setUploadingImage(false);
    e.target.value = '';
  }

  function removeEquipImage(idx: number) {
    setEquipImageUrls(prev => prev.filter((_, i) => i !== idx));
  }

  function removeEditImage(idx: number) {
    setEditImageUrls(prev => prev.filter((_, i) => i !== idx));
  }

  function openEdit(eq: Equipment) {
    setEditId(eq.id);
    setEditName(eq.name);
    setEditValue(String(eq.value));
    setEditRentalValue(String(eq.rentalValue || 0));
    setEditCode(eq.code);
    setEditDate(eq.manufactureDate || "");
    setEditFranchiseId(eq.franchiseId);
    setEditImageUrls(eq.imageUrl || []);
    setEditModalOpen(true);
  }

  async function confirmEdit() {
    const val = parseFloat(editValue);
    if (!editId || !editName.trim() || !editFranchiseId || !Number.isFinite(val)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const original = equipment.find((e) => e.id === editId);
      const changedFranchise = !!(original && original.franchiseId !== editFranchiseId);

      if (changedFranchise && !isFranqueadora) {
        toast.error("Apenas a franqueadora pode mover equipamentos entre unidades");
        return;
      }

      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: editName,
          value: val,
          rental_value: parseFloat(editRentalValue) || 0,
          code: editCode,
          manufacture_date: editDate || null,
          franchise_id: editFranchiseId,
          image_url: editImageUrls.length > 0 ? editImageUrls : null,
        })
        .eq("id", editId);

      if (error) throw error;

      if (changedFranchise && original) {
        const { data: userData } = await supabase.auth.getUser();
        
        await supabase.from("inventory_movements").insert({
          item_id: editId,
          from_franchise_id: original.franchiseId,
          to_franchise_id: editFranchiseId,
          moved_by: userData.user?.id,
        });

        toast.success(
          `Equipamento movido de ${franchiseNameById(original.franchiseId)} para ${franchiseNameById(editFranchiseId)}`
        );
      } else {
        toast.success("Equipamento atualizado");
      }

      setEditModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error editing equipment:", error);
      toast.error("Erro ao editar equipamento");
    }
  }

  async function moveStatus(id: string, s: "disponivel" | "manutencao") {
    const current = equipment.find((e) => e.id === id);
    if (!current) return;

    // Vendedor e franqueado só podem solicitar manutenção, não podem marcar como disponível
    if (!isFranqueadora && s === "disponivel") {
      toast.error("Apenas a franqueadora pode marcar equipamentos como disponíveis");
      return;
    }

    if (s === "manutencao" && current.status !== "manutencao") {
      setMaintEqId(id);
      setMaintNote(current.maintenanceNote || "");
      setMaintBlocksReservations(current.blocksReservations || false);
      setMaintModalOpen(true);
      return;
    }

    if (s === "disponivel" && current.status === "manutencao") {
      setMaintExitEqId(id);
      setMaintExitOpen(true);
      return;
    }

    try {
      await supabase.from("inventory_items").update({ status: s }).eq("id", id);
      toast.success("Status atualizado");
      loadData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  }

  async function saveMaintenanceNote() {
    if (!maintEqId) return;

    try {
      await supabase
        .from("inventory_items")
        .update({
          status: "manutencao",
          maintenance_note: (maintNote || "").trim(),
          blocks_reservations: maintBlocksReservations,
        })
        .eq("id", maintEqId);

      toast.success(maintBlocksReservations 
        ? "Equipamento movido para manutenção (reservas bloqueadas)" 
        : "Equipamento movido para manutenção (aceita reservas)"
      );
      setMaintModalOpen(false);
      setMaintEqId("");
      setMaintNote("");
      setMaintBlocksReservations(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving maintenance note:", error);
      toast.error("Erro ao salvar observação");
    }
  }

  function editMaintenanceNote(eqId: string) {
    const current = equipment.find((e) => e.id === eqId);
    setMaintEqId(eqId);
    setMaintNote(current?.maintenanceNote || "");
    setMaintBlocksReservations(current?.blocksReservations || false);
    setMaintModalOpen(true);
  }

  async function returnFromMaintenance(keepNote: boolean) {
    if (!maintExitEqId) {
      setMaintExitOpen(false);
      return;
    }

    try {
      const update: any = {
        status: "disponivel",
      };
      
      if (!keepNote) {
        update.maintenance_note = null;
      }

      await supabase
        .from("inventory_items")
        .update(update)
        .eq("id", maintExitEqId);

      toast.success("Equipamento voltou para disponível");
      setMaintExitOpen(false);
      setMaintExitEqId("");
      loadData();
    } catch (error: any) {
      console.error("Error returning from maintenance:", error);
      toast.error("Erro ao atualizar status");
    }
  }

  function openDeleteModal(eq: Equipment) {
    setDelTarget(eq);
    setDelReason("vendido");
    setDelNotes("");
    setDelModalOpen(true);
  }

  async function confirmDelete() {
    if (!delTarget) return;

    try {
      const { data: userData } = await supabase.auth.getUser();

      // Primeiro, inserir no arquivo
      const { error: archiveError } = await supabase.from("inventory_archive").insert({
        original_item_id: delTarget.id,
        name: delTarget.name,
        value: delTarget.value,
        rental_value: delTarget.rentalValue || 0,
        code: delTarget.code,
        manufacture_date: delTarget.manufactureDate,
        franchise_id: delTarget.franchiseId,
        deleted_by: userData.user?.id,
        reason: delReason,
        notes: (delNotes || "").trim() || null,
        image_url: delTarget.imageUrl,
      });

      if (archiveError) throw archiveError;

      // Remover referências em sale_items para permitir exclusão
      await supabase
        .from("sale_items")
        .update({ inventory_item_id: null })
        .eq("inventory_item_id", delTarget.id);

      // Depois, excluir o item original e verificar resultado
      const { error: deleteError, count } = await supabase
        .from("inventory_items")
        .delete({ count: 'exact' })
        .eq("id", delTarget.id);

      if (deleteError) {
        // Se falhou ao excluir, remover do arquivo para manter consistência
        await supabase.from("inventory_archive")
          .delete()
          .eq("original_item_id", delTarget.id);
        throw deleteError;
      }

      if (count === 0) {
        // Se não excluiu nenhum registro (RLS bloqueou silenciosamente)
        await supabase.from("inventory_archive")
          .delete()
          .eq("original_item_id", delTarget.id);
        throw new Error("Sem permissão para excluir este equipamento");
      }

      toast.success("Equipamento arquivado");
      setDelModalOpen(false);
      setDelTarget(null);
      setActiveTab("excluidos");
      loadData();
    } catch (error: any) {
      console.error("Error deleting equipment:", error);
      toast.error(error.message || "Erro ao arquivar equipamento");
    }
  }

  async function restoreEquipment(itemId: string) {
    try {
      const archivedItem = archived.find((a) => a.id === itemId);
      if (!archivedItem) return;

      await supabase.from("inventory_items").insert({
        name: archivedItem.name,
        value: archivedItem.value,
        rental_value: archivedItem.rentalValue || 0,
        code: archivedItem.code,
        manufacture_date: archivedItem.manufactureDate,
        franchise_id: archivedItem.franchiseId,
        status: "disponivel",
        image_url: archivedItem.imageUrl,
      });

      await supabase.from("inventory_archive").delete().eq("id", itemId);

      toast.success("Equipamento restaurado");
      setActiveTab("ativos");
      loadData();
    } catch (error: any) {
      console.error("Error restoring equipment:", error);
      toast.error("Erro ao restaurar equipamento");
    }
  }

  function openPermanentDeleteModal(itemId: string) {
    const item = archived.find((a) => a.id === itemId);
    setPermDelTarget(item || null);
    setPermDelModalOpen(true);
  }

  async function permanentlyDeleteEquipment() {
    if (!permDelTarget) return;

    try {
      const { error } = await supabase
        .from("inventory_archive")
        .delete()
        .eq("id", permDelTarget.id);

      if (error) throw error;

      toast.success("Equipamento excluído permanentemente");
      setPermDelModalOpen(false);
      setPermDelTarget(null);
      loadData();
    } catch (error: any) {
      console.error("Error permanently deleting equipment:", error);
      toast.error("Erro ao excluir equipamento");
    }
  }

  // Optimized movement needs loading - batch queries instead of N+1
  async function loadMovementNeedsOptimized() {
    setLoadingMovementNeeds(true);
    try {
      // 1. Fetch all future sales with items in a single query
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          client_name,
          rental_start_date,
          return_date,
          franchise_id,
          franchises!sales_franchise_id_fkey(name, city),
          sale_items!inner(
            inventory_item_id,
            inventory_items!inner(
              id,
              name,
              code,
              franchise_id,
              franchises(name, city)
            )
          )
        `)
        .neq("status", "cancelled")
        .gte("rental_start_date", new Date().toISOString().split("T")[0]);

      if (salesError) {
        console.error("Error loading sales:", salesError);
        return;
      }

      // 2. Identify items that need movement (different franchise)
      const itemsNeedingCheck: {
        sale: any;
        saleItem: any;
        invItem: any;
        targetFranchiseId: string;
      }[] = [];

      for (const sale of (salesData || [])) {
        const targetFranchiseId = sale.franchise_id;
        for (const saleItem of (sale.sale_items || [])) {
          const invItem = saleItem.inventory_items as any;
          if (invItem && invItem.franchise_id && invItem.franchise_id !== targetFranchiseId) {
            itemsNeedingCheck.push({ sale, saleItem, invItem, targetFranchiseId });
          }
        }
      }

      if (itemsNeedingCheck.length === 0) {
        setMovementNeeds([]);
        setMovementNeedsLoaded(true);
        return;
      }

      // 3. Get unique item names and target franchises for batch lookup
      const uniqueChecks = new Map<string, { itemName: string; targetFranchiseId: string }>();
      for (const check of itemsNeedingCheck) {
        const key = `${check.invItem.name}|${check.targetFranchiseId}`;
        if (!uniqueChecks.has(key)) {
          uniqueChecks.set(key, { itemName: check.invItem.name, targetFranchiseId: check.targetFranchiseId });
        }
      }

      // 4. Batch fetch all potential local items at target franchises
      const itemNames = [...new Set([...uniqueChecks.values()].map(c => c.itemName))];
      const { data: allLocalItems } = await supabase
        .from("inventory_items")
        .select("id, name, franchise_id, status")
        .in("name", itemNames)
        .eq("status", "disponivel");

      // 5. Batch fetch all sale_items for these local items to check conflicts
      const localItemIds = (allLocalItems || []).map(i => i.id);
      const { data: allConflicts } = await supabase
        .from("sale_items")
        .select(`
          inventory_item_id,
          sales!inner(
            id,
            rental_start_date,
            return_date,
            status
          )
        `)
        .in("inventory_item_id", localItemIds);

      // 6. Build a map of conflicts per inventory item
      const conflictsMap = new Map<string, any[]>();
      for (const conflict of (allConflicts || [])) {
        const itemId = conflict.inventory_item_id;
        if (!conflictsMap.has(itemId)) {
          conflictsMap.set(itemId, []);
        }
        conflictsMap.get(itemId)!.push(conflict.sales);
      }

      // 7. Helper to check local availability using in-memory data
      function checkLocalAvailabilityInMemory(
        itemName: string,
        targetFranchiseId: string,
        rentalStartDate: string,
        returnDate: string,
        excludeItemId: string
      ): boolean {
        const localItems = (allLocalItems || []).filter(
          i => i.name === itemName && 
               i.franchise_id === targetFranchiseId && 
               i.id !== excludeItemId
        );

        for (const localItem of localItems) {
          const itemConflicts = conflictsMap.get(localItem.id) || [];
          const hasConflict = itemConflicts.some((sale: any) => {
            if (!sale || sale.status === "cancelled") return false;
            const conflictStart = sale.rental_start_date;
            const conflictEnd = sale.return_date || sale.rental_start_date;
            const queryStart = rentalStartDate;
            const queryEnd = returnDate || rentalStartDate;
            return conflictStart <= queryEnd && conflictEnd >= queryStart;
          });

          if (!hasConflict) {
            return true;
          }
        }

        return false;
      }

      // 8. Process all items and determine movement needs
      const needs: MovementNeed[] = [];
      for (const check of itemsNeedingCheck) {
        const { sale, invItem, targetFranchiseId } = check;
        const hasLocalAvailable = checkLocalAvailabilityInMemory(
          invItem.name,
          targetFranchiseId,
          sale.rental_start_date || "",
          sale.return_date || sale.rental_start_date || "",
          invItem.id
        );

        if (!hasLocalAvailable) {
          const originFranchise = invItem.franchises as any;
          const targetFranchise = sale.franchises as any;
          needs.push({
            saleId: sale.id,
            clientName: sale.client_name,
            rentalStartDate: sale.rental_start_date || "",
            itemId: invItem.id,
            itemName: invItem.name,
            itemCode: invItem.code,
            originFranchiseId: invItem.franchise_id,
            originFranchiseName: originFranchise?.name || "",
            originFranchiseCity: originFranchise?.city || "",
            targetFranchiseId: targetFranchiseId || "",
            targetFranchiseName: targetFranchise?.name || "",
            targetFranchiseCity: targetFranchise?.city || "",
          });
        }
      }

      // Sort by rental date (nearest first)
      needs.sort((a, b) => {
        const dateA = new Date(a.rentalStartDate).getTime();
        const dateB = new Date(b.rentalStartDate).getTime();
        return dateA - dateB;
      });

      setMovementNeeds(needs);
      setMovementNeedsLoaded(true);
    } catch (error: any) {
      console.error("Error loading movement needs:", error);
      toast.error("Erro ao carregar necessidades de movimentação");
    } finally {
      setLoadingMovementNeeds(false);
    }
  }

  // Function to check and substitute borrowed items with local available items
  async function checkAndSubstituteItems() {
    setCheckingSubstitutions(true);
    setSubstitutionCount(0);
    
    try {
      const count = await autoSubstituteItems({ silent: false });
      setSubstitutionCount(count);
      
      if (count > 0) {
        setMovementNeedsLoaded(false);
        loadData();
      }
    } catch (error: any) {
      console.error("Error checking substitutions:", error);
    } finally {
      setCheckingSubstitutions(false);
    }
  }

  async function handleMarkAsMoved(need: MovementNeed) {
    setMovingItem(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Update inventory item franchise_id
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ franchise_id: need.targetFranchiseId })
        .eq("id", need.itemId);
      
      if (updateError) throw updateError;

      // Log movement in history
      await supabase.from("inventory_movements").insert({
        item_id: need.itemId,
        from_franchise_id: need.originFranchiseId,
        to_franchise_id: need.targetFranchiseId,
        moved_by: userData.user?.id,
        notes: `Movimentação para locação - Cliente: ${need.clientName}`,
      });

      toast.success(
        `${need.itemName} movido de ${need.originFranchiseName} para ${need.targetFranchiseName}`
      );
      // Reload movement needs and main data
      setMovementNeedsLoaded(false);
      loadData();
    } catch (error: any) {
      console.error("Error marking as moved:", error);
      toast.error("Erro ao registrar movimentação");
    } finally {
      setMovingItem(false);
    }
  }

  async function loadMovementHistory(itemId: string) {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          *,
          from_franchise:franchises!from_franchise_id(name, city),
          to_franchise:franchises!to_franchise_id(name, city)
        `)
        .eq("item_id", itemId)
        .order("moved_at", { ascending: false });

      if (error) throw error;

      const movements: MovementHistory[] = (data || []).map((m: any) => ({
        id: m.id,
        itemId: m.item_id,
        fromFranchiseId: m.from_franchise_id,
        toFranchiseId: m.to_franchise_id,
        movedAt: m.moved_at,
        movedBy: m.moved_by,
        notes: m.notes,
        fromFranchiseName: m.from_franchise?.name,
        fromFranchiseCity: m.from_franchise?.city,
        toFranchiseName: m.to_franchise?.name,
        toFranchiseCity: m.to_franchise?.city,
      }));

      setSelectedItemHistory(movements);
      setHistoryModalOpen(true);
    } catch (error: any) {
      console.error("Error loading movement history:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadGlobalMovementHistory(filters?: { startDate?: string; endDate?: string; franchiseId?: string }) {
    setLoadingGlobalHistory(true);
    try {
      let query = supabase
        .from("inventory_movements")
        .select(`
          *,
          item:inventory_items(name, code),
          from_franchise:franchises!from_franchise_id(name, city),
          to_franchise:franchises!to_franchise_id(name, city)
        `)
        .order("moved_at", { ascending: false })
        .limit(100);

      if (filters?.startDate) {
        query = query.gte("moved_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("moved_at", filters.endDate + "T23:59:59");
      }
      if (filters?.franchiseId && filters.franchiseId !== "all") {
        query = query.or(`from_franchise_id.eq.${filters.franchiseId},to_franchise_id.eq.${filters.franchiseId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const movements: GlobalMovementHistory[] = (data || []).map((m: any) => ({
        id: m.id,
        itemId: m.item_id,
        itemName: m.item?.name || "Item removido",
        itemCode: m.item?.code || "—",
        fromFranchiseId: m.from_franchise_id,
        toFranchiseId: m.to_franchise_id,
        movedAt: m.moved_at,
        movedBy: m.moved_by,
        notes: m.notes,
        fromFranchiseName: m.from_franchise?.name,
        fromFranchiseCity: m.from_franchise?.city,
        toFranchiseName: m.to_franchise?.name,
        toFranchiseCity: m.to_franchise?.city,
      }));

      setGlobalMovementHistory(movements);
    } catch (error: any) {
      console.error("Error loading global movement history:", error);
      toast.error("Erro ao carregar histórico de movimentações");
    } finally {
      setLoadingGlobalHistory(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Estoque</h1>
      <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeTab === "ativos" ? "default" : "outline"}
            onClick={() => setActiveTab("ativos")}
          >
            📦 Ativos
          </Button>
          {(isFranqueadora || isVendedor) && (
            <Button
              variant={activeTab === "consulta" ? "default" : "outline"}
              onClick={() => setActiveTab("consulta")}
            >
              🔍 Consulta
            </Button>
          )}
          {isFranqueadora && (
            <>
              <Button
                variant={activeTab === "excluidos" ? "default" : "outline"}
                onClick={() => setActiveTab("excluidos")}
              >
                🗑️ Excluídos
              </Button>
              <Button
                variant={activeTab === "movimentacoes" ? "default" : "outline"}
                onClick={() => setActiveTab("movimentacoes")}
                className="relative"
              >
                🚚 Movimentações
                {movementNeeds.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                    {movementNeeds.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === "dashboard" ? "default" : "outline"}
                onClick={() => setActiveTab("dashboard")}
              >
                📊 Dashboard
              </Button>
              <Button
                variant={activeTab === "historico" ? "default" : "outline"}
                onClick={() => {
                  setActiveTab("historico");
                  loadGlobalMovementHistory();
                }}
              >
                🕐 Histórico
              </Button>
              <Button
                variant={activeTab === "analise" ? "default" : "outline"}
                onClick={() => setActiveTab("analise")}
              >
                📈 Análise
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {franchises.map((f) => (
            <Button
              key={f.id}
              variant={activeFranchise === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFranchise(f.id)}
              className="rounded-full"
            >
              {getFranchiseDisplayName(f)}
            </Button>
          ))}
          {franchises.length > 1 && (
            <Button
              variant={activeFranchise === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFranchise("")}
              className="rounded-full"
            >
              Todas
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar equipamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          {isFranqueadora && (
            <Button
              onClick={() => {
                resetEquipForm();
                setEquipModalOpen(true);
              }}
            >
              + Equipamento
            </Button>
          )}
        </div>
      </div>

      {activeTab === "analise" ? (
        <ProductAnalysis equipment={equipment} franchises={franchises} />
      ) : activeTab === "consulta" ? (
        <StockAvailabilityQuery franchises={franchises} />
      ) : activeTab === "dashboard" ? (
        <Dashboard
          franchises={franchises}
          equipment={equipment}
          franchiseNameById={franchiseNameById}
        />
      ) : activeTab === "ativos" ? (
        <KanbanBoard
          columns={columns}
          totals={totals}
          franchiseNameById={franchiseNameById}
          onMoveStatus={moveStatus}
          onEdit={openEdit}
          onDelete={openDeleteModal}
          onEditMaintenanceNote={editMaintenanceNote}
          onViewHistory={loadMovementHistory}
          readOnly={isVendedor}
        />
      ) : activeTab === "movimentacoes" ? (
        loadingMovementNeeds ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando necessidades de movimentação...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Substitution check button */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Verificar substituições automáticas</p>
                  <p className="text-sm text-muted-foreground">
                    Substitui itens emprestados por itens locais disponíveis
                  </p>
                </div>
              </div>
              <Button
                onClick={checkAndSubstituteItems}
                disabled={checkingSubstitutions}
                variant="outline"
              >
                {checkingSubstitutions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Substituições
                  </>
                )}
              </Button>
            </div>
            
            <MovementNeedsTable
              needs={movementNeeds}
              onMarkAsMoved={handleMarkAsMoved}
              loading={movingItem}
            />
          </div>
        )
      ) : activeTab === "historico" ? (
        <MovementHistoryTable
          movements={globalMovementHistory}
          loading={loadingGlobalHistory}
          franchises={franchises}
          onFilter={loadGlobalMovementHistory}
        />
      ) : (
        <DeletedEquipmentTable
          arq={archived}
          franchiseNameById={franchiseNameById}
          onRestore={restoreEquipment}
          onDelete={openPermanentDeleteModal}
        />
      )}

      {equipModalOpen && (
        <Modal title="Novo equipamento" onClose={() => setEquipModalOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addEquipment();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Nome do Equipamento *</Label>
                <Select value={equipName} onValueChange={setEquipName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <div 
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEquipModalOpen(false);
                        navigate('/admin/products');
                      }}
                    >
                      <Plus className="absolute left-2 h-4 w-4" />
                      Cadastrar novo produto
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Produto (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={equipValue}
                  onChange={(e) => setEquipValue(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Valor de Locação (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={equipRentalValue}
                  onChange={(e) => setEquipRentalValue(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Código/Serial</Label>
                <Input
                  value={equipCode}
                  onChange={(e) => setEquipCode(e.target.value)}
                  placeholder="Auto-gerado se vazio"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Data de Fabricação</Label>
                <Input
                  type="date"
                  value={equipDate}
                  onChange={(e) => setEquipDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unidade *</Label>
                <Select value={equipFranchiseId} onValueChange={setEquipFranchiseId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {getFranchiseDisplayName(f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Imagem do Equipamento</Label>
                <div className="mt-1 space-y-2">
                  {equipImageUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {equipImageUrls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} className="w-20 h-20 object-cover rounded border" alt="Preview" />
                          <button
                            type="button"
                            onClick={() => removeEquipImage(idx)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-sm">{uploadingImage ? 'Enviando...' : 'Adicionar imagem'}</span>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleEquipImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEquipModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Modal>
      )}

      {editModalOpen && (
        <Modal title="Editar equipamento" onClose={() => setEditModalOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmEdit();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Nome</Label>
                <Select value={editName} onValueChange={setEditName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <div 
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditModalOpen(false);
                        navigate('/admin/products');
                      }}
                    >
                      <Plus className="absolute left-2 h-4 w-4" />
                      Cadastrar novo produto
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Produto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Valor de Locação (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editRentalValue}
                  onChange={(e) => setEditRentalValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Data de Fabricação</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={editFranchiseId} onValueChange={setEditFranchiseId} disabled={!isFranqueadora}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {getFranchiseDisplayName(f)}
                    </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Imagem do Equipamento</Label>
                <div className="mt-1 space-y-2">
                  {editImageUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {editImageUrls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} className="w-20 h-20 object-cover rounded border" alt="Preview" />
                          <button
                            type="button"
                            onClick={() => removeEditImage(idx)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-sm">{uploadingImage ? 'Enviando...' : 'Adicionar imagem'}</span>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        </Modal>
      )}

      {delModalOpen && delTarget && (
        <Modal title={`Excluir: ${delTarget.name}`} onClose={() => setDelModalOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmDelete();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Motivo</Label>
                <Select value={delReason} onValueChange={(v: any) => setDelReason(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendido">Equipamento vendido</SelectItem>
                    <SelectItem value="sucateado">Equipamento sucateado</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={delNotes}
                  onChange={(e) => setDelNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Ex.: vendido para João em 20/10, NF 123"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDelModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar exclusão
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {maintModalOpen && (
        <Modal
          title="Observação de manutenção"
          onClose={() => {
            setMaintModalOpen(false);
            setMaintEqId("");
            setMaintBlocksReservations(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMaintenanceNote();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Descreva a manutenção necessária</Label>
              <Textarea
                value={maintNote}
                onChange={(e) => setMaintNote(e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="Ex.: Troca de motor, revisão elétrica, solda no chassi..."
              />
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
              <Label className="text-sm font-medium">Tipo de Manutenção</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/80 transition-colors">
                  <input
                    type="radio"
                    name="maintType"
                    checked={!maintBlocksReservations}
                    onChange={() => setMaintBlocksReservations(false)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">🔧 Manutenção Simples</span>
                    <p className="text-xs text-muted-foreground">
                      Equipamento ainda pode ser reservado pelos vendedores
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                    Aceita Reservas
                  </Badge>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/80 transition-colors">
                  <input
                    type="radio"
                    name="maintType"
                    checked={maintBlocksReservations}
                    onChange={() => setMaintBlocksReservations(true)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">🚫 Manutenção Bloqueante</span>
                    <p className="text-xs text-muted-foreground">
                      Equipamento não aparece para os vendedores reservarem
                    </p>
                  </div>
                  <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                    Bloqueado
                  </Badge>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMaintModalOpen(false);
                  setMaintEqId("");
                  setMaintBlocksReservations(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Modal>
      )}

      {maintExitOpen && (
        <Modal
          title="Voltar para disponível"
          onClose={() => {
            setMaintExitOpen(false);
            setMaintExitEqId("");
          }}
        >
          <div className="space-y-3">
            <p className="text-sm">
              Deseja <span className="font-medium">manter</span> a observação de manutenção neste
              equipamento ao voltar para disponível ou{" "}
              <span className="font-medium text-destructive">limpar</span> a observação?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => returnFromMaintenance(true)}>
                Manter observação
              </Button>
              <Button variant="destructive" onClick={() => returnFromMaintenance(false)}>
                Limpar e voltar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {historyModalOpen && (
        <Modal
          title="📜 Histórico de Movimentações"
          onClose={() => setHistoryModalOpen(false)}
        >
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedItemHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma movimentação registrada para este equipamento.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedItemHistory.map((movement, index) => (
                <Card key={movement.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200">
                          {movement.fromFranchiseName || "Nova Entrada"}
                          {movement.fromFranchiseCity && ` - ${movement.fromFranchiseCity}`}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200">
                          {movement.toFranchiseName}
                          {movement.toFranchiseCity && ` - ${movement.toFranchiseCity}`}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        📅 {new Date(movement.movedAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      
                      {movement.notes && (
                        <div className="text-sm p-2 bg-muted rounded">
                          <p className="text-xs text-muted-foreground mb-1">Observação:</p>
                          <p>{movement.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={() => setHistoryModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </Modal>
      )}

      {permDelModalOpen && permDelTarget && (
        <Modal title="Excluir Permanentemente" onClose={() => setPermDelModalOpen(false)}>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir permanentemente o equipamento{" "}
              <strong className="text-foreground">"{permDelTarget.name}"</strong>?
            </p>
            <p className="text-sm text-destructive font-medium">
              ⚠️ Esta ação não pode ser desfeita!
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPermDelModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={permanentlyDeleteEquipment}>
                Excluir Permanentemente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Stock;
