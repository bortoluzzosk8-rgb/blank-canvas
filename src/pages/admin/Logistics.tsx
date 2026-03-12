import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Truck, Plus, History, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogisticsBoard } from "@/components/logistics/LogisticsBoard";
import { AddVehicleModal } from "@/components/logistics/AddVehicleModal";
import { EditVehicleModal } from "@/components/logistics/EditVehicleModal";
import { CheckInModal, type CheckInData } from "@/components/logistics/CheckInModal";
import { AddDepotEventModal, type DepotEventType } from "@/components/logistics/AddDepotEventModal";
import { CheckInHistoryModal } from "@/components/logistics/CheckInHistoryModal";

interface Franchise {
  id: string;
  name: string;
  city: string;
}

interface Driver {
  id: string;
  name: string;
  user_id: string;
}

interface Vehicle {
  id: string;
  name: string;
  plate: string | null;
  color: string;
  franchise_id: string | null;
  driverId?: string | null;
  driverName?: string | null;
}

interface Sale {
  id: string;
  client_name: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_cep: string | null;
  address_observation: string | null;
  rental_start_date: string | null;
  return_date: string | null;
  party_start_time: string | null;
  return_time: string | null;
  franchise_id: string | null;
  total_value: number;
  clients: {
    phone: string;
  } | null;
  sale_items: {
    product_name: string;
    inventory_item_id: string | null;
  }[];
}

interface LogisticsAssignment {
  id: string;
  sale_id: string;
  vehicle_id: string | null;
  assignment_date: string;
  assignment_type: string;
  scheduled_time: string;
  order_position: number;
  status: string;
  notes: string | null;
  completed_at: string | null;
  payment_status: string | null;
  payment_amount: number | null;
}

// Estrutura de equipamento indisponível
export interface UnavailableEquipment {
  productName: string;
  clientName: string;
  returnDate: string;
  saleId: string;
}

export interface MonitoringInfo {
  hasMonitoring: boolean;
  quantity: number;
  slots: { 
    startTime: string; 
    endTime: string;
    monitorName?: string;
    monitorPhone?: string;
  }[];
}

export interface DeliveryItem {
  id: string;
  saleId: string;
  clientName: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  addressObservation: string | null;  // Observação do endereço
  phone: string;
  products: string[];
  type: "montagem" | "desmontagem" | "saida_deposito" | "volta_deposito" | "pausa";
  partyDate: string;           // Data da festa (rental_start_date)
  originalDate: string;        // Data original da montagem/desmontagem
  logisticsDate: string;       // Data editável para logística
  scheduledTime: string;       // Horário editável para logística
  originalTime: string;        // Horário combinado original
  vehicleId: string | null;
  orderPosition: number;
  assignmentId?: string;
  status: "pendente" | "concluido";
  notes: string | null;
  completedAt: string | null;
  paymentStatus: string | null;
  paymentAmount: number | null;
  totalValue: number;          // Valor total da venda
  remainingAmount: number;     // Saldo restante a pagar
  monitoringInfo: MonitoringInfo | null;  // Informação de monitoria
}

const Logistics = () => {
  const { isFranqueadora, isMotorista, isVendedor, userFranchise, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all");
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [unavailableEquipments, setUnavailableEquipments] = useState<UnavailableEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [checkInItem, setCheckInItem] = useState<DeliveryItem | null>(null);
  const [isEditingCheckIn, setIsEditingCheckIn] = useState(false);
  const [depotEventVehicle, setDepotEventVehicle] = useState<{ id: string; name: string } | null>(null);
  const [showCheckInHistory, setShowCheckInHistory] = useState(false);
  const [montagemInfo, setMontagemInfo] = useState<{
    paymentStatus: string | null;
    paymentAmount: number | null;
    notes: string | null;
    completedAt: string | null;
  } | null>(null);
  
  // Estado para filtro de motorista
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [currentUserDriverId, setCurrentUserDriverId] = useState<string | null>(null);

  // Carregar franquias
  useEffect(() => {
    const fetchFranchises = async () => {
      if (!user?.id) return;

      try {
        // Buscar a franquia raiz do usuário logado
        const { data: userFranchiseData } = await supabase
          .from("user_franchises")
          .select("franchise_id")
          .eq("user_id", user.id)
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
          .or(`id.eq.${rootFranchiseId},parent_franchise_id.eq.${rootFranchiseId}`);

        if (error) {
          console.error("Error fetching franchises:", error);
          return;
        }

        setFranchises(data || []);

        // Se não é franqueadora, setar a franquia do usuário
        if (!isFranqueadora && userFranchise) {
          setSelectedFranchise(userFranchise.id);
        }
      } catch (error) {
        console.error("Error fetching franchises:", error);
      }
    };

    fetchFranchises();
  }, [isFranqueadora, userFranchise, user?.id]);

  // Carregar veículos e locações
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const franchiseFilter = selectedFranchise !== "all" ? selectedFranchise : null;
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // Buscar veículos
      let vehiclesQuery = supabase
        .from("logistics_vehicles")
        .select("*")
        .eq("is_active", true);

      if (franchiseFilter) {
        vehiclesQuery = vehiclesQuery.eq("franchise_id", franchiseFilter);
      }

      const { data: vehiclesData, error: vehiclesError } = await vehiclesQuery;

      if (vehiclesError) {
        console.error("Error fetching vehicles:", vehiclesError);
      }

      // Buscar motoristas
      let driversQuery = supabase.from("drivers").select("id, name, user_id");
      if (franchiseFilter) {
        driversQuery = driversQuery.eq("franchise_id", franchiseFilter);
      }
      const { data: driversData } = await driversQuery;
      setDrivers(driversData || []);
      
      // Se é motorista, identificar o driver_id correspondente ao usuário logado
      if (isMotorista && user) {
        const loggedDriver = driversData?.find((d: Driver) => d.user_id === user.id);
        if (loggedDriver) {
          setCurrentUserDriverId(loggedDriver.id);
          // Sempre selecionar o motorista logado se ainda não tiver selecionado ninguém válido
          setSelectedDriverId((prev) => {
            if (prev === "all" || !prev) {
              return loggedDriver.id;
            }
            return prev;
          });
        }
      }

      // Buscar atribuições de motorista para veículos na data selecionada
      const vehicleIds = (vehiclesData || []).map((v: Vehicle) => v.id);
      let driverAssignmentsQuery = supabase
        .from("vehicle_driver_assignments")
        .select("vehicle_id, driver_id")
        .eq("assignment_date", dateStr);

      if (vehicleIds.length > 0) {
        driverAssignmentsQuery = driverAssignmentsQuery.in("vehicle_id", vehicleIds);
      }

      const { data: driverAssignmentsData } = await driverAssignmentsQuery;

      // Mapear motorista para cada veículo
      const driverByVehicle: Record<string, string> = {};
      (driverAssignmentsData || []).forEach((da: { vehicle_id: string; driver_id: string }) => {
        driverByVehicle[da.vehicle_id] = da.driver_id;
      });

      const vehiclesWithDrivers = (vehiclesData || []).map((v: Vehicle) => {
        const driverId = driverByVehicle[v.id] || null;
        const driver = driversData?.find((d: Driver) => d.id === driverId);
        return {
          ...v,
          driverId,
          driverName: driver?.name || null,
        };
      });

      setVehicles(vehiclesWithDrivers);

      // Primeiro, buscar logistics_assignments que tenham assignment_date = dateStr
      // para incluir vendas que foram reagendadas para esta data
      let reassignedQuery = supabase
        .from("logistics_assignments")
        .select("sale_id, assignment_type")
        .eq("assignment_date", dateStr);

      if (franchiseFilter) {
        reassignedQuery = reassignedQuery.eq("franchise_id", franchiseFilter);
      }

      const { data: reassignedData } = await reassignedQuery;
      const reassignedSaleIds = reassignedData?.map((a) => a.sale_id).filter(Boolean) || [];
      const uniqueReassignedSaleIds = [...new Set(reassignedSaleIds)];

      // Buscar vendas com entrega ou retorno na data selecionada OU vendas reagendadas
      let salesQuery = supabase
        .from("sales")
        .select(`
          id,
          client_name,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_cep,
          address_observation,
          rental_start_date,
          return_date,
          party_start_time,
          return_time,
          franchise_id,
          total_value,
          clients (
            phone
          ),
          sale_items (
            product_name,
            inventory_item_id
          )
        `)
        .neq("status", "cancelled");

      if (franchiseFilter) {
        salesQuery = salesQuery.eq("franchise_id", franchiseFilter);
      }

      // Filtrar por data de entrega ou retorno OU vendas reagendadas
      if (uniqueReassignedSaleIds.length > 0) {
        salesQuery = salesQuery.or(
          `rental_start_date.eq.${dateStr},return_date.eq.${dateStr},id.in.(${uniqueReassignedSaleIds.join(",")})`
        );
      } else {
        salesQuery = salesQuery.or(`rental_start_date.eq.${dateStr},return_date.eq.${dateStr}`);
      }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error("Error fetching sales:", salesError);
        setLoading(false);
        return;
      }

      // Buscar TODAS as atribuições existentes para as vendas encontradas
      const saleIds = (salesData || []).map((s: Sale) => s.id);
      let assignmentsQuery = supabase
        .from("logistics_assignments")
        .select("*");

      if (saleIds.length > 0) {
        assignmentsQuery = assignmentsQuery.in("sale_id", saleIds);
      }

      if (franchiseFilter) {
        assignmentsQuery = assignmentsQuery.eq("franchise_id", franchiseFilter);
      }

      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError);
      }

      // Buscar pagamentos para calcular o saldo restante
      let paymentsQuery = supabase
        .from("sale_payments")
        .select("sale_id, amount, status");

      if (saleIds.length > 0) {
        paymentsQuery = paymentsQuery.in("sale_id", saleIds);
      }

      const { data: paymentsData } = await paymentsQuery;

      // Calcular total pago por venda
      const paidBySale: Record<string, number> = {};
      (paymentsData || []).forEach((p) => {
        if (p.status === "paid") {
          paidBySale[p.sale_id] = (paidBySale[p.sale_id] || 0) + Number(p.amount);
        }
      });

      // Buscar dados de monitoria para as vendas (incluindo dados do monitor)
      let monitoringQuery = supabase
        .from("sale_monitoring_slots")
        .select(`
          sale_id, 
          monitors_quantity, 
          start_time, 
          end_time,
          monitors (
            name,
            phone
          )
        `);

      if (saleIds.length > 0) {
        monitoringQuery = monitoringQuery.in("sale_id", saleIds);
      }

      const { data: monitoringData } = await monitoringQuery;

      // Agrupar monitorias por sale_id
      const monitoringBySale: Record<string, { quantity: number; slots: { startTime: string; endTime: string; monitorName?: string; monitorPhone?: string }[] }> = {};
      (monitoringData || []).forEach((m: { sale_id: string; monitors_quantity: number; start_time: string | null; end_time: string | null; monitors: { name: string; phone: string } | null }) => {
        if (!monitoringBySale[m.sale_id]) {
          monitoringBySale[m.sale_id] = { quantity: 0, slots: [] };
        }
        monitoringBySale[m.sale_id].quantity += m.monitors_quantity || 0;
        if (m.start_time || m.end_time) {
          monitoringBySale[m.sale_id].slots.push({
            startTime: m.start_time || "",
            endTime: m.end_time || "",
            monitorName: m.monitors?.name,
            monitorPhone: m.monitors?.phone,
          });
        }
      });

      // Buscar eventos de depósito (logistics_assignments sem sale_id)
      let depotEventsQuery = supabase
        .from("logistics_assignments")
        .select("*")
        .eq("assignment_date", dateStr)
        .is("sale_id", null);

      if (franchiseFilter) {
        depotEventsQuery = depotEventsQuery.eq("franchise_id", franchiseFilter);
      }

      const { data: depotEventsData } = await depotEventsQuery;

      // Criar itens de entrega
      const items: DeliveryItem[] = [];
      const assignments = assignmentsData || [];

      (salesData || []).forEach((sale: Sale) => {
        const products = sale.sale_items?.map((item) => item.product_name) || [];

        // Verificar montagem
        const montagemAssignment = assignments.find(
          (a: LogisticsAssignment) => a.sale_id === sale.id && a.assignment_type === "montagem"
        );
        
        // Mostrar montagem se:
        // - Data original é hoje E não tem assignment OU assignment é para hoje
        // - OU tem assignment para hoje (reagendado)
        const montagemLogisticsDate = montagemAssignment?.assignment_date || sale.rental_start_date;
        const shouldShowMontagem = montagemLogisticsDate === dateStr;

        if (shouldShowMontagem) {
          const totalValue = Number(sale.total_value) || 0;
          const totalPaid = paidBySale[sale.id] || 0;
          const remainingAmount = Math.max(0, totalValue - totalPaid);

          const saleMonitoring = monitoringBySale[sale.id];
          items.push({
            id: `${sale.id}-montagem`,
            saleId: sale.id,
            clientName: sale.client_name,
            address: sale.delivery_address || "",
            city: sale.delivery_city || "",
            state: sale.delivery_state || "",
            cep: sale.delivery_cep || "",
            addressObservation: sale.address_observation || null,
            phone: sale.clients?.phone || "",
            products,
            type: "montagem",
            partyDate: sale.rental_start_date || "",
            originalDate: sale.rental_start_date || "",
            logisticsDate: montagemAssignment?.assignment_date || sale.rental_start_date || dateStr,
            scheduledTime: montagemAssignment?.scheduled_time || sale.party_start_time || "08:00:00",
            originalTime: sale.party_start_time || "08:00:00",
            vehicleId: montagemAssignment?.vehicle_id || null,
            orderPosition: montagemAssignment?.order_position || 0,
            assignmentId: montagemAssignment?.id,
            status: (montagemAssignment?.status as "pendente" | "concluido") || "pendente",
            notes: montagemAssignment?.notes || null,
            completedAt: montagemAssignment?.completed_at || null,
            paymentStatus: montagemAssignment?.payment_status || null,
            paymentAmount: montagemAssignment?.payment_amount || null,
            totalValue,
            remainingAmount,
            monitoringInfo: saleMonitoring ? {
              hasMonitoring: saleMonitoring.quantity > 0,
              quantity: saleMonitoring.quantity,
              slots: saleMonitoring.slots,
            } : null,
          });
        }

        // Verificar desmontagem
        const desmontagemAssignment = assignments.find(
          (a: LogisticsAssignment) => a.sale_id === sale.id && a.assignment_type === "desmontagem"
        );
        
        // Mostrar desmontagem se:
        // - Data original é hoje E não tem assignment OU assignment é para hoje
        // - OU tem assignment para hoje (reagendado)
        const desmontagemLogisticsDate = desmontagemAssignment?.assignment_date || sale.return_date;
        const shouldShowDesmontagem = desmontagemLogisticsDate === dateStr;

        if (shouldShowDesmontagem) {
          const totalValue = Number(sale.total_value) || 0;
          const totalPaid = paidBySale[sale.id] || 0;
          const remainingAmount = Math.max(0, totalValue - totalPaid);

          const saleMonitoring = monitoringBySale[sale.id];
          items.push({
            id: `${sale.id}-desmontagem`,
            saleId: sale.id,
            clientName: sale.client_name,
            address: sale.delivery_address || "",
            city: sale.delivery_city || "",
            state: sale.delivery_state || "",
            cep: sale.delivery_cep || "",
            addressObservation: sale.address_observation || null,
            phone: sale.clients?.phone || "",
            products,
            type: "desmontagem",
            partyDate: sale.rental_start_date || "",
            originalDate: sale.return_date || "",
            logisticsDate: desmontagemAssignment?.assignment_date || sale.return_date || dateStr,
            scheduledTime: desmontagemAssignment?.scheduled_time || sale.return_time || "18:00:00",
            originalTime: sale.return_time || "18:00:00",
            vehicleId: desmontagemAssignment?.vehicle_id || null,
            orderPosition: desmontagemAssignment?.order_position || 0,
            assignmentId: desmontagemAssignment?.id,
            status: (desmontagemAssignment?.status as "pendente" | "concluido") || "pendente",
            notes: desmontagemAssignment?.notes || null,
            completedAt: desmontagemAssignment?.completed_at || null,
            paymentStatus: desmontagemAssignment?.payment_status || null,
            paymentAmount: desmontagemAssignment?.payment_amount || null,
            totalValue,
            remainingAmount,
            monitoringInfo: saleMonitoring ? {
              hasMonitoring: saleMonitoring.quantity > 0,
              quantity: saleMonitoring.quantity,
              slots: saleMonitoring.slots,
            } : null,
          });
        }
      });

      // Adicionar eventos de depósito
      (depotEventsData || []).forEach((event: LogisticsAssignment) => {
        const eventType = event.assignment_type as "saida_deposito" | "volta_deposito" | "pausa";
        items.push({
          id: `depot-${event.id}`,
          saleId: "",
          clientName: "",
          address: "",
          city: "",
          state: "",
          cep: "",
          addressObservation: null,
          phone: "",
          products: [],
          type: eventType,
          partyDate: "",
          originalDate: event.assignment_date,
          logisticsDate: event.assignment_date,
          scheduledTime: event.scheduled_time,
          originalTime: event.scheduled_time,
          vehicleId: event.vehicle_id,
          orderPosition: event.order_position || 0,
          assignmentId: event.id,
          status: (event.status as "pendente" | "concluido") || "pendente",
          notes: event.notes,
          completedAt: event.completed_at,
          paymentStatus: null,
          paymentAmount: null,
          totalValue: 0,
          remainingAmount: 0,
          monitoringInfo: null,
        });
      });

      // Buscar equipamentos alugados que não estão no depósito
      // Equipamentos onde: rental_start_date <= dateStr E return_date >= dateStr
      // E não são as vendas que aparecem no dia (pois essas já estão na logística)
      const currentSaleIds = items.map(i => i.saleId).filter(Boolean);
      
      let rentedQuery = supabase
        .from("sales")
        .select(`
          id,
          client_name,
          return_date,
          sale_items (
            product_name
          )
        `)
        .neq("status", "cancelled")
        .lte("rental_start_date", dateStr)
        .gte("return_date", dateStr);
      
      if (franchiseFilter) {
        rentedQuery = rentedQuery.eq("franchise_id", franchiseFilter);
      }
      
      // Excluir vendas que já estão na logística do dia (montagem ou desmontagem)
      if (currentSaleIds.length > 0) {
        rentedQuery = rentedQuery.not("id", "in", `(${currentSaleIds.join(",")})`);
      }
      
      const { data: rentedData } = await rentedQuery;
      
      // Criar lista de equipamentos indisponíveis
      const unavailable: UnavailableEquipment[] = [];
      (rentedData || []).forEach((sale) => {
        const products = sale.sale_items?.map((item: { product_name: string }) => item.product_name) || [];
        products.forEach((productName: string) => {
          unavailable.push({
            productName,
            clientName: sale.client_name,
            returnDate: sale.return_date || "",
            saleId: sale.id,
          });
        });
      });
      
      setUnavailableEquipments(unavailable);
      setDeliveryItems(items);
      setLoading(false);
    };

    fetchData();
  }, [selectedDate, selectedFranchise]);

  const handleAssignmentChange = async (item: DeliveryItem, vehicleId: string | null, time: string, position: number, logisticsDate?: string) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const newLogisticsDate = logisticsDate || dateStr;

    // Prioridade para franchiseId:
    // 1. Franquia selecionada no dropdown
    // 2. Franquia do veículo de destino
    // 3. Franquia do usuário (fallback)
    let franchiseId: string | null = selectedFranchise !== "all" ? selectedFranchise : null;

    if (!franchiseId && vehicleId) {
      const targetVehicle = vehicles.find(v => v.id === vehicleId);
      franchiseId = targetVehicle?.franchise_id || null;
    }

    if (!franchiseId) {
      franchiseId = userFranchise?.id || null;
    }

    if (!franchiseId) {
      toast.error("Selecione uma unidade antes de atribuir entregas");
      return;
    }

    try {
      if (item.assignmentId) {
        // Atualizar existente
        const updateData: Record<string, unknown> = {
          vehicle_id: vehicleId,
          scheduled_time: time,
          order_position: position,
        };
        if (logisticsDate) {
          updateData.assignment_date = logisticsDate;
        }
        const { error } = await supabase
          .from("logistics_assignments")
          .update(updateData)
          .eq("id", item.assignmentId);

        if (error) throw error;
      } else {
        // Criar nova atribuição
        const { data, error } = await supabase
          .from("logistics_assignments")
          .insert({
            sale_id: item.saleId,
            vehicle_id: vehicleId,
            franchise_id: franchiseId,
            assignment_date: newLogisticsDate,
            assignment_type: item.type,
            scheduled_time: time,
            order_position: position,
          })
          .select()
          .single();

        if (error) throw error;

        // Se a nova data for diferente da selecionada, remover o item da lista
        if (newLogisticsDate !== dateStr) {
          setDeliveryItems((prev) => prev.filter((i) => i.id !== item.id));
          toast.success(`Entrega reagendada para ${format(parseISO(newLogisticsDate), "dd/MM", { locale: ptBR })}`);
          return;
        }

        // Atualizar o item local com o novo ID
        setDeliveryItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, assignmentId: data.id, vehicleId, scheduledTime: time, orderPosition: position, logisticsDate: newLogisticsDate } : i
          )
        );
        return;
      }

      // Se a data foi alterada para uma data diferente da selecionada, remover o card
      if (logisticsDate && logisticsDate !== dateStr) {
        setDeliveryItems((prev) => prev.filter((i) => i.id !== item.id));
        toast.success(`Entrega reagendada para ${format(parseISO(logisticsDate), "dd/MM", { locale: ptBR })}`);
        return;
      }

      // Atualizar estado local
      setDeliveryItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, vehicleId, scheduledTime: time, orderPosition: position, logisticsDate: newLogisticsDate } : i
        )
      );
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast.error("Erro ao salvar atribuição");
    }
  };

  const handleVehicleAdded = (newVehicle: Vehicle) => {
    setVehicles((prev) => [...prev, { ...newVehicle, driverId: null, driverName: null }]);
    toast.success("Veículo adicionado com sucesso");
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
  };

  const handleVehicleUpdated = (updatedVehicle: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === updatedVehicle.id
          ? { ...v, name: updatedVehicle.name, plate: updatedVehicle.plate, color: updatedVehicle.color }
          : v
      )
    );
  };

  const handleVehicleDeleted = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  };

  const handleDriverChange = async (vehicleId: string, driverId: string | null) => {
    const franchiseId = selectedFranchise !== "all" ? selectedFranchise : userFranchise?.id;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (!franchiseId) {
      toast.error("Selecione uma unidade");
      return;
    }

    try {
      if (driverId) {
        // Upsert - criar ou atualizar atribuição
        const { error } = await supabase
          .from("vehicle_driver_assignments")
          .upsert(
            {
              vehicle_id: vehicleId,
              driver_id: driverId,
              assignment_date: dateStr,
              franchise_id: franchiseId,
            },
            { onConflict: "vehicle_id,assignment_date" }
          );

        if (error) throw error;

        // Atualizar estado local
        const driver = drivers.find((d) => d.id === driverId);
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicleId ? { ...v, driverId, driverName: driver?.name || null } : v
          )
        );
        toast.success("Motorista atribuído com sucesso");
      } else {
        // Remover atribuição
        const { error } = await supabase
          .from("vehicle_driver_assignments")
          .delete()
          .eq("vehicle_id", vehicleId)
          .eq("assignment_date", dateStr);

        if (error) throw error;

        // Atualizar estado local
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicleId ? { ...v, driverId: null, driverName: null } : v))
        );
        toast.success("Motorista removido do veículo");
      }
    } catch (error) {
      console.error("Error updating driver assignment:", error);
      toast.error("Erro ao atribuir motorista");
    }
  };

  const handleOpenCheckIn = async (item: DeliveryItem) => {
    // Verificar se é edição (item já está concluído)
    const isEditing = item.status === "concluido";
    setIsEditingCheckIn(isEditing);

    // Se for desmontagem, buscar info da montagem correspondente
    if (item.type === "desmontagem" && item.saleId) {
      const { data } = await supabase
        .from("logistics_assignments")
        .select("payment_status, payment_amount, notes, completed_at")
        .eq("sale_id", item.saleId)
        .eq("assignment_type", "montagem")
        .eq("status", "concluido")
        .single();

      if (data) {
        setMontagemInfo({
          paymentStatus: data.payment_status,
          paymentAmount: data.payment_amount,
          notes: data.notes,
          completedAt: data.completed_at,
        });
      } else {
        setMontagemInfo(null);
      }
    } else {
      setMontagemInfo(null);
    }

    setCheckInItem(item);
  };

  const handleCheckIn = async (data: CheckInData) => {
    if (!checkInItem) return;

    const franchiseId = selectedFranchise !== "all" ? selectedFranchise : userFranchise?.id;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (checkInItem.assignmentId) {
        // Atualizar assignment existente
        const { error } = await supabase
          .from("logistics_assignments")
          .update({
            status: "concluido",
            notes: data.notes || null,
            completed_at: new Date().toISOString(),
            completed_by: userId,
            payment_status: data.paymentStatus,
            payment_amount: data.paymentAmount,
          })
          .eq("id", checkInItem.assignmentId);

        if (error) throw error;
      } else {
        // Criar nova assignment com status concluido
        const { error } = await supabase
          .from("logistics_assignments")
          .insert({
            sale_id: checkInItem.saleId,
            vehicle_id: checkInItem.vehicleId,
            franchise_id: franchiseId,
            assignment_date: checkInItem.logisticsDate || dateStr,
            assignment_type: checkInItem.type,
            scheduled_time: checkInItem.scheduledTime,
            order_position: checkInItem.orderPosition,
            status: "concluido",
            notes: data.notes || null,
            completed_at: new Date().toISOString(),
            completed_by: userId,
            payment_status: data.paymentStatus,
            payment_amount: data.paymentAmount,
          });

        if (error) throw error;
      }

      // Se for check-in de montagem (entrega), atualizar status da venda para "delivered"
      if (checkInItem.type === "montagem" && checkInItem.saleId) {
        const { error: saleError } = await supabase
          .from("sales")
          .update({
            status: "delivered",
            delivery_date: new Date().toISOString().split("T")[0],
          })
          .eq("id", checkInItem.saleId);

        if (saleError) {
          console.error("Erro ao atualizar status da venda:", saleError);
          // Não bloquear o check-in se falhar a atualização do status
        }
      }

      // Atualizar estado local
      setDeliveryItems((prev) =>
        prev.map((i) =>
          i.id === checkInItem.id
            ? {
                ...i,
                status: "concluido",
                notes: data.notes || null,
                completedAt: new Date().toISOString(),
                paymentStatus: data.paymentStatus,
                paymentAmount: data.paymentAmount,
              }
            : i
        )
      );

      const successMessage = isEditingCheckIn 
        ? "Check-in atualizado com sucesso!" 
        : checkInItem.type === "montagem"
          ? "Check-in realizado! Pedido marcado como entregue."
          : "Check-in realizado com sucesso!";
      toast.success(successMessage);
      setCheckInItem(null);
      setIsEditingCheckIn(false);
    } catch (error) {
      console.error("Error saving check-in:", error);
      toast.error("Erro ao salvar check-in");
    }
  };

  const handleAddDepotEvent = async (data: {
    type: DepotEventType;
    scheduledTime: string;
    notes: string;
  }) => {
    if (!depotEventVehicle) return;

    const franchiseId = selectedFranchise !== "all" ? selectedFranchise : userFranchise?.id;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (!franchiseId) {
      toast.error("Selecione uma unidade");
      return;
    }

    try {
      const { data: insertedData, error } = await supabase
        .from("logistics_assignments")
        .insert({
          vehicle_id: depotEventVehicle.id,
          franchise_id: franchiseId,
          assignment_date: dateStr,
          assignment_type: data.type,
          scheduled_time: data.scheduledTime,
          notes: data.notes || null,
          order_position: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar ao estado local
      const newItem: DeliveryItem = {
        id: `depot-${insertedData.id}`,
        saleId: "",
        clientName: "",
        address: "",
        city: "",
        state: "",
        cep: "",
        addressObservation: null,
        phone: "",
        products: [],
        type: data.type,
        partyDate: "",
        originalDate: dateStr,
        logisticsDate: dateStr,
        scheduledTime: data.scheduledTime,
        originalTime: data.scheduledTime,
        vehicleId: depotEventVehicle.id,
        orderPosition: 0,
        assignmentId: insertedData.id,
        status: "pendente",
        notes: data.notes || null,
        completedAt: null,
        paymentStatus: null,
        paymentAmount: null,
        totalValue: 0,
        remainingAmount: 0,
        monitoringInfo: null,
      };

      setDeliveryItems((prev) => [...prev, newItem]);
      toast.success("Evento adicionado com sucesso!");
      setDepotEventVehicle(null);
    } catch (error) {
      console.error("Error adding depot event:", error);
      toast.error("Erro ao adicionar evento");
    }
  };

  const handleDeleteDepotEvent = async (item: DeliveryItem) => {
    if (!item.assignmentId) return;

    try {
      const { error } = await supabase
        .from("logistics_assignments")
        .delete()
        .eq("id", item.assignmentId);

      if (error) throw error;

      setDeliveryItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Evento removido");
    } catch (error) {
      console.error("Error deleting depot event:", error);
      toast.error("Erro ao remover evento");
    }
  };

  const handleOpenDepotEventModal = (vehicleId: string, vehicleName: string) => {
    setDepotEventVehicle({ id: vehicleId, name: vehicleName });
  };

  // Editar endereço de entrega
  const handleEditAddress = async (
    saleId: string,
    address: { address: string; city: string; state: string; cep: string; observation: string }
  ) => {
    try {
      const { error } = await supabase
        .from("sales")
        .update({
          delivery_address: address.address,
          delivery_city: address.city,
          delivery_state: address.state,
          delivery_cep: address.cep,
          address_observation: address.observation,
        })
        .eq("id", saleId);

      if (error) throw error;

      // Atualizar estado local
      setDeliveryItems((prev) =>
        prev.map((item) =>
          item.saleId === saleId
            ? {
                ...item,
                address: address.address,
                city: address.city,
                state: address.state,
                cep: address.cep,
                addressObservation: address.observation,
              }
            : item
        )
      );

      toast.success("Endereço atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Erro ao atualizar endereço");
      throw error;
    }
  };

  // Filtrar veículos pelo motorista selecionado (apenas para motoristas)
  const filteredVehicles = useMemo(() => {
    if (!isMotorista) {
      return vehicles;
    }
    
    // Se selecionou "todos", retorna todos os veículos mas com limite para evitar travamento
    if (selectedDriverId === "all") {
      return vehicles.slice(0, 20);
    }
    
    // Caso contrário, filtrar pelo motorista específico
    const driverToFilter = selectedDriverId || currentUserDriverId;
    if (!driverToFilter) {
      return [];
    }
    
    return vehicles.filter((v) => v.driverId === driverToFilter);
  }, [vehicles, selectedDriverId, isMotorista, currentUserDriverId]);

  // Filtrar também os deliveryItems pelos veículos filtrados (para motoristas)
  const filteredDeliveryItems = useMemo(() => {
    if (!isMotorista) {
      return deliveryItems;
    }
    
    const filteredVehicleIds = new Set(filteredVehicles.map((v) => v.id));
    
    // Limitar quantidade de itens quando há muitos para evitar travamento
    const filtered = deliveryItems.filter(
      (item) => item.vehicleId && filteredVehicleIds.has(item.vehicleId)
    );
    
    return filtered.slice(0, 100);
  }, [deliveryItems, filteredVehicles, isMotorista]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Logística
          </h2>
          <p className="text-muted-foreground">Gerencie entregas e retiradas de brinquedos</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Data */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="justify-start text-left font-normal min-w-[140px] transition-all"
                key={selectedDate.toISOString()}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span className="font-semibold text-base">
                  {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Seletor de Franquia - visível para franqueadora e vendedor */}
          {(isFranqueadora || isVendedor) && (
            <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                {franchises.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} - {f.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Seletor de Motorista - apenas para motoristas */}
          {isMotorista && drivers.length > 0 && (
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="w-[200px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecionar motorista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name} {driver.id === currentUserDriverId ? "(Você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Aviso quando está mostrando dados limitados */}
          {isMotorista && selectedDriverId === "all" && vehicles.length > 20 && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4" />
              Mostrando primeiros 20 veículos de {vehicles.length}
            </div>
          )}

          {/* Botão Ver Histórico - ocultar para motoristas */}
          {!isMotorista && (
            <Button variant="outline" onClick={() => setShowCheckInHistory(true)}>
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          )}

          {/* Botão Adicionar Veículo - ocultar para motoristas */}
          {!isMotorista && (
            <Button onClick={() => {
              if ((isFranqueadora || isVendedor) && selectedFranchise === "all") {
                toast.error("Selecione uma unidade antes de adicionar veículos");
                return;
              }
              setShowAddVehicle(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Carro
            </Button>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-sm text-muted-foreground">Montagem (Entrega)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-sm text-muted-foreground">Desmontagem (Retirada)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-sm text-muted-foreground">Saída/Volta Depósito</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span className="text-sm text-muted-foreground">Pausa</span>
        </div>
      </div>

      {/* Aviso para vendedores em "Todas as unidades" */}
      {isVendedor && selectedFranchise === "all" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Selecione uma unidade específica para poder reorganizar as entregas nos veículos.</span>
        </div>
      )}

      {/* Board Kanban */}
      <LogisticsBoard
        vehicles={filteredVehicles}
        deliveryItems={filteredDeliveryItems}
        loading={loading}
        selectedDate={selectedDate}
        onAssignmentChange={handleAssignmentChange}
        onCheckIn={handleOpenCheckIn}
        onDeleteDepotEvent={!isMotorista ? handleDeleteDepotEvent : undefined}
        onAddDepotEvent={!isMotorista ? handleOpenDepotEventModal : undefined}
        onEditVehicle={!isMotorista ? handleEditVehicle : undefined}
        onEditAddress={!isMotorista ? handleEditAddress : undefined}
        canDrag={!isMotorista && !(isVendedor && selectedFranchise === "all")}
        drivers={drivers}
        onDriverChange={!isMotorista ? handleDriverChange : undefined}
        unavailableEquipments={unavailableEquipments}
        isMotorista={isMotorista}
      />

      {/* Modal Adicionar Veículo */}
      <AddVehicleModal
        open={showAddVehicle}
        onOpenChange={setShowAddVehicle}
        franchiseId={selectedFranchise !== "all" ? selectedFranchise : userFranchise?.id || null}
        onVehicleAdded={handleVehicleAdded}
      />

      {/* Modal Editar Veículo */}
      {editingVehicle && (
        <EditVehicleModal
          open={!!editingVehicle}
          onOpenChange={(open) => !open && setEditingVehicle(null)}
          vehicle={editingVehicle}
          onVehicleUpdated={handleVehicleUpdated}
          onVehicleDeleted={handleVehicleDeleted}
        />
      )}

      {/* Modal de Check-in */}
      {checkInItem && (
        <CheckInModal
          open={!!checkInItem}
          onOpenChange={(open) => {
            if (!open) {
              setCheckInItem(null);
              setMontagemInfo(null);
              setIsEditingCheckIn(false);
            }
          }}
          clientName={checkInItem.clientName}
          type={checkInItem.type}
          onConfirm={handleCheckIn}
          montagemInfo={montagemInfo}
          isEditing={isEditingCheckIn}
          initialData={isEditingCheckIn ? {
            notes: checkInItem.notes || "",
            paymentStatus: checkInItem.paymentStatus as "dinheiro" | "cartao" | "pix" | "nao_recebido" | null,
            paymentAmount: checkInItem.paymentAmount,
          } : undefined}
        />
      )}

      {/* Modal Adicionar Evento de Depósito */}
      {depotEventVehicle && (
        <AddDepotEventModal
          open={!!depotEventVehicle}
          onOpenChange={(open) => !open && setDepotEventVehicle(null)}
          vehicleId={depotEventVehicle.id}
          vehicleName={depotEventVehicle.name}
          onConfirm={handleAddDepotEvent}
        />
      )}

      {/* Modal Histórico de Check-ins */}
      <CheckInHistoryModal
        open={showCheckInHistory}
        onOpenChange={setShowCheckInHistory}
        franchiseId={selectedFranchise !== "all" ? selectedFranchise : null}
      />
    </div>
  );
};

export default Logistics;
