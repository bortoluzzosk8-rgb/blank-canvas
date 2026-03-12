// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ShoppingCart, X, FileText, Receipt, MessageCircle, Download, Truck, Copy, Calendar, AlertCircle, CheckCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, BarChart3, Loader2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { ExportExcelModal, ExportFilters } from "@/components/sales/ExportExcelModal";
import { SendWhatsAppModal } from "@/components/sales/SendWhatsAppModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SalesChart } from "@/components/sales/SalesChart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getPaymentMethodLabel, buildReceiptTemplate, buildContractTemplate } from "@/lib/documentHelpers";
import Mustache from 'mustache';
import { buildPrintHtml } from "@/lib/printHtml";
import { PaymentManager, Payment } from "@/components/admin/PaymentManager";
import { PaymentStatusCell } from "@/components/admin/PaymentStatusCell";
import { QuickPaymentDrawer } from "@/components/admin/QuickPaymentDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { autoSubstituteItems } from "@/lib/autoSubstituteItems";

type SaleItem = {
  id?: string;
  product_id: string;
  product_code_id?: string;
  inventory_item_id?: string;
  product_name: string;
  quantity: number;
  unit_value: number;
  total_value: number;
};

type Sale = {
  id: string;
  sale_date: string;
  client_name: string;
  client_id?: string;
  total_value: number;
  down_payment: number;
  payment_method: string;
  installments: number;
  installment_dates: string[];
  notes?: string;
  items?: SaleItem[];
  status: 'pending' | 'delivered' | 'cancelled';
  delivery_date?: string;
  franchise_id?: string;
  
  // Campos de locação
  rental_start_date?: string;
  rental_end_date?: string;
  return_date?: string;
  return_time?: string;
  rental_type?: string;
  
  // Novos campos de entrega e monitoria
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_cep?: string;
  party_start_time?: string;
  with_monitoring?: boolean;
  monitoring_value?: number;
  monitors_quantity?: number;
  freight_value?: number;
  discount_value?: number;
  
  // Campos de rastreamento
  created_by?: string;
  created_by_name?: string;
};

type Client = {
  id: string;
  name: string;
  cpf?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
};

type Product = {
  id: string;
  name: string;
  cost_price: number;
  sale_price: number;
};

type ProductCode = {
  id: string;
  code: string;
  product_id: string;
};

type Franchise = {
  id: string;
  name: string;
  city: string;
};

type InventoryItem = {
  id: string;
  name: string;
  code: string;
  value: number;
  rental_value?: number;
  franchise_id?: string;
  status?: string;
  blocks_reservations?: boolean;
  availability?: {
    isAvailable: boolean;
    conflictingClient?: string;
    conflictingDate?: string;
    conflictingTime?: string;
    conflictingFranchise?: string;
  };
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Formata data ISO (YYYY-MM-DD) para pt-BR sem problemas de timezone
const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Chaves para persistência do rascunho no sessionStorage
const FORM_STORAGE_KEY = 'rentals_form_draft';
const ITEMS_STORAGE_KEY = 'rentals_items_draft';
const FRANCHISE_STORAGE_KEY = 'rentals_franchise_draft';

const Sales = () => {
  const navigate = useNavigate();
  const { isFranqueadora, userFranchise, user } = useAuth();
  const isFranqueado = false; // Role não existe mais, manter compatibilidade
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCodes, setAvailableCodes] = useState<ProductCode[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductCostPrice, setSelectedProductCostPrice] = useState<number>(0);
  const [salePayments, setSalePayments] = useState<any[]>([]);
  const [salesFees, setSalesFees] = useState<Record<string, number>>({});
  const [monitors, setMonitors] = useState<{id: string, name: string, phone: string, franchise_id: string | null}[]>([]);
  
  // Estado para pagamentos locais (antes de salvar a venda)
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    product_id: "",
    product_code_id: "",
    inventory_item_id: "",
    unit_value: "",
  });
  const [checkingInventory, setCheckingInventory] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowingItems, setBorrowingItems] = useState<InventoryItem[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  
  // Estado para confirmação de duplicidade
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);
  
  // Estado para prevenir dupla submissão
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para exportação Excel
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Estado para modal de WhatsApp após salvar
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [savedSaleForWhatsApp, setSavedSaleForWhatsApp] = useState<any>(null);
  
  // Estado para drawer de pagamento rápido
  const [quickPaymentSale, setQuickPaymentSale] = useState<Sale | null>(null);
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);

  const [formData, setFormData] = useState({
    id: "",
    sale_date: new Date().toISOString().split("T")[0],
    client_id: "",
    client_name: "",
    notes: "",
    payment_method: "cash",
    installments: "1",
    down_payment: "0",
    installment_dates: [] as string[],
    status: "pending" as const,
    delivery_date: "",
    
    // Campos de locação
    rental_start_date: "",
    return_date: "",
    return_time: "",
    rental_type: "diaria",
    
    // Novos campos de entrega e monitoria
    delivery_address: "",
    delivery_city: "",
    delivery_state: "",
    delivery_cep: "",
    party_start_time: "",
    with_monitoring: false,
    monitoring_value: 0,
    monitors_quantity: 0,
    monitoring_start_time: "",
    monitoring_end_time: "",
    freight_value: 0,
    discount_value: 0,
    monitor_id: "",
  });

  // Tipo para slots de monitoria
  type MonitoringSlot = {
    monitors_quantity: number;
    unit_value: number;
    start_time: string;
    end_time: string;
    monitor_id?: string;
  };

  // Estados para múltiplos turnos de monitoria
  const [monitoringSlots, setMonitoringSlots] = useState<MonitoringSlot[]>([]);
  const [currentMonitoringSlot, setCurrentMonitoringSlot] = useState<MonitoringSlot>({
    monitors_quantity: 1,
    unit_value: 0,
    start_time: "",
    end_time: "",
  });
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  const [showDocument, setShowDocument] = useState(false);
  const [documentType, setDocumentType] = useState<'receipt' | 'contract'>('receipt');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [documentClient, setDocumentClient] = useState<any>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  
  // Paginação
  const [itemsPerPage, setItemsPerPage] = useState(9999);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtros por coluna (estilo Excel)
  const [columnFilters, setColumnFilters] = useState({
    franchise: "all",
    client_name: "",
    delivery_address: "",
    delivery_city: "",
    status: "all",
    products: "",
    rental_start_date_from: "",
    rental_start_date_to: "",
    return_date_from: "",
    return_date_to: "",
    monitor: "all",
    total_value_min: "",
    total_value_max: "",
  });
  
  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: 'asc' | 'desc' | null;
  }>({ column: 'rental_start_date', direction: 'asc' });

  const isEditing = formData.id !== "";
  
  // Refs para sincronização de scroll horizontal
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Estados para drag-to-scroll
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleTopScroll = () => {
    if (tableScrollRef.current && topScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (tableScrollRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  // Handlers para drag-to-scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableScrollRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      y: e.pageY,
      scrollLeft: tableScrollRef.current.scrollLeft,
      scrollTop: tableScrollRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableScrollRef.current) return;
    e.preventDefault();
    const walkX = (e.pageX - dragStart.x) * 1.5;
    const walkY = (e.pageY - dragStart.y) * 1.5;
    tableScrollRef.current.scrollLeft = dragStart.scrollLeft - walkX;
    tableScrollRef.current.scrollTop = dragStart.scrollTop - walkY;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);
  
  // Filtrar vendas com base nos critérios de coluna
  const filteredSales = sales.filter(sale => {
    const client = clients.find(c => c.id === sale.client_id);
    
    // Franqueado só vê vendas da sua franquia
    if (isFranqueado && userFranchise && sale.franchise_id !== userFranchise.id) {
      return false;
    }
    
    // Filtro de franquia (para franqueadora)
    if (columnFilters.franchise !== "all" && sale.franchise_id !== columnFilters.franchise) {
      return false;
    }
    
    // Filtros de coluna (estilo Excel)
    if (columnFilters.client_name && 
        !sale.client_name.toLowerCase().includes(columnFilters.client_name.toLowerCase())) {
      return false;
    }
    
    if (columnFilters.delivery_address) {
      const addr = sale.delivery_address || client?.endereco || "";
      if (!addr.toLowerCase().includes(columnFilters.delivery_address.toLowerCase())) {
        return false;
      }
    }
    
    if (columnFilters.delivery_city) {
      const city = sale.delivery_city || client?.cidade || "";
      if (!city.toLowerCase().includes(columnFilters.delivery_city.toLowerCase())) {
        return false;
      }
    }
    
    if (columnFilters.status !== "all" && sale.status !== columnFilters.status) {
      return false;
    }
    
    if (columnFilters.products) {
      const productsList = sale.items?.map(item => item.product_name).join(", ") || "";
      if (!productsList.toLowerCase().includes(columnFilters.products.toLowerCase())) {
        return false;
      }
    }
    
    // Filtro de Data da Festa - se apenas "De" preenchido, filtra por data exata
    if (columnFilters.rental_start_date_from && sale.rental_start_date) {
      if (!columnFilters.rental_start_date_to) {
        // Data exata quando apenas um campo preenchido
        if (sale.rental_start_date !== columnFilters.rental_start_date_from) {
          return false;
        }
      } else {
        // Intervalo quando ambos preenchidos
        if (new Date(sale.rental_start_date) < new Date(columnFilters.rental_start_date_from)) {
          return false;
        }
      }
    }
    
    if (columnFilters.rental_start_date_to && sale.rental_start_date) {
      if (new Date(sale.rental_start_date) > new Date(columnFilters.rental_start_date_to)) {
        return false;
      }
    }
    
    // Filtro de Data de Devolução - mesma lógica
    if (columnFilters.return_date_from && sale.return_date) {
      if (!columnFilters.return_date_to) {
        if (sale.return_date !== columnFilters.return_date_from) {
          return false;
        }
      } else {
        if (new Date(sale.return_date) < new Date(columnFilters.return_date_from)) {
          return false;
        }
      }
    }
    
    if (columnFilters.return_date_to && sale.return_date) {
      if (new Date(sale.return_date) > new Date(columnFilters.return_date_to)) {
        return false;
      }
    }
    
    if (columnFilters.monitor !== "all") {
      const hasMonitor = sale.with_monitoring;
      if (columnFilters.monitor === "yes" && !hasMonitor) return false;
      if (columnFilters.monitor === "no" && hasMonitor) return false;
    }
    
    if (columnFilters.total_value_min && sale.total_value < Number(columnFilters.total_value_min)) {
      return false;
    }
    
    if (columnFilters.total_value_max && sale.total_value > Number(columnFilters.total_value_max)) {
      return false;
    }
    
    return true;
  });
  
  // Função de ordenação
  const sortedFilteredSales = [...filteredSales].sort((a, b) => {
    if (!sortConfig.column || !sortConfig.direction) {
      // Ordenação padrão por rental_start_date crescente
      const dateA = a.rental_start_date ? new Date(a.rental_start_date).getTime() : 0;
      const dateB = b.rental_start_date ? new Date(b.rental_start_date).getTime() : 0;
      return dateA - dateB;
    }
    
    const clientA = clients.find(c => c.id === a.client_id);
    const clientB = clients.find(c => c.id === b.client_id);
    
    let comparison = 0;
    
    switch (sortConfig.column) {
      case 'franchise':
        const franchiseA = franchiseMap[a.franchise_id || '']?.name || '';
        const franchiseB = franchiseMap[b.franchise_id || '']?.name || '';
        comparison = franchiseA.localeCompare(franchiseB);
        break;
      case 'client_name':
        comparison = a.client_name.localeCompare(b.client_name);
        break;
      case 'delivery_city':
        const cityA = a.delivery_city || clientA?.cidade || '';
        const cityB = b.delivery_city || clientB?.cidade || '';
        comparison = cityA.localeCompare(cityB);
        break;
      case 'rental_start_date':
        const dateA = a.rental_start_date ? new Date(a.rental_start_date).getTime() : 0;
        const dateB = b.rental_start_date ? new Date(b.rental_start_date).getTime() : 0;
        comparison = dateA - dateB;
        break;
      case 'return_date':
        const returnA = a.return_date ? new Date(a.return_date).getTime() : 0;
        const returnB = b.return_date ? new Date(b.return_date).getTime() : 0;
        comparison = returnA - returnB;
        break;
      case 'total_value':
        comparison = a.total_value - b.total_value;
        break;
      case 'monitoring_value':
        comparison = (a.monitoring_value || 0) - (b.monitoring_value || 0);
        break;
      case 'freight_value':
        comparison = (a.freight_value || 0) - (b.freight_value || 0);
        break;
      case 'card_fee':
        comparison = (salesFees[a.id] || 0) - (salesFees[b.id] || 0);
        break;
    }
    
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
  
  // Função para alternar ordenação
  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column: 'rental_start_date', direction: 'desc' };
      }
      return { column, direction: 'asc' };
    });
  };
  
  // Ícone de ordenação
  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="w-3 h-3 ml-1" />;
    }
    return <ArrowDown className="w-3 h-3 ml-1" />;
  };
  
  // Paginação
  const totalPages = Math.ceil(sortedFilteredSales.length / itemsPerPage);
  const paginatedSales = itemsPerPage === 9999 
    ? sortedFilteredSales 
    : sortedFilteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );
  
  // Criar mapa de franquias
  const franchiseMap = franchises.reduce((acc, f) => {
    acc[f.id] = f;
    return acc;
  }, {} as Record<string, Franchise>);

  const fetchMonitors = async () => {
    try {
      // Filtrar monitores pelo tenant do usuário
      const franchiseIds = franchises.map(f => f.id);
      
      if (franchiseIds.length === 0) {
        setMonitors([]);
        return;
      }
      
      const { data } = await supabase
        .from("monitors")
        .select("id, name, phone, franchise_id")
        .in("franchise_id", franchiseIds)
        .order("name");
      setMonitors(data || []);
    } catch (error) {
      console.error("Error fetching monitors:", error);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchClients();
    fetchProducts();
    fetchFranchises();
    fetchSettings();
  }, []);

  // Buscar monitores quando as franquias forem carregadas
  useEffect(() => {
    if (franchises.length > 0) {
      fetchMonitors();
    }
  }, [franchises]);

  // Auto-selecionar franquia do franqueado
  useEffect(() => {
    if (isFranqueado && userFranchise && !selectedFranchiseId) {
      setSelectedFranchiseId(userFranchise.id);
    }
  }, [isFranqueado, userFranchise, selectedFranchiseId]);

  // Restaurar rascunho do sessionStorage ao montar o componente
  useEffect(() => {
    const savedForm = sessionStorage.getItem(FORM_STORAGE_KEY);
    const savedItems = sessionStorage.getItem(ITEMS_STORAGE_KEY);
    const savedFranchise = sessionStorage.getItem(FRANCHISE_STORAGE_KEY);
    
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        // Só restaura se não for uma edição em andamento (id vazio)
        if (parsed.id === '') {
          setFormData(parsed);
        }
      } catch (e) {
        console.error('Erro ao restaurar formData:', e);
      }
    }
    
    if (savedItems) {
      try {
        const items = JSON.parse(savedItems);
        if (items.length > 0) {
          setSaleItems(items);
        }
      } catch (e) {
        console.error('Erro ao restaurar saleItems:', e);
      }
    }
    
    if (savedFranchise && !isFranqueado) {
      setSelectedFranchiseId(savedFranchise);
    }
  }, []); // Apenas no mount

  // Salvar formData no sessionStorage quando mudar (apenas para novos rascunhos)
  useEffect(() => {
    if (formData.id === '') {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  // Salvar saleItems no sessionStorage quando mudar
  useEffect(() => {
    if (formData.id === '') {
      sessionStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(saleItems));
    }
  }, [saleItems, formData.id]);

  // Salvar franquia selecionada
  useEffect(() => {
    if (formData.id === '' && selectedFranchiseId) {
      sessionStorage.setItem(FRANCHISE_STORAGE_KEY, selectedFranchiseId);
    }
  }, [selectedFranchiseId, formData.id]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar settings:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const { data: salesData, error } = await supabase
        .from("sales")
        .select(`
          *,
          items:sale_items(*),
          monitoringSlots:sale_monitoring_slots(*)
        `)
        .order("rental_start_date", { ascending: true });

      if (error) throw error;
      
      const formattedSales = (salesData || []).map(sale => ({
        ...sale,
        installment_dates: Array.isArray(sale.installment_dates) ? sale.installment_dates : [],
        down_payment: sale.down_payment || 0,
      })) as Sale[];
      
      setSales(formattedSales);
      
      // Buscar taxas de cartão por venda
      const { data: feesData } = await supabase
        .from('sale_payments')
        .select('sale_id, card_fee');
      
      const feesBySale: Record<string, number> = {};
      feesData?.forEach(p => {
        if (p.card_fee) {
          feesBySale[p.sale_id] = (feesBySale[p.sale_id] || 0) + Number(p.card_fee);
        }
      });
      setSalesFees(feesBySale);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("is_client", true)
        .order("name");
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    }
  };

  const fetchClientDetails = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching client details:", error);
      return null;
    }
  };

  const fetchProducts = async () => {
    try {
      // Buscar nomes distintos no inventário (já filtrado por RLS)
      const { data: inventoryNames } = await supabase
        .from("inventory_items")
        .select("name");
      
      const uniqueNames = [...new Set((inventoryNames || []).map(i => i.name))];
      
      if (uniqueNames.length === 0) {
        setProducts([]);
        return;
      }

      // Buscar apenas produtos que existem no inventário
      const { data, error } = await supabase
        .from("products")
        .select("id, name, cost_price, sale_price")
        .in("name", uniqueNames)
        .order("name");
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const fetchFranchises = async () => {
    try {
      // Buscar a franquia raiz do usuário logado
      const { data: userFranchiseData } = await supabase
        .from("user_franchises")
        .select("franchise_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!userFranchiseData?.franchise_id) {
        setFranchises([]);
        return;
      }

      const rootFranchiseId = userFranchiseData.franchise_id;

      // Buscar a franquia raiz + unidades filhas (isolamento multi-tenant)
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
    }
  };

  const checkInventoryAvailability = async (productName: string, franchiseId: string) => {
    if (!productName || !franchiseId || !formData.rental_start_date || !formData.return_date) {
      setAvailableInventory([]);
      setCheckingInventory(false);
      return;
    }

    setCheckingInventory(true);

    try {
      // Buscar todos os inventory_items da franquia e de outras franquias
      // Inclui itens disponíveis e itens em manutenção simples (que aceitam reservas)
      const { data: allItems, error: itemsError } = await supabase
        .from("inventory_items")
        .select("id, name, code, value, rental_value, franchise_id, status, blocks_reservations")
        .or('status.eq.disponivel,and(status.eq.manutencao,blocks_reservations.eq.false)')
        .ilike("name", `%${productName.trim()}%`);
      
      if (itemsError) throw itemsError;
      
      if (!allItems || allItems.length === 0) {
        setAvailableInventory([]);
        return;
      }

      // Para cada item, verificar disponibilidade usando a função SQL
      const itemsWithAvailability = await Promise.all(
        allItems.map(async (item) => {
          const { data: availData, error: availError } = await supabase.rpc(
            'check_item_availability',
            {
              p_inventory_item_id: item.id,
              p_rental_start_date: formData.rental_start_date,
              p_party_start_time: formData.party_start_time || null,
              p_return_date: formData.return_date,
              p_exclude_sale_id: formData.id || null
            }
          );

          if (availError) {
            console.error("Error checking availability:", availError);
            return {
              ...item,
              availability: { isAvailable: true }
            };
          }

          const result = availData?.[0];
          
          return {
            ...item,
            availability: {
              isAvailable: result?.is_available || false,
              conflictingClient: result?.conflicting_client_name,
              conflictingDate: result?.conflicting_start_date,
              conflictingTime: result?.conflicting_party_time,
              conflictingFranchise: result?.conflicting_franchise_name && result?.conflicting_franchise_city
                ? `${result.conflicting_franchise_name} - ${result.conflicting_franchise_city}`
                : undefined
            }
          };
        })
      );

      // Ordenar: disponíveis da franquia > disponíveis de outras > indisponíveis
      const sorted = itemsWithAvailability.sort((a, b) => {
        const aFromFranchise = a.franchise_id === franchiseId;
        const bFromFranchise = b.franchise_id === franchiseId;
        const aAvailable = a.availability?.isAvailable;
        const bAvailable = b.availability?.isAvailable;

        if (aAvailable && aFromFranchise && !(bAvailable && bFromFranchise)) return -1;
        if (bAvailable && bFromFranchise && !(aAvailable && aFromFranchise)) return 1;
        if (aAvailable && !aFromFranchise && !(bAvailable && !bFromFranchise)) return -1;
        if (bAvailable && !bFromFranchise && !(aAvailable && !aFromFranchise)) return 1;
        return 0;
      });

      setAvailableInventory(sorted);
    } catch (error) {
      console.error("Error checking inventory:", error);
      setAvailableInventory([]);
    } finally {
      setCheckingInventory(false);
    }
  };

  const fetchAvailableCodes = async (productId: string) => {
    if (!productId) {
      setAvailableCodes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("product_codes")
        .select("id, code, product_id")
        .eq("product_id", productId)
        .eq("status", "available")
        .order("code");
      
      if (error) throw error;
      setAvailableCodes(data || []);
    } catch (error) {
      console.error("Error fetching available codes:", error);
      toast.error("Erro ao carregar códigos disponíveis");
    }
  };

  const calculateSaleTotal = () => {
    const itemsTotal = saleItems.reduce((sum, item) => sum + item.total_value, 0);
    const freightValue = Number(formData.freight_value) || 0;
    // Use o total dos slots de monitoria se houver, senão use o valor antigo (compatibilidade)
    const monitoringTotal = monitoringSlots.length > 0 
      ? monitoringSlots.reduce((sum, slot) => sum + (slot.monitors_quantity * slot.unit_value), 0)
      : (Number(formData.monitors_quantity) || 0) * (Number(formData.monitoring_value) || 0);
    const discountValue = Number(formData.discount_value) || 0;
    
    return Math.max(0, itemsTotal + freightValue + monitoringTotal - discountValue);
  };

  // Funções para gerenciar slots de monitoria
  const handleAddMonitoringSlot = () => {
    if (currentMonitoringSlot.monitors_quantity <= 0) {
      toast.error("Informe a quantidade de monitores");
      return;
    }
    if (currentMonitoringSlot.unit_value <= 0) {
      toast.error("Informe o valor unitário");
      return;
    }
    if (!currentMonitoringSlot.start_time || !currentMonitoringSlot.end_time) {
      toast.error("Informe os horários de início e término");
      return;
    }
    
    const newSlot: MonitoringSlot = {
      ...currentMonitoringSlot,
      monitor_id: formData.monitor_id || undefined,
    };
    
    if (editingSlotIndex !== null) {
      // Modo edição: atualizar slot existente
      const updatedSlots = [...monitoringSlots];
      updatedSlots[editingSlotIndex] = newSlot;
      setMonitoringSlots(updatedSlots);
      setEditingSlotIndex(null);
      toast.success("Turno de monitoria atualizado");
    } else {
      // Modo adição: criar novo slot
      setMonitoringSlots([...monitoringSlots, newSlot]);
      toast.success("Turno de monitoria adicionado");
    }
    
    // Limpar formulário
    setCurrentMonitoringSlot({
      monitors_quantity: 1,
      unit_value: 0,
      start_time: "",
      end_time: "",
    });
    setFormData({ ...formData, monitor_id: "" });
  };

  const handleEditMonitoringSlot = (index: number) => {
    const slot = monitoringSlots[index];
    setCurrentMonitoringSlot({
      monitors_quantity: slot.monitors_quantity,
      unit_value: slot.unit_value,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    setFormData({ ...formData, monitor_id: slot.monitor_id || "" });
    setEditingSlotIndex(index);
  };

  const handleRemoveMonitoringSlot = (index: number) => {
    setMonitoringSlots(monitoringSlots.filter((_, i) => i !== index));
    // Se estava editando este slot, cancelar edição
    if (editingSlotIndex === index) {
      setEditingSlotIndex(null);
      setCurrentMonitoringSlot({
        monitors_quantity: 1,
        unit_value: 0,
        start_time: "",
        end_time: "",
      });
      setFormData({ ...formData, monitor_id: "" });
    } else if (editingSlotIndex !== null && editingSlotIndex > index) {
      // Ajustar índice se removeu um slot anterior ao que estava sendo editado
      setEditingSlotIndex(editingSlotIndex - 1);
    }
    toast.success("Turno de monitoria removido");
  };

  const calculateInstallmentAmount = () => {
    const total = calculateSaleTotal();
    const downPayment = Number(formData.down_payment) || 0;
    return Math.max(0, total - downPayment);
  };

  const calculateProfit = () => {
    const unitValue = Number(currentItem.unit_value) || 0;
    const costPrice = selectedProductCostPrice;
    
    if (costPrice === 0) return { profit: 0, percentage: 0 };
    
    const profit = unitValue - costPrice;
    const percentage = ((profit / costPrice) * 100);
    
    return { profit, percentage };
  };

  const handleAddItemToSale = () => {
    if (!currentItem.inventory_item_id || !currentItem.unit_value) {
      toast.error("Selecione um item do estoque e preencha o valor");
      return;
    }

    // Verificar se o item já foi adicionado
    const itemAlreadyAdded = saleItems.some(
      item => item.inventory_item_id === currentItem.inventory_item_id
    );

    if (itemAlreadyAdded) {
      toast.error("Este item já foi adicionado à locação");
      return;
    }

    const selectedInventoryItem = availableInventory.find(i => i.id === currentItem.inventory_item_id);
    const selectedProduct = products.find(p => p.id === currentItem.product_id);
    const unitValue = Number(currentItem.unit_value);
    
    // Verificar se o item é de outra franquia
    const isDifferentFranchise = selectedInventoryItem?.franchise_id !== selectedFranchiseId;
    
    if (isDifferentFranchise && selectedInventoryItem?.availability?.isAvailable) {
      // Adicionar à lista de itens que precisam de confirmação
      const itemsNeedingConfirmation = [...saleItems.filter(i => {
        const invItem = availableInventory.find(inv => inv.id === i.inventory_item_id);
        return invItem?.franchise_id !== selectedFranchiseId;
      }), selectedInventoryItem];
      
      setBorrowingItems(itemsNeedingConfirmation);
    }
    
    const newItem: SaleItem = {
      product_id: currentItem.product_id,
      inventory_item_id: currentItem.inventory_item_id,
      product_name: selectedProduct?.name || selectedInventoryItem?.name || "",
      quantity: 1,
      unit_value: unitValue,
      total_value: unitValue,
    };

    setSaleItems([...saleItems, newItem]);
    
    setCurrentItem({
      product_id: "",
      product_code_id: "",
      inventory_item_id: "",
      unit_value: "",
    });
    setAvailableCodes([]);
    setSelectedProductCostPrice(0);
    
    toast.success("Item adicionado à locação");
  };

  const handleRemoveItemFromSale = (index: number) => {
    const newItems = saleItems.filter((_, i) => i !== index);
    setSaleItems(newItems);
    toast.success("Produto removido");
  };

  // Função para verificar reserva duplicada
  const checkDuplicateRental = async (
    clientId: string,
    rentalDate: string,
    productNames: string[],
    excludeSaleId?: string
  ): Promise<{ isDuplicate: boolean; existingSaleId?: string }> => {
    if (!clientId || !rentalDate || productNames.length === 0) {
      return { isDuplicate: false };
    }

    // Buscar vendas do mesmo cliente e mesma data
    let query = supabase
      .from("sales")
      .select(`
        id,
        client_id,
        rental_start_date,
        delivery_date,
        sale_items!inner(product_name)
      `)
      .eq("client_id", clientId)
      .neq("status", "cancelled");

    // Excluir a própria venda ao editar
    if (excludeSaleId) {
      query = query.neq("id", excludeSaleId);
    }

    const { data: existingSales } = await query;

    if (!existingSales || existingSales.length === 0) {
      return { isDuplicate: false };
    }

    // Filtrar por data (rental_start_date ou delivery_date)
    const salesOnSameDate = existingSales.filter(sale => 
      sale.rental_start_date === rentalDate || sale.delivery_date === rentalDate
    );

    if (salesOnSameDate.length === 0) {
      return { isDuplicate: false };
    }

    // Verificar se algum brinquedo (pelo nome) já está reservado nessas vendas
    for (const sale of salesOnSameDate) {
      const existingProductNames = sale.sale_items
        .map((item: any) => item.product_name?.toLowerCase().trim())
        .filter(Boolean);
      
      const duplicateItems = productNames.filter(name => 
        existingProductNames.includes(name.toLowerCase().trim())
      );

      if (duplicateItems.length > 0) {
        return { isDuplicate: true, existingSaleId: sale.id };
      }
    }

    return { isDuplicate: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir dupla submissão
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!selectedFranchiseId) {
      toast.error("Selecione a unidade que vai atender");
      setIsSubmitting(false);
      return;
    }

    if (saleItems.length === 0) {
      toast.error("Adicione pelo menos um item à locação");
      setIsSubmitting(false);
      return;
    }




    // Validar horário de retirada quando no mesmo dia da festa
    if (formData.rental_start_date && formData.return_date && 
        formData.rental_start_date === formData.return_date &&
        formData.party_start_time && formData.return_time) {
      if (formData.return_time < formData.party_start_time) {
        toast.error("O horário de retirada não pode ser antes do horário de início da festa quando são no mesmo dia");
        setIsSubmitting(false);
        return;
      }
    }

    // Verificar se há itens de outras franquias
    const itemsFromOtherFranchises = saleItems.filter(item => {
      const invItem = availableInventory.find(i => i.id === item.inventory_item_id);
      return invItem && invItem.franchise_id !== selectedFranchiseId;
    });

    if (itemsFromOtherFranchises.length > 0 && !showBorrowModal) {
      const itemsWithDetails = itemsFromOtherFranchises.map(item => {
        const invItem = availableInventory.find(i => i.id === item.inventory_item_id);
        return invItem;
      }).filter(Boolean) as InventoryItem[];
      
      setBorrowingItems(itemsWithDetails);
      setShowBorrowModal(true);
      setIsSubmitting(false);
      return;
    }

    if (!formData.client_id) {
      toast.error("Selecione um cliente");
      setIsSubmitting(false);
      return;
    }

    // Verificar duplicidade de reserva (mesmo cliente, data e nome do brinquedo)
    const rentalDate = formData.rental_start_date || formData.delivery_date;
    const productNames = saleItems
      .map(item => item.product_name)
      .filter(Boolean) as string[];

    if (rentalDate && productNames.length > 0 && !skipDuplicateCheck) {
      const duplicate = await checkDuplicateRental(
        formData.client_id,
        rentalDate,
        productNames,
        isEditing ? formData.id : undefined
      );

      if (duplicate.isDuplicate) {
        setShowDuplicateWarning(true);
        setIsSubmitting(false);
        return;
      }
    }
    
    // Resetar flag de skip após uso
    if (skipDuplicateCheck) {
      setSkipDuplicateCheck(false);
    }

    const downPayment = Number(formData.down_payment) || 0;
    const totalValue = calculateSaleTotal();
    
    if (downPayment > totalValue) {
      toast.error("Entrada não pode ser maior que o valor total");
      setIsSubmitting(false);
      return;
    }

    if (formData.payment_method === 'boleto' && formData.installments !== '1') {
      const hasMissingDates = formData.installment_dates.some(date => !date);
      if (hasMissingDates) {
        toast.error("Preencha todas as datas de vencimento do boleto");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      
      const saleData: any = {
        sale_date: formData.sale_date,
        client_id: formData.client_id,
        client_name: selectedClient?.name || formData.client_name,
        total_value: totalValue,
        down_payment: downPayment,
        notes: formData.notes || null,
        payment_method: formData.payment_method,
        installments: Number(formData.installments),
        installment_dates: formData.payment_method === 'boleto' && formData.installments !== '1'
          ? formData.installment_dates 
          : [],
        status: formData.status,
        delivery_date: formData.delivery_date || null,
        franchise_id: selectedFranchiseId,
        
        // Campos de locação
        rental_start_date: formData.rental_start_date || null,
        return_date: formData.return_date || null,
        return_time: formData.return_time || null,
        rental_type: formData.rental_type || 'diaria',
        
        // Campos de entrega e monitoria
        delivery_address: formData.delivery_address || null,
        delivery_city: formData.delivery_city || null,
        delivery_state: formData.delivery_state || null,
        delivery_cep: formData.delivery_cep || null,
        party_start_time: formData.party_start_time || null,
        with_monitoring: formData.with_monitoring || false,
        monitoring_value: formData.monitoring_value || 0,
        monitors_quantity: formData.monitors_quantity || 0,
        monitoring_start_time: formData.monitoring_start_time || null,
        monitoring_end_time: formData.monitoring_end_time || null,
        freight_value: formData.freight_value || 0,
        discount_value: formData.discount_value || 0,
        monitor_id: formData.monitor_id || null,
      };

      let saleId = formData.id;

      if (isEditing) {
        // Buscar status anterior para verificar se mudou para cancelled
        const { data: previousSale } = await supabase
          .from("sales")
          .select("status, franchise_id")
          .eq("id", formData.id)
          .single();

        const { error } = await supabase
          .from("sales")
          .update(saleData)
          .eq("id", formData.id);

        if (error) throw error;

        // Se status mudou para cancelled, verificar substituições automaticamente
        if (previousSale?.status !== "cancelled" && saleData.status === "cancelled") {
          autoSubstituteItems({
            silent: true,
            franchiseId: previousSale?.franchise_id || selectedFranchiseId,
          });
        }

        await supabase
          .from("sale_items")
          .delete()
          .eq("sale_id", formData.id);

      } else {
        // Buscar nome do usuário logado
        let createdByName = user?.email || 'Usuário não identificado';
        if (user?.id) {
          const { data: userData } = await supabase
            .from('user_franchises')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (userData?.name) {
            createdByName = userData.name;
          }
        }
        
        const { data: saleResult, error } = await supabase
          .from("sales")
          .insert({
            ...saleData,
            created_by: user?.id || null,
            created_by_name: createdByName,
          })
          .select()
          .single();

        if (error) throw error;
        saleId = saleResult.id;
      }

      const itemsToInsert = saleItems.map(item => ({
        sale_id: saleId,
        product_id: item.product_id,
        product_code_id: item.product_code_id,
        inventory_item_id: item.inventory_item_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_value: item.unit_value,
        total_value: item.total_value,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Deletar slots de monitoria existentes se estiver editando
      if (isEditing) {
        await supabase
          .from("sale_monitoring_slots")
          .delete()
          .eq("sale_id", saleId);
      }

      // Inserir novos slots de monitoria
      if (monitoringSlots.length > 0) {
        const monitoringSlotsToInsert = monitoringSlots.map(slot => ({
          sale_id: saleId,
          monitors_quantity: slot.monitors_quantity,
          unit_value: slot.unit_value,
          total_value: slot.monitors_quantity * slot.unit_value,
          start_time: slot.start_time,
          end_time: slot.end_time,
          monitor_id: slot.monitor_id || null,
        }));

        const { error: monitoringError } = await supabase
          .from("sale_monitoring_slots")
          .insert(monitoringSlotsToInsert);

        if (monitoringError) throw monitoringError;
      }

      // Atualizar status dos códigos apenas se houver códigos e status for 'delivered'
      const codeIdsToUpdate = saleItems
        .map(item => item.product_code_id)
        .filter(id => id); // Remove undefined

      if (formData.status === 'delivered' && codeIdsToUpdate.length > 0) {
        const { error: codesError } = await supabase
          .from('product_codes')
          .update({ 
            status: 'sold',
            sale_id: saleId 
          })
          .in('id', codeIdsToUpdate);

        if (codesError) throw codesError;
      } else if (formData.status === 'pending' && codeIdsToUpdate.length > 0) {
        // Marcar códigos como 'reserved' apenas para pedidos pendentes
        const { error: reserveError } = await supabase
          .from('product_codes')
          .update({ 
            status: 'reserved',
            sale_id: saleId 
          })
          .in('id', codeIdsToUpdate);

        if (reserveError) throw reserveError;
      }

      // Salvar pagamentos pendentes (adicionados antes de salvar a venda)
      if (pendingPayments.length > 0 && saleId) {
        for (const p of pendingPayments) {
          // Inserir pagamento
          const { data: insertedPayment, error: insertError } = await supabase
            .from('sale_payments')
            .insert({
              sale_id: saleId,
              payment_type: p.payment_type,
              payment_method: p.payment_method,
              amount: p.amount,
              installments: p.installments,
              notes: p.notes || null,
              received_by: p.received_by,
              status: p.status,
              card_fee: p.card_fee || 0,
              payment_date: p.payment_date || null,
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Erro ao inserir pagamento:', insertError);
            continue;
          }
          
          // Se tem comprovante local, fazer upload
          if (p.localReceiptFile && insertedPayment) {
            const fileExt = p.localReceiptFile.name.split('.').pop();
            const fileName = `${insertedPayment.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('payment-receipts')
              .upload(fileName, p.localReceiptFile);
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('payment-receipts')
                .getPublicUrl(fileName);
              
              await supabase
                .from('sale_payments')
                .update({ receipt_url: publicUrl })
                .eq('id', insertedPayment.id);
            } else {
              console.error('Erro ao fazer upload do comprovante:', uploadError);
            }
          }
        }
      }

      toast.success(isEditing ? "Venda atualizada com sucesso" : "Venda registrada com sucesso");
      
      // Após criar nova venda, abrir modal de WhatsApp
      if (!isEditing && saleId) {
        const selectedClient = clients.find(c => c.id === formData.client_id);
        setSavedSaleForWhatsApp({
          id: saleId,
          client_name: selectedClient?.name || formData.client_name,
          client_phone: selectedClient?.phone || null,
          rental_start_date: formData.rental_start_date,
          party_start_time: formData.party_start_time,
          return_time: formData.return_time,
          delivery_address: formData.delivery_address,
          delivery_city: formData.delivery_city,
          total_value: calculateSaleTotal(),
          items: saleItems.map(item => ({ product_name: item.product_name })),
          monitoringSlots: monitoringSlots.map(slot => ({
            monitors_quantity: slot.monitors_quantity,
            start_time: slot.start_time,
            end_time: slot.end_time,
          })),
        });
        setShowWhatsAppModal(true);
      }
      
      resetForm();
      fetchSales();

    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Erro ao salvar venda");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (sale: Sale) => {
    setFormData({
      id: sale.id,
      sale_date: sale.sale_date,
      client_id: sale.client_id || "",
      client_name: sale.client_name,
      notes: sale.notes || "",
      payment_method: sale.payment_method || "cash",
      installments: String(sale.installments || 1),
      down_payment: String(sale.down_payment || 0),
      status: sale.status || "pending",
      delivery_date: sale.delivery_date || "",
      installment_dates: sale.installment_dates || [],
      
      // Campos de locação
      rental_start_date: sale.rental_start_date || "",
      return_date: sale.return_date || "",
      return_time: sale.return_time || "",
      rental_type: (sale as any).rental_type || "diaria",
      
      // Campos de entrega e monitoria
      delivery_address: sale.delivery_address || "",
      delivery_city: sale.delivery_city || "",
      delivery_state: sale.delivery_state || "",
      delivery_cep: sale.delivery_cep || "",
      party_start_time: sale.party_start_time || "",
      with_monitoring: sale.with_monitoring || false,
      monitoring_value: sale.monitoring_value || 0,
      monitors_quantity: sale.monitors_quantity || 0,
      freight_value: sale.freight_value || 0,
      discount_value: (sale as any).discount_value || 0,
      monitor_id: (sale as any).monitor_id || "",
    });
    
    setSelectedFranchiseId((sale as any).franchise_id || "");
    
    // Limpar pagamentos pendentes ao editar uma venda existente
    // (os pagamentos serão carregados do banco pelo PaymentManager)
    setPendingPayments([]);

    if (sale.items && sale.items.length > 0) {
      setSaleItems(sale.items);
    }

    // Carregar turnos de monitoria existentes
    if (sale.monitoringSlots && sale.monitoringSlots.length > 0) {
      // Vendas novas: carregar slots da tabela sale_monitoring_slots
      setMonitoringSlots(sale.monitoringSlots.map(slot => ({
        monitors_quantity: slot.monitors_quantity,
        unit_value: slot.unit_value,
        start_time: slot.start_time || "",
        end_time: slot.end_time || "",
        monitor_id: slot.monitor_id || undefined,
      })));
    } else if (sale.monitors_quantity && sale.monitors_quantity > 0) {
      // Vendas antigas: criar slot "legado" com dados da tabela sales
      const unitValue = sale.monitoring_value && sale.monitors_quantity 
        ? sale.monitoring_value / sale.monitors_quantity 
        : 0;
      setMonitoringSlots([{
        monitors_quantity: sale.monitors_quantity,
        unit_value: unitValue,
        start_time: sale.party_start_time || "",
        end_time: "",
      }]);
    } else {
      // Sem monitoria
      setMonitoringSlots([]);
    }
    // Resetar estado de edição de slot
    setEditingSlotIndex(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMarkAsDelivered = async (saleId: string) => {
    try {
      // Buscar itens da venda para verificar se todos têm código
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('sales')
        .update({ 
          status: 'delivered',
          delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', saleId);

      if (error) throw error;

      // Atualizar status dos códigos para 'sold'
      const codeIds = saleItems?.map(item => item.product_code_id).filter(Boolean) || [];
      
      if (codeIds.length > 0) {
        const { error: codesError } = await supabase
          .from('product_codes')
          .update({ status: 'sold' })
          .in('id', codeIds);

        if (codesError) throw codesError;
      }

      toast.success("✅ Venda marcada como entregue e estoque atualizado!");
      fetchSales();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda?")) {
      return;
    }

    try {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_code_id")
        .eq("sale_id", id);

      if (saleItems) {
        for (const item of saleItems) {
          await supabase
            .from("product_codes")
            .update({ status: "available", sale_id: null })
            .eq("id", item.product_code_id);
        }
      }

      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Venda excluída com sucesso");
      fetchSales();
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Erro ao excluir venda");
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      sale_date: new Date().toISOString().split("T")[0],
      client_id: "",
      client_name: "",
      notes: "",
      payment_method: "cash",
      installments: "1",
      down_payment: "0",
      installment_dates: [],
      status: "pending",
      delivery_date: "",
      
      // Campos de locação
      rental_start_date: "",
      return_date: "",
      return_time: "",
      rental_type: "diaria",
      
      // Campos de entrega e monitoria
      delivery_address: "",
      delivery_city: "",
      delivery_state: "",
      delivery_cep: "",
      party_start_time: "",
      with_monitoring: false,
      monitoring_value: 0,
      monitors_quantity: 0,
      freight_value: 0,
      discount_value: 0,
      monitor_id: "",
    });
    setMonitoringSlots([]);
    setCurrentMonitoringSlot({
      monitors_quantity: 1,
      unit_value: 0,
      start_time: "",
      end_time: "",
    });
    setSaleItems([]);
    setCurrentItem({
      product_id: "",
      product_code_id: "",
      unit_value: "",
    });
    setAvailableCodes([]);
    setAvailableInventory([]);
    setSelectedFranchiseId("");
    setSelectedProductCostPrice(0);
    setPendingPayments([]);
    
    // Limpar rascunho do sessionStorage
    sessionStorage.removeItem(FORM_STORAGE_KEY);
    sessionStorage.removeItem(ITEMS_STORAGE_KEY);
    sessionStorage.removeItem(FRANCHISE_STORAGE_KEY);
  };

  const handleGenerateReceipt = async (sale: Sale) => {
    setSelectedSale(sale);
    setDocumentType('receipt');
    
    if (sale.client_id) {
      const clientDetails = await fetchClientDetails(sale.client_id);
      setDocumentClient(clientDetails || { id: '', name: sale.client_name });
    } else {
      setDocumentClient({ id: '', name: sale.client_name });
    }
    
    setShowDocument(true);
  };

  const handleGenerateContract = async (sale: Sale) => {
    setSelectedSale(sale);
    setDocumentType('contract');
    
    if (sale.client_id) {
      const clientDetails = await fetchClientDetails(sale.client_id);
      setDocumentClient(clientDetails || { id: '', name: sale.client_name });
    } else {
      setDocumentClient({ id: '', name: sale.client_name });
    }
    
    setShowDocument(true);
  };

  const generateDocumentContent = async () => {
    if (!selectedSale) return '';
    
    // Buscar settings para obter as cores
    const { data: settingsData } = await supabase
      .from('settings')
      .select('primary_color, secondary_color, company_signature_url')
      .limit(1)
      .maybeSingle();
    
    // Buscar dados da franquia da venda para usar como LOCADOR
    let saleFranchise: { name?: string; cnpj?: string; address?: string; city?: string; state?: string; cep?: string; phone?: string; email?: string } | null = null;
    if (selectedSale.franchise_id) {
      const { data: franchiseData } = await supabase
        .from('franchises')
        .select('name, cnpj, address, city, state, cep, phone, email')
        .eq('id', selectedSale.franchise_id)
        .maybeSingle();
      saleFranchise = franchiseData;
    }
    
    const primaryColor = settingsData?.primary_color || '#8B5CF6';
    const secondaryColor = settingsData?.secondary_color || '#EC4899';
    const signatureUrl = settingsData?.company_signature_url || undefined;
    
    const template = documentType === 'receipt' 
      ? buildReceiptTemplate(
          settings.receipt_title || '🧾 RECIBO DE VENDA',
          settings.receipt_notes || '',
          primaryColor,
          secondaryColor,
          signatureUrl
        )
      : buildContractTemplate(
          settings.contract_title || '📄 CONTRATO DE LOCAÇÃO',
          settings.contract_clauses || '',
          primaryColor,
          secondaryColor,
          signatureUrl
        );
    
    // Buscar itens da venda
    const saleItemsData = selectedSale.items || [];
    
    // Buscar turnos de monitoria da venda
    const { data: monitoringSlotsData } = await supabase
      .from('sale_monitoring_slots')
      .select('*')
      .eq('sale_id', selectedSale.id);
    
    const monitoringSlots = monitoringSlotsData || [];
    
    // Preparar array de produtos no formato correto para Mustache
    const products: Array<{
      number: number;
      name: string;
      code: string;
      quantity: number;
      unitValue: string;
      totalValue: string;
    }> = saleItemsData.map((item, index) => ({
      number: index + 1,
      name: item.product_name,
      code: item.product_code_id?.slice(0, 8) || 'SEM CÓDIGO',
      quantity: item.quantity,
      unitValue: formatCurrency(item.unit_value).replace('R$', '').trim(),
      totalValue: formatCurrency(item.total_value).replace('R$', '').trim()
    }));
    
    // Adicionar turnos de monitoria como itens da tabela
    monitoringSlots.forEach((slot) => {
      products.push({
        number: products.length + 1,
        name: `Monitoria (${slot.start_time || '00:00'} - ${slot.end_time || '00:00'})`,
        code: 'MONITORIA',
        quantity: slot.monitors_quantity,
        unitValue: formatCurrency(slot.unit_value).replace('R$', '').trim(),
        totalValue: formatCurrency(slot.total_value).replace('R$', '').trim()
      });
    });
    
    // Preparar array de parcelas no formato correto
    const installmentDates = (selectedSale.installment_dates as string[] || []).map((date, index) => ({
      number: index + 1,
      date: new Date(date).toLocaleDateString('pt-BR'),
      installmentValue: formatCurrency((selectedSale.total_value - (selectedSale.down_payment || 0)) / (selectedSale.installments || 1)).replace('R$', '').trim()
    }));
    
    // Buscar pagamentos confirmados da venda
    const { data: paymentsData } = await supabase
      .from('sale_payments')
      .select('amount, status, payment_date, payment_method')
      .eq('sale_id', selectedSale.id);
    
    // Calcular totais de pagamentos
    const paidPayments = paymentsData?.filter(p => p.status === 'paid') || [];
    const paidAmount = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = selectedSale.total_value - paidAmount;
    
    // Dados completos para o template Mustache
    const data = {
      // Logo (só existe se tiver URL)
      logoUrl: settings.logo_url || null,
      
      // Dados da venda
      saleNumber: selectedSale.id.slice(0, 8).toUpperCase(),
      saleDate: formatDateBR(selectedSale.sale_date),
      
      // Dados da empresa (LOCADOR) - usa dados da franquia da venda se disponível
      companyName: saleFranchise?.name || settings.company_name || 'ENGBRINK',
      companyCNPJ: saleFranchise?.cnpj || settings.company_cnpj || 'Não informado',
      companyAddress: saleFranchise?.address || settings.company_address || 'Não informado',
      companyCity: saleFranchise?.city || settings.company_city || 'Não informado',
      companyState: saleFranchise?.state || settings.company_state || 'Não informado',
      companyCEP: saleFranchise?.cep || settings.company_cep || 'Não informado',
      companyPhone: saleFranchise?.phone || settings.company_phone || 'Não informado',
      companyEmail: saleFranchise?.email || settings.company_email || 'Não informado',
      
      // Dados do cliente (com valores nulos para condicionais)
      clientName: documentClient?.name || selectedSale.client_name,
      clientDocument: documentClient?.cpf || documentClient?.cnpj || 'Não informado',
      clientPhone: documentClient?.phone || 'Não informado',
      clientEmail: documentClient?.email || null, // null para condicional funcionar
      clientAddress: documentClient?.endereco || null, // null para condicional funcionar
      clientCity: documentClient?.cidade || '',
      clientState: documentClient?.estado || '',
      clientCEP: documentClient?.cep || '',
      
      // Dados de pagamento
      totalValue: formatCurrency(selectedSale.total_value).replace('R$', '').trim(),
      paymentMethod: paidPayments.length > 0 && paidPayments[0].payment_method
        ? getPaymentMethodLabel(paidPayments[0].payment_method)
        : getPaymentMethodLabel(selectedSale.payment_method),
      hasDownPayment: selectedSale.down_payment > 0, // BOOLEANO!
      downPayment: formatCurrency(selectedSale.down_payment || 0).replace('R$', '').trim(),
      installmentAmount: formatCurrency(selectedSale.total_value - (selectedSale.down_payment || 0)).replace('R$', '').trim(),
      installments: selectedSale.installments || 1,
      installmentValue: formatCurrency((selectedSale.total_value - (selectedSale.down_payment || 0)) / (selectedSale.installments || 1)).replace('R$', '').trim(),
      
      // Frete
      hasFreight: (selectedSale.freight_value || 0) > 0,
      freightValue: formatCurrency(selectedSale.freight_value || 0).replace('R$', '').trim(),
      
      // Monitoria - calculado a partir dos slots
      hasMonitoring: monitoringSlots.length > 0,
      monitoringValue: formatCurrency(monitoringSlots.reduce((sum, slot) => sum + Number(slot.total_value), 0)).replace('R$', '').trim(),
      monitorsQuantity: monitoringSlots.reduce((sum, slot) => sum + slot.monitors_quantity, 0),
      
      // Desconto
      hasDiscount: ((selectedSale as any).discount_value || 0) > 0,
      discountValue: formatCurrency((selectedSale as any).discount_value || 0).replace('R$', '').trim(),
      
      // Datas e horários da locação
      hasRentalDates: !!selectedSale.rental_start_date,
      rentalStartDate: selectedSale.rental_start_date 
        ? formatDateBR(selectedSale.rental_start_date) 
        : null,
      returnDate: selectedSale.return_date 
        ? formatDateBR(selectedSale.return_date) 
        : null,
      returnTime: selectedSale.return_time || null,
      partyStartTime: selectedSale.party_start_time || null,
      
      // Endereço de entrega
      hasDeliveryAddress: !!selectedSale.delivery_address,
      deliveryAddress: selectedSale.delivery_address || null,
      deliveryCity: selectedSale.delivery_city || '',
      deliveryState: selectedSale.delivery_state || '',
      deliveryCEP: selectedSale.delivery_cep || '',
      
      // Pagamentos confirmados
      hasPaidPayments: paidAmount > 0,
      paidAmount: formatCurrency(paidAmount).replace('R$', '').trim(),
      hasRemainingAmount: remainingAmount > 0,
      remainingAmount: formatCurrency(remainingAmount).replace('R$', '').trim(),
      
      // Data de pagamento
      hasPaymentDate: paidPayments.length > 0 && !!paidPayments[0].payment_date,
      paymentDate: paidPayments.length > 0 && paidPayments[0].payment_date 
        ? (() => {
            const [year, month, day] = paidPayments[0].payment_date.split('-');
            return `${day}/${month}/${year}`;
          })()
        : null,
      
      // Arrays para iteração
      products: products,
      installmentDates: installmentDates.length > 0 ? installmentDates : null, // null se vazio
      
      // Observações
      notes: selectedSale.notes || null
    };
    
    // Renderizar template com Mustache
    return Mustache.render(template, data);
  };

  // useEffect para gerar conteúdo do documento quando necessário
  useEffect(() => {
    if (showDocument && selectedSale) {
      generateDocumentContent().then(content => {
        setDocumentContent(content);
      });
    }
  }, [showDocument, selectedSale, documentClient, documentType, settings]);

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Gerando PDF...");
      const docType = documentType === 'receipt' ? 'Recibo' : 'Contrato';
      const saleNumber = selectedSale?.id?.slice(0, 8)?.toUpperCase();
      const clientName = documentClient?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Cliente';
      const fileName = `${docType}_${saleNumber}_${clientName}.pdf`;

      const { downloadElementAsPdf } = await import("@/lib/generatePdf");
      await downloadElementAsPdf('document-preview', fileName);
      toast.dismiss();
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.dismiss();
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleSendWhatsApp = () => {
    if (!documentClient?.phone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }

    const docType = documentType === 'receipt' ? 'Recibo' : 'Contrato';
    const saleNumber = selectedSale?.id?.slice(0, 8)?.toUpperCase();
    
    const cleanPhone = documentClient.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const message = `Olá ${documentClient.name}! 

Segue o *${docType} de Venda #${saleNumber}*.

${documentType === 'receipt' ? '🧾' : '📄'} Por favor, verifique os dados e entre em contato caso tenha alguma dúvida.

Obrigado pela confiança! 🙏`;

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success("WhatsApp aberto com sucesso!");
  };

  const handlePrintDocument = async () => {
    const content = await generateDocumentContent();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Erro ao abrir janela de impressão");
      return;
    }
    
    printWindow.document.write(buildPrintHtml(documentType, content));
    printWindow.document.close();
  };

  // Função para exportar para Excel
  const handleExportExcel = (filters?: ExportFilters) => {
    // Filtrar dados com base nos filtros (se fornecidos)
    let dataToExport = sortedFilteredSales;
    
    if (filters) {
      // Filtrar por período de data da festa
      if (filters.fromDate) {
        dataToExport = dataToExport.filter(sale => 
          sale.rental_start_date && sale.rental_start_date >= filters.fromDate!
        );
      }
      
      if (filters.toDate) {
        dataToExport = dataToExport.filter(sale => 
          sale.rental_start_date && sale.rental_start_date <= filters.toDate!
        );
      }
      
      // Filtrar por franquia
      if (filters.franchiseId) {
        dataToExport = dataToExport.filter(sale => 
          sale.franchise_id === filters.franchiseId
        );
      }
    }
    
    if (dataToExport.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    
    // Mapear para formato de planilha
    const excelData = dataToExport.map(sale => {
      const franchise = franchiseMap[sale.franchise_id || ''];
      const client = clients.find(c => c.id === sale.client_id);
      const productsList = sale.items?.map(i => i.product_name).join(', ') || '';
      
      const statusLabel = sale.status === 'cancelled' 
        ? 'Cancelado' 
        : sale.status === 'delivered' 
          ? 'Entregue' 
          : 'Pedido';
      
      return {
        'Unidade': franchise ? `${franchise.name} - ${franchise.city}` : '',
        'Nome do Cliente': sale.client_name,
        'Telefone': client?.phone || '',
        'Endereço': sale.delivery_address || client?.endereco || '',
        'Cidade': sale.delivery_city || client?.cidade || '',
        'Status': statusLabel,
        'Brinquedos': productsList,
        'Horário': sale.party_start_time || '',
        'Data da Festa': formatDateBR(sale.rental_start_date),
        'Data da Retirada': formatDateBR(sale.return_date),
        'Monitor (Qtd)': sale.with_monitoring ? (sale.monitors_quantity || 1) : 0,
        'Valor Total': sale.total_value,
        'Criado por': (sale as any).created_by_name || '',
      };
    });
    
    // Criar e baixar arquivo Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 25 }, // Unidade
      { wch: 30 }, // Nome do Cliente
      { wch: 15 }, // Telefone
      { wch: 40 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 12 }, // Status
      { wch: 40 }, // Brinquedos
      { wch: 10 }, // Horário
      { wch: 15 }, // Data da Festa
      { wch: 15 }, // Data da Retirada
      { wch: 15 }, // Monitor (Qtd)
      { wch: 15 }, // Valor Total
      { wch: 20 }, // Criado por
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Locações');
    
    // Gerar nome do arquivo dinâmico
    let fileName = 'locacoes';
    
    if (filters?.franchiseId) {
      const franchise = franchiseMap[filters.franchiseId];
      if (franchise) {
        fileName += `_${franchise.city.toLowerCase().replace(/\s+/g, '-')}`;
      }
    }
    
    if (filters?.fromDate && filters?.toDate) {
      fileName += `_${filters.fromDate}_a_${filters.toDate}`;
    } else if (filters?.fromDate) {
      fileName += `_a_partir_${filters.fromDate}`;
    } else if (filters?.toDate) {
      fileName += `_ate_${filters.toDate}`;
    } else {
      fileName += `_completo_${new Date().toISOString().split('T')[0]}`;
    }
    
    fileName += '.xlsx';
      
    XLSX.writeFile(workbook, fileName);
    toast.success(`Planilha exportada com ${dataToExport.length} registro(s)!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Locações</h1>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <Calendar className="w-4 h-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Gráfico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="mt-6">
          <SalesChart />
        </TabsContent>

        <TabsContent value="list" className="mt-6">

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {isEditing ? "Editar Locação" : "Nova Locação"}
            </h2>
          </div>

          {/* Seção 1: Informações da Venda */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="franchise_id">Unidade que vai Atender *</Label>
              {isFranqueado && userFranchise ? (
                // Franqueado vê apenas sua unidade (campo fixo)
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  {userFranchise.name} - {userFranchise.city}
                </div>
              ) : (
                <Select
                  value={selectedFranchiseId}
                  onValueChange={(value) => {
                    setSelectedFranchiseId(value);
                    setCurrentItem({
                      product_id: "",
                      product_code_id: "",
                      unit_value: "",
                    });
                    setAvailableInventory([]);
                    setAvailableCodes([]);
                    setCheckingInventory(false);
                  }}
                >
                  <SelectTrigger id="franchise_id">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((franchise) => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        {franchise.name} - {franchise.city}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <div 
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/admin/franchises');
                      }}
                    >
                      <Plus className="absolute left-2 h-4 w-4" />
                      Cadastrar nova unidade
                    </div>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.client_id
                      ? clients.find((c) => c.id === formData.client_id)?.name
                      : "Selecione um cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[300px] p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente por nome..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setFormData({
                                ...formData,
                                client_id: client.id,
                                client_name: client.name,
                              });
                              setClientPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.client_id === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{client.name}</span>
                              {client.phone && (
                                <span className="text-xs text-muted-foreground">
                                  📞 {client.phone}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <div className="border-t px-2 py-2">
                        <div 
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                          onClick={() => {
                            setClientPopoverOpen(false);
                            navigate('/admin/clients');
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Cadastrar novo cliente
                        </div>
                      </div>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Indicador visual dos dados do cliente */}
              {formData.client_id && (() => {
                const selectedClient = clients.find(c => c.id === formData.client_id);
                return selectedClient ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">📋 Dados do Cliente</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedClient.phone && (
                        <div>
                          <span className="text-muted-foreground">📞 Telefone:</span>
                          <p className="font-medium">{selectedClient.phone}</p>
                        </div>
                      )}
                      {selectedClient.cpf && (
                        <div>
                          <span className="text-muted-foreground">🆔 CPF:</span>
                          <p className="font-medium">{selectedClient.cpf}</p>
                        </div>
                      )}
                      {selectedClient.cnpj && (
                        <div>
                          <span className="text-muted-foreground">🏢 CNPJ:</span>
                          <p className="font-medium">{selectedClient.cnpj}</p>
                        </div>
                      )}
                      {selectedClient.email && (
                        <div>
                          <span className="text-muted-foreground">📧 Email:</span>
                          <p className="font-medium truncate">{selectedClient.email}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      ℹ️ O endereço será preenchido com os dados da festa nas seções abaixo
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sale_date">Data da Reserva *</Label>
              <Input
                id="sale_date"
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Seção 1.5: Datas da Locação */}
          <Card className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                📅 Datas da Locação *
              </h3>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">



              <div className="space-y-2">
                <Label htmlFor="rental_start_date_early">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data da Festa (Início da Locação) *
                </Label>
                <Input
                  id="rental_start_date_early"
                  type="date"
                  value={formData.rental_start_date}
                  onChange={(e) => {
                    setFormData({ ...formData, rental_start_date: e.target.value });
                    setAvailableInventory([]);
                  }}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="return_date_early">Data de Retirada *</Label>
                <Input
                  id="return_date_early"
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => {
                    setFormData({ ...formData, return_date: e.target.value });
                    setAvailableInventory([]);
                  }}
                  min={formData.rental_start_date || undefined}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="party_start_time_early">
                  Horário de Início
                </Label>
                <Input
                  id="party_start_time_early"
                  type="time"
                  value={formData.party_start_time}
                  onChange={(e) => {
                    setFormData({ ...formData, party_start_time: e.target.value });
                    setAvailableInventory([]);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  ℹ️ O horário ajuda a verificar disponibilidade no mesmo dia
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="return_time">Horário de Retirada</Label>
                <Input
                  id="return_time"
                  type="time"
                  value={formData.return_time}
                  onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  ℹ️ Horário em que o equipamento será recolhido
                </p>
                {formData.return_time && (() => {
                  const [h, m] = formData.return_time.split(':').map(Number);
                  const availH = h + 1;
                  const availTime = `${String(availH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  return (
                    <p className="text-xs text-muted-foreground">
                      ✅ Disponível novamente às: <span className="font-semibold text-green-600">{availTime}</span>
                    </p>
                  );
                })()}
                {formData.rental_start_date === formData.return_date && 
                 formData.party_start_time && formData.return_time && 
                 formData.return_time < formData.party_start_time && (
                  <Card className="p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 mt-2">
                    <p className="text-sm text-red-900 dark:text-red-100">
                      ⚠️ O horário de retirada não pode ser anterior ao horário de início da festa no mesmo dia!
                    </p>
                  </Card>
                )}
              </div>
            </div>


            {formData.rental_start_date && formData.return_date && (
              <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 mt-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ Datas preenchidas! Agora você pode adicionar itens do estoque e verificar a disponibilidade.
                </p>
              </Card>
            )}
          </Card>

          {/* Seção 2: Adicionar Itens do Estoque */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Adicionar Item do Estoque</h3>
            </div>
            
            {/* Aviso para preencher datas primeiro */}
            {(!formData.rental_start_date || !formData.return_date) && (
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Preencha as datas de locação primeiro
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Para verificar a disponibilidade dos itens, você precisa informar a data da festa e a data de retirada na seção "Informações de Entrega e Locação" abaixo.
                    </p>
                  </div>
                </div>
              </Card>
            )}
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_product_id">Produto</Label>
                <Select
                  value={currentItem.product_id}
                  onValueChange={async (value) => {
                    const selectedProduct = products.find(p => p.id === value);
                    
                    setCurrentItem({ 
                      ...currentItem, 
                      product_id: value, 
                      inventory_item_id: "",
                      unit_value: String(selectedProduct?.sale_price || ""),
                    });
                    
                    setSelectedProductCostPrice(selectedProduct?.cost_price || 0);
                    
                    if (value && selectedFranchiseId && selectedProduct && formData.rental_start_date && formData.return_date) {
                      await checkInventoryAvailability(selectedProduct.name, selectedFranchiseId);
                    } else {
                      setAvailableInventory([]);
                    }
                  }}
                  disabled={!formData.rental_start_date || !formData.return_date}
                >
                  <SelectTrigger id="current_product_id">
                    <SelectValue placeholder={!formData.rental_start_date || !formData.return_date ? "Preencha as datas primeiro" : "Selecione o produto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum produto cadastrado
                      </div>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de Itens Disponíveis */}
              {currentItem.product_id && availableInventory.length > 0 && (
                <div className="space-y-2">
                  <Label>Selecione o Item Específico do Estoque</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableInventory.map((item) => {
                      const isDifferentFranchise = item.franchise_id !== selectedFranchiseId;
                      const isAvailable = item.availability?.isAvailable;
                      const franchise = franchises.find(f => f.id === item.franchise_id);
                      const isInMaintenance = item.status === 'manutencao';
                      
                      let bgColor = "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
                      let icon = "🔴";
                      let statusText = "Indisponível";
                      
                      if (isAvailable && !isDifferentFranchise && !isInMaintenance) {
                        bgColor = "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
                        icon = "🟢";
                        statusText = "Disponível";
                      } else if (isAvailable && !isDifferentFranchise && isInMaintenance) {
                        bgColor = "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800";
                        icon = "🔧";
                        statusText = "Em manutenção leve";
                      } else if (isAvailable && isDifferentFranchise) {
                        bgColor = "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
                        icon = "🟡";
                        statusText = isInMaintenance ? "Em manutenção leve (outra unidade)" : "Disponível em outra unidade";
                      }
                      
                      return (
                        <Card 
                          key={item.id} 
                          className={`p-3 cursor-pointer transition-all hover:shadow-md ${bgColor} ${
                            currentItem.inventory_item_id === item.id ? 'ring-2 ring-primary' : ''
                          } ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (isAvailable) {
                              setCurrentItem({ 
                                ...currentItem, 
                                inventory_item_id: item.id,
                                unit_value: String(item.rental_value || item.value || currentItem.unit_value)
                              });
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium truncate">{item.name}</p>
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-background/50">
                                  {item.code}
                                </span>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-1">
                                {franchise ? `${franchise.name} - ${franchise.city}` : 'Unidade não identificada'}
                              </p>
                              
                              <div className="mt-2">
                                <span className={`text-xs font-medium ${
                                  isAvailable ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                                }`}>
                                  {statusText}
                                </span>
                                
                                {!isAvailable && item.availability?.conflictingClient && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    <p>❌ Reservado por: <strong>{item.availability.conflictingClient}</strong></p>
                                    <p>📅 Data: {new Date(item.availability.conflictingDate || '').toLocaleDateString('pt-BR')}</p>
                                    {item.availability.conflictingTime && (
                                      <p>🕒 Horário: {item.availability.conflictingTime}</p>
                                    )}
                                    {item.availability.conflictingFranchise && (
                                      <p>📍 Unidade: {item.availability.conflictingFranchise}</p>
                                    )}
                                  </div>
                                )}
                                
                                {isAvailable && isInMaintenance && (
                                  <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                                    ⚠️ Item em manutenção leve - disponível para reserva
                                  </p>
                                )}
                                
                                {isAvailable && isDifferentFranchise && (
                                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                                    ⚠️ Item será emprestado de outra unidade
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {currentItem.product_id && checkingInventory && formData.rental_start_date && formData.return_date && (
                <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Verificando disponibilidade...
                    </p>
                  </div>
                </Card>
              )}
              
              {currentItem.product_id && !checkingInventory && availableInventory.length === 0 && formData.rental_start_date && formData.return_date && (
                <Card className="p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400">❌</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Nenhum item disponível no estoque
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Não há unidades deste produto disponíveis para o período selecionado em nenhuma franquia.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="current_unit_value">Valor da Locação</Label>
                <Input
                  id="current_unit_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentItem.unit_value}
                  onChange={(e) => setCurrentItem({ ...currentItem, unit_value: e.target.value })}
                  placeholder="0,00"
                  disabled={!currentItem.inventory_item_id}
                />
              </div>
              
              {currentItem.inventory_item_id && currentItem.unit_value && (
                <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custo:</span>
                      <span className="font-medium">{formatCurrency(selectedProductCostPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor de Locação:</span>
                      <span className="font-medium">{formatCurrency(Number(currentItem.unit_value))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-green-300">
                      <span className="font-medium">Margem:</span>
                      <span className={`font-bold ${calculateProfit().profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(calculateProfit().profit)} ({calculateProfit().percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </Card>
              )}
              
              <Button 
                type="button" 
                onClick={handleAddItemToSale} 
                className="w-full"
                disabled={
                  !currentItem.inventory_item_id || 
                  !currentItem.unit_value
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar à Locação
              </Button>
            </div>
          </Card>

          {/* Seção 3: Lista de Itens Adicionados */}
          {saleItems.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Itens da Locação</h3>
              </div>
              
              <div className="space-y-2">
                {saleItems.map((item, index) => {
                  const invItem = availableInventory.find(i => i.id === item.inventory_item_id);
                  const isDifferentFranchise = invItem && invItem.franchise_id !== selectedFranchiseId;
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        {invItem && (
                          <p className="text-xs text-muted-foreground">
                            Código: {invItem.code}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.unit_value)}
                        </p>
                        {isDifferentFranchise && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                            ⚠️ Empréstimo entre unidades
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItemFromSale(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              
              {/* Valores Adicionais - Monitoria, Frete e Desconto */}
              <div className="mt-4 pt-4 border-t space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Valores Adicionais</h4>
                
                {/* Monitoria - Múltiplos Turnos */}
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <Label className="font-medium">Monitoria</Label>
                  
                  {/* Formulário para adicionar turno */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="current_monitors_quantity" className="text-xs">Qtd Monitores</Label>
                      <Input
                        id="current_monitors_quantity"
                        type="number"
                        min="0"
                        value={currentMonitoringSlot.monitors_quantity}
                        onChange={(e) => setCurrentMonitoringSlot({ ...currentMonitoringSlot, monitors_quantity: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="current_monitoring_value" className="text-xs">Valor Unitário (R$)</Label>
                      <Input
                        id="current_monitoring_value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentMonitoringSlot.unit_value || ""}
                        onChange={(e) => setCurrentMonitoringSlot({ ...currentMonitoringSlot, unit_value: Math.round((parseFloat(e.target.value) || 0) * 100) / 100 })}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Total (R$)</Label>
                      <Input
                        type="text"
                        readOnly
                        disabled
                        value={(currentMonitoringSlot.monitors_quantity * currentMonitoringSlot.unit_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="current_monitoring_start_time" className="text-xs">Horário Início</Label>
                      <Input
                        id="current_monitoring_start_time"
                        type="time"
                        value={currentMonitoringSlot.start_time}
                        onChange={(e) => setCurrentMonitoringSlot({ ...currentMonitoringSlot, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="current_monitoring_end_time" className="text-xs">Horário Término</Label>
                      <Input
                        id="current_monitoring_end_time"
                        type="time"
                        value={currentMonitoringSlot.end_time}
                        onChange={(e) => setCurrentMonitoringSlot({ ...currentMonitoringSlot, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  {/* Monitor (Opcional) */}
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="monitor_id" className="text-xs">👤 Monitor (Opcional)</Label>
                    <Select
                      value={formData.monitor_id}
                      onValueChange={(value) => 
                        setFormData({ ...formData, monitor_id: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger id="monitor_id">
                        <SelectValue placeholder="Selecione um monitor (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem monitor</SelectItem>
                        {monitors.map((monitor) => (
                          <SelectItem key={monitor.id} value={monitor.id}>
                            {monitor.name} - {monitor.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      ℹ️ O monitor não é obrigatório para finalizar o agendamento
                    </p>
                  </div>

                  <Button
                    type="button"
                    className="w-full mt-3"
                    onClick={handleAddMonitoringSlot}
                  >
                    {editingSlotIndex !== null ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar à Locação
                      </>
                    )}
                  </Button>

                  {/* Lista de turnos adicionados */}
                  {monitoringSlots.length > 0 && (
                    <div className="mt-4 border-t pt-3 space-y-2">
                      <Label className="text-xs text-muted-foreground">Turnos de Monitoria Adicionados</Label>
                      {monitoringSlots.map((slot, index) => {
                        const monitorName = slot.monitor_id 
                          ? monitors.find(m => m.id === slot.monitor_id)?.name 
                          : null;
                        
                        return (
                          <div key={index} className={cn(
                            "flex flex-col p-2 bg-background rounded-md border",
                            editingSlotIndex === index && "ring-2 ring-primary"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="font-medium">
                                  📋 {slot.monitors_quantity} {slot.monitors_quantity === 1 ? 'monitor' : 'monitores'} - {slot.start_time} às {slot.end_time}
                                </span>
                                <span className="ml-2 text-muted-foreground">
                                  {formatCurrency(slot.monitors_quantity * slot.unit_value)}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMonitoringSlot(index)}
                                >
                                  <Edit className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMonitoringSlot(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            {monitorName ? (
                              <span className="text-xs text-muted-foreground mt-1">
                                👤 Monitor: {monitorName}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                👤 Monitor: (nenhum selecionado)
                              </span>
                            )}
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center pt-2 border-t text-sm font-medium">
                        <span>Total Monitoria:</span>
                        <span className="text-green-600">
                          {formatCurrency(monitoringSlots.reduce((sum, slot) => sum + (slot.monitors_quantity * slot.unit_value), 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Frete e Desconto lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    <Label htmlFor="freight_value_items">Valor do Frete (R$)</Label>
                    <Input
                      id="freight_value_items"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.freight_value}
                      onChange={(e) => setFormData({ ...formData, freight_value: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      ℹ️ Deixe 0 se não houver frete
                    </p>
                  </div>
                  
                  <div className="space-y-2 bg-red-50/50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <Label htmlFor="discount_value_items" className="text-red-700 dark:text-red-300">🏷️ Desconto (R$)</Label>
                    <Input
                      id="discount_value_items"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="border-red-200 dark:border-red-800"
                    />
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ℹ️ Será subtraído do total
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumo de Valores */}
              <div className="mt-4 pt-4 border-t space-y-2 bg-muted/30 p-3 rounded-lg">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Subtotal (Itens):</span>
                  <span>{formatCurrency(saleItems.reduce((sum, item) => sum + item.total_value, 0))}</span>
                </div>
                {Number(formData.freight_value) > 0 && (
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Frete:</span>
                    <span>{formatCurrency(Number(formData.freight_value))}</span>
                  </div>
                )}
                {monitoringSlots.length > 0 && (
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Monitoria ({monitoringSlots.length} turno{monitoringSlots.length > 1 ? 's' : ''}):</span>
                    <span>{formatCurrency(monitoringSlots.reduce((sum, slot) => sum + (slot.monitors_quantity * slot.unit_value), 0))}</span>
                  </div>
                )}
                {Number(formData.discount_value) > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-600 dark:text-red-400">
                    <span>🏷️ Desconto:</span>
                    <span>- {formatCurrency(Number(formData.discount_value))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculateSaleTotal())}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Seção 4: Pagamentos */}
          {saleItems.length > 0 && (
            <PaymentManager
              saleId={formData.id || null}
              totalValue={calculateSaleTotal()}
              onPaymentsChange={fetchSales}
              localPayments={!formData.id ? pendingPayments : undefined}
              onLocalPaymentsChange={!formData.id ? setPendingPayments : undefined}
            />
          )}

          {/* Seção 4.5: Informações de Entrega e Locação */}
          {saleItems.length > 0 && (
            <Card className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                  📍 Informações de Entrega e Locação
                </h3>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Endereço de Entrega */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="delivery_address">Endereço Completo de Entrega</Label>
                  <div className="flex gap-2">
                    <Input
                      id="delivery_address"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      placeholder="Rua, número, complemento"
                    />
                    {formData.client_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Copiar endereço do cliente"
                        onClick={async () => {
                          const client = await fetchClientDetails(formData.client_id);
                          if (client) {
                            setFormData({
                              ...formData,
                              delivery_address: client.endereco || "",
                              delivery_city: client.cidade || "",
                              delivery_state: client.estado || "",
                              delivery_cep: client.cep || "",
                            });
                            toast.success("Endereço do cliente copiado!");
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delivery_city">Cidade</Label>
                  <Input
                    id="delivery_city"
                    value={formData.delivery_city}
                    onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delivery_state">Estado</Label>
                  <Input
                    id="delivery_state"
                    value={formData.delivery_state}
                    onChange={(e) => setFormData({ ...formData, delivery_state: e.target.value.toUpperCase() })}
                    placeholder="Ex: SP"
                    maxLength={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delivery_cep">CEP</Label>
                  <Input
                    id="delivery_cep"
                    value={formData.delivery_cep}
                    onChange={(e) => setFormData({ ...formData, delivery_cep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
                
              </div>
            </Card>
          )}

          {/* Seção 5: Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Informações adicionais sobre a venda..."
            />
          </div>

          {/* Seção 6: Status do Pedido */}
          <div className="space-y-2">
            <Label htmlFor="status">Status do Pedido</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">📋 Pedido</SelectItem>
                <SelectItem value="delivered">✅ Entregue</SelectItem>
                <SelectItem value="cancelled">❌ Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de Entrega (aparece quando status = delivered) */}
          {formData.status === 'delivered' && (
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Data de Entrega</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={saleItems.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {isEditing ? "Salvar Alterações" : "Registrar Locação"}
                </>
              )}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      </form>

      {/* Histórico de Locações - Formato Planilha */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">📊 Histórico de Locações</h2>
          <div className="text-sm text-muted-foreground">
            Total: {filteredSales.length} locação(ões)
          </div>
        </div>
        
        {/* Tabela Estilo Planilha */}
        {sales.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma venda registrada ainda.
          </div>
        ) : (
          <>
            {/* Barra de scroll horizontal no topo */}
            <div 
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto border border-b-0 rounded-t-lg"
            >
              <div style={{ width: '2500px', height: '12px' }} />
            </div>
            
            <div 
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className={`overflow-x-auto overflow-y-auto border border-t-0 rounded-b-lg max-h-[800px] ${
                isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
              }`}
            >
              <table className="w-full text-sm" style={{ minWidth: '2500px' }}>
                <thead className="bg-primary text-primary-foreground sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-center whitespace-nowrap border-r border-primary-foreground/20">Ações</th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">
                      <button onClick={() => handleSort('franchise')} className="flex items-center hover:opacity-80 transition-opacity">
                        Unidade {getSortIcon('franchise')}
                      </button>
                    </th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">
                      <button onClick={() => handleSort('client_name')} className="flex items-center hover:opacity-80 transition-opacity">
                        Nome {getSortIcon('client_name')}
                      </button>
                    </th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">Endereço</th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">
                      <button onClick={() => handleSort('delivery_city')} className="flex items-center hover:opacity-80 transition-opacity">
                        Cidade {getSortIcon('delivery_city')}
                      </button>
                    </th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">Status</th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">Brinquedos</th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">Horário</th>
                    
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20 w-[110px]">
                      <button onClick={() => handleSort('rental_start_date')} className="flex items-center hover:opacity-80 transition-opacity">
                        Data da Festa {getSortIcon('rental_start_date')}
                      </button>
                    </th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20 w-[110px]">
                      <button onClick={() => handleSort('return_date')} className="flex items-center hover:opacity-80 transition-opacity">
                        Data da Retirada {getSortIcon('return_date')}
                      </button>
                    </th>
                    <th className="p-3 text-center whitespace-nowrap border-r border-primary-foreground/20 w-[70px]">Monitor</th>
                    <th className="p-3 text-right whitespace-nowrap border-r border-primary-foreground/20 w-[100px]">
                      <button onClick={() => handleSort('total_value')} className="flex items-center justify-end hover:opacity-80 transition-opacity w-full">
                        Valor Total {getSortIcon('total_value')}
                      </button>
                    </th>
                    <th className="p-3 text-left whitespace-nowrap border-r border-primary-foreground/20">Status Pagamento</th>
                    <th className="p-3 text-left whitespace-nowrap">Criado por</th>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r">
                      {isFranqueado && userFranchise ? (
                        <div className="h-7 flex items-center text-xs text-muted-foreground px-2">
                          {userFranchise.name}
                        </div>
                      ) : (
                        <Select value={columnFilters.franchise} onValueChange={(v) => setColumnFilters({...columnFilters, franchise: v})}>
                          <SelectTrigger className="h-7 text-xs text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {franchises.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.city || f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        placeholder="Filtrar..." 
                        value={columnFilters.client_name}
                        onChange={(e) => setColumnFilters({...columnFilters, client_name: e.target.value})}
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        placeholder="Filtrar..." 
                        value={columnFilters.delivery_address}
                        onChange={(e) => setColumnFilters({...columnFilters, delivery_address: e.target.value})}
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        placeholder="Filtrar..." 
                        value={columnFilters.delivery_city}
                        onChange={(e) => setColumnFilters({...columnFilters, delivery_city: e.target.value})}
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </td>
                    <td className="p-2 border-r">
                      <Select value={columnFilters.status} onValueChange={(v) => setColumnFilters({...columnFilters, status: v})}>
                        <SelectTrigger className="h-7 text-xs text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pedido</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        placeholder="Filtrar..." 
                        value={columnFilters.products}
                        onChange={(e) => setColumnFilters({...columnFilters, products: e.target.value})}
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r">
                      <Input 
                        type="date"
                        value={columnFilters.rental_start_date_from}
                        onChange={(e) => setColumnFilters({...columnFilters, rental_start_date_from: e.target.value})}
                        className="h-7 text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        type="date"
                        value={columnFilters.return_date_from}
                        onChange={(e) => setColumnFilters({...columnFilters, return_date_from: e.target.value})}
                        className="h-7 text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2 border-r">
                      <Select value={columnFilters.monitor} onValueChange={(v) => setColumnFilters({...columnFilters, monitor: v})}>
                        <SelectTrigger className="h-7 text-xs text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="yes">Sim</SelectItem>
                          <SelectItem value="no">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        type="number"
                        placeholder="Min"
                        value={columnFilters.total_value_min}
                        onChange={(e) => setColumnFilters({...columnFilters, total_value_min: e.target.value})}
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </td>
                    <td className="p-2 border-r">
                      <Input 
                        placeholder="Status..."
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                        disabled
                      />
                    </td>
                    <td className="p-2">
                      <Input 
                        placeholder="Filtrar..."
                        className="h-7 text-xs text-foreground placeholder:text-muted-foreground"
                        disabled
                      />
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-muted-foreground">
                        Nenhuma venda encontrada com os filtros aplicados.
                      </td>
                    </tr>
                  ) : paginatedSales.map((sale) => {
                    const client = clients.find(c => c.id === sale.client_id);
                    const rentalDays = sale.rental_start_date && sale.return_date
                      ? Math.ceil((new Date(sale.return_date).getTime() - new Date(sale.rental_start_date).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    const productsList = sale.items?.map(item => item.product_name).join(", ") || "-";
                    
                    return (
                      <tr 
                        key={sale.id}
                        className={`border-b hover:bg-muted/50 transition-colors ${
                          sale.status === 'cancelled' ? 'bg-red-50 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <td className="p-3 border-r">
                          <div className="grid grid-cols-3 gap-1 justify-items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(sale)}
                              title="Editar"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateReceipt(sale)}
                              title="Ver Recibo"
                              className="h-8 w-8 p-0"
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateContract(sale)}
                              title="Ver Contrato"
                              className="h-8 w-8 p-0"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!client?.phone) {
                                  toast.error("Cliente não possui telefone cadastrado");
                                  return;
                                }
                                const cleanPhone = client.phone.replace(/\D/g, '');
                                const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                                const message = `Olá ${sale.client_name}! 👋\n\nEntrando em contato sobre a sua locação.`;
                                const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
                                window.open(whatsappUrl, '_blank');
                              }}
                              title="Contato WhatsApp"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            {sale.status !== 'delivered' && sale.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsDelivered(sale.id)}
                                title="Marcar como Entregue"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              >
                                🚚
                              </Button>
                            )}
                            {isFranqueadora && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(sale.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-r">
                          {sale.franchise_id && franchiseMap[sale.franchise_id] ? (
                            <div>
                              <p className="font-medium text-sm">{franchiseMap[sale.franchise_id].name}</p>
                              <p className="text-xs text-muted-foreground">{franchiseMap[sale.franchise_id].city}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não definida</span>
                          )}
                        </td>
                        <td className="p-3 border-r font-medium">{sale.client_name}</td>
                        <td className="p-3 border-r max-w-[200px] truncate" title={sale.delivery_address || client?.endereco || "-"}>
                          {sale.delivery_address || client?.endereco || "-"}
                        </td>
                        <td className="p-3 border-r">{sale.delivery_city || client?.cidade || "-"}</td>
                        <td className="p-3 border-r">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                            sale.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                          }`}>
                            {sale.status === 'cancelled' ? 'CANCELADA' : sale.status === 'delivered' ? 'ENTREGUE' : 'PEDIDO'}
                          </span>
                        </td>
                        <td className="p-3 border-r min-w-[200px]">
                          <div className="whitespace-pre-wrap break-words">
                            {sale.items?.map(item => item.product_name).join("\n") || "-"}
                          </div>
                        </td>
                        <td className="p-3 border-r whitespace-nowrap">
                          {sale.party_start_time || "-"}
                        </td>


                        <td className="p-3 border-r whitespace-nowrap">
                          {formatDateBR(sale.rental_start_date)}
                        </td>
                        <td className="p-3 border-r whitespace-nowrap">
                          {formatDateBR(sale.return_date)}
                        </td>
                        <td className="p-3 border-r text-center">
                          {sale.with_monitoring ? (sale.monitors_quantity || 1) : "-"}
                        </td>
                        <td className="p-3 border-r font-semibold text-right text-green-600">
                          {formatCurrency(sale.total_value)}
                        </td>
                        <td className="p-3 border-r">
                          <div 
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickPaymentSale(sale);
                            }}
                          >
                            <PaymentStatusCell saleId={sale.id} totalValue={sale.total_value} rentalStartDate={sale.rental_start_date} refreshTrigger={paymentRefreshKey} />
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {(sale as any).created_by_name || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Paginação e Resumo */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Linhas por página:</Label>
                  <Select 
                    value={itemsPerPage === 9999 ? "all" : String(itemsPerPage)} 
                    onValueChange={(v) => {
                      setItemsPerPage(v === "all" ? 9999 : Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {itemsPerPage !== 9999 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {totalPages || 1}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowExportModal(true)}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Exportar Excel
                </Button>
                <div className="text-sm text-muted-foreground">
                  Mostrando {paginatedSales.length} de {sortedFilteredSales.length} venda(s) filtrada(s) ({sales.length} total)
                </div>
                <div className="text-lg font-bold text-primary">
                  Total: {formatCurrency(sortedFilteredSales.reduce((sum, s) => sum + s.total_value, 0))}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {showDocument && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex flex-wrap justify-between items-center gap-4 sticky top-0 bg-background z-10">
              <h3 className="text-lg font-semibold">
                {documentType === 'receipt' ? '🧾 Recibo de Venda' : '📄 Contrato de Compra e Venda'}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePrintDocument} size="sm">
                  <Receipt className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                
                <Button 
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
                
                <Button 
                  onClick={() => {
                    if (!documentClient?.phone) {
                      toast.error("Cliente não possui telefone cadastrado");
                      return;
                    }
                    const saleData = {
                      id: selectedSale?.id,
                      client_name: selectedSale?.client_name,
                      client_phone: documentClient?.phone,
                      rental_start_date: selectedSale?.rental_start_date,
                      party_start_time: selectedSale?.party_start_time,
                      delivery_address: selectedSale?.delivery_address,
                      delivery_city: selectedSale?.delivery_city,
                      total_value: selectedSale?.total_value,
                      items: selectedSale?.items,
                      monitoringSlots: (selectedSale as any)?.monitoringSlots || [],
                    };
                    setSavedSaleForWhatsApp(saleData);
                    setShowWhatsAppModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp
                </Button>
                
                <Button variant="ghost" size="icon" onClick={() => setShowDocument(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <style dangerouslySetInnerHTML={{ __html: `
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding-bottom: 20px;
                  border-bottom: 3px solid #3b82f6;
                  margin-bottom: 30px;
                }
                
                .header-logo {
                  max-width: 180px;
                  max-height: 80px;
                  object-fit: contain;
                }
                
                .header-title h1 {
                  font-size: 24px;
                  color: #1e40af;
                  margin-bottom: 5px;
                }
                
                .header-title .doc-number {
                  font-size: 14px;
                  color: #6b7280;
                }
                
                .section {
                  margin-bottom: 25px;
                  padding: 20px;
                  background: #f9fafb;
                  border-radius: 8px;
                  border-left: 4px solid #3b82f6;
                }
                
                .section-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: #1e40af;
                  margin-bottom: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                
                .info-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 12px;
                }
                
                .info-label {
                  font-size: 12px;
                  color: #6b7280;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 2px;
                }
                
                .info-value {
                  font-size: 14px;
                  color: #111827;
                  font-weight: 500;
                }
                
                .products-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                  background: white;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                  border-radius: 8px;
                  overflow: hidden;
                }
                
                .products-table thead {
                  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                  color: white;
                }
                
                .products-table th {
                  padding: 12px;
                  text-align: left;
                  font-size: 13px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                
                .payment-summary {
                  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 25px 0;
                }
                
                .payment-summary .total {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  font-size: 20px;
                  font-weight: 700;
                  margin-bottom: 10px;
                }
                
                .payment-summary .details {
                  font-size: 14px;
                  opacity: 0.9;
                  margin-top: 10px;
                  padding-top: 10px;
                  border-top: 1px solid rgba(255,255,255,0.3);
                }
                
                .installments-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                  gap: 10px;
                  margin-top: 15px;
                }
                
                .installment-item {
                  background: white;
                  padding: 10px;
                  border-radius: 6px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                
                .installment-item span {
                  color: #6b7280;
                  font-size: 13px;
                }
                
                .installment-item strong {
                  color: #1e40af;
                  font-size: 14px;
                }
                
                .signatures {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 40px;
                  margin-top: 60px;
                }
                
                .signature-box {
                  text-align: center;
                }
                
                .signature-line {
                  border-top: 2px solid #1f2937;
                  margin-bottom: 8px;
                }
                
                .signature-label {
                  font-size: 12px;
                  color: #6b7280;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                
                .signature-name {
                  font-size: 14px;
                  font-weight: 600;
                  color: #111827;
                }
                
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 2px solid #e5e7eb;
                  text-align: center;
                  font-size: 12px;
                  color: #6b7280;
                }
                
                .notes {
                  background: #fef3c7;
                  border-left: 4px solid #f59e0b;
                  padding: 15px;
                  border-radius: 6px;
                  margin: 20px 0;
                }
                
                .notes-title {
                  font-weight: 600;
                  color: #92400e;
                  margin-bottom: 8px;
                }
                
                .notes-content {
                  color: #78350f;
                  font-size: 14px;
                }
              ` }} />
              <div id="document-preview" dangerouslySetInnerHTML={{ __html: documentContent }} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Empréstimo */}
      {showBorrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
              <h3 className="text-lg font-semibold">⚠️ ATENÇÃO: Empréstimo de Equipamento</h3>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowBorrowModal(false);
                setBorrowingItems([]);
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-muted-foreground">
                Os seguintes itens pertencem a outras unidades e serão emprestados:
              </p>
              
              <div className="space-y-3">
                {borrowingItems.map((item) => {
                  const franchise = franchises.find(f => f.id === item.franchise_id);
                  return (
                    <Card key={item.id} className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🟡</span>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Código: {item.code}</p>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="font-medium">De:</span>
                            <span className="text-muted-foreground">
                              {franchise ? `${franchise.name} - ${franchise.city}` : 'Unidade não identificada'}
                            </span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">Para:</span>
                            <span className="text-muted-foreground">
                              {franchises.find(f => f.id === selectedFranchiseId)?.name || 'Unidade selecionada'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>ℹ️ Importante:</strong> Você está ciente de que estes itens precisarão ser transportados entre unidades. Certifique-se de coordenar a logística com as unidades envolvidas.
                </p>
              </Card>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowBorrowModal(false);
                setBorrowingItems([]);
              }}>
                Cancelar
              </Button>
              <Button onClick={(e) => {
                setShowBorrowModal(false);
                // Re-submit o formulário com a confirmação
                const form = document.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}>
                Confirmar Empréstimo
              </Button>
            </div>
          </div>
        </div>
      )}
        </TabsContent>
      </Tabs>
      
      {/* Dialog de confirmação de duplicidade */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Locação Duplicada Detectada</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma reserva no histórico para este cliente, 
              nesta data e com o mesmo brinquedo.
              <br /><br />
              Deseja criar uma nova locação duplicando esta reserva?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowDuplicateWarning(false);
              setSkipDuplicateCheck(true);
              // Re-submeter o formulário
              setTimeout(() => {
                const form = document.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }, 0);
            }}>
              Sim, duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Exportação Excel */}
      <ExportExcelModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportExcel}
        franchises={franchises}
        isFranqueado={isFranqueado}
        userFranchiseId={userFranchise?.id}
      />

      {/* Modal de Envio WhatsApp após salvar locação */}
      <SendWhatsAppModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        sale={savedSaleForWhatsApp}
        companyName={settings?.company_name || 'Nossa Empresa'}
      />

      {/* Drawer de Pagamento Rápido */}
      <QuickPaymentDrawer
        open={!!quickPaymentSale}
        onOpenChange={(open) => !open && setQuickPaymentSale(null)}
        sale={quickPaymentSale}
        onPaymentAdded={() => { fetchSales(); setPaymentRefreshKey(k => k + 1); }}
      />
    </div>
  );
};

export default Sales;
