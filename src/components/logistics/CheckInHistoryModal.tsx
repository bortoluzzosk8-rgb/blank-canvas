import { useState, useEffect } from "react";
import { format, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Calendar, Download, Filter, CheckCircle2, XCircle, Clock, User, MapPin, Package, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface CheckInHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franchiseId: string | null;
}

interface CheckInRecord {
  id: string;
  assignment_date: string;
  assignment_type: string;
  completed_at: string;
  notes: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  client_name: string;
  driver_name: string | null;
  address: string | null;
  products: string[];
}

export function CheckInHistoryModal({ open, onOpenChange, franchiseId }: CheckInHistoryModalProps) {
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, startDate, endDate, typeFilter, paymentFilter, franchiseId]);

  const fetchHistory = async () => {
    setLoading(true);

    try {
      // Buscar check-ins concluídos
      let query = supabase
        .from("logistics_assignments")
        .select(`
          id,
          assignment_date,
          assignment_type,
          completed_at,
          completed_by,
          notes,
          payment_status,
          payment_amount,
          sale_id
        `)
        .eq("status", "concluido")
        .not("completed_at", "is", null)
        .gte("assignment_date", format(startDate, "yyyy-MM-dd"))
        .lte("assignment_date", format(endDate, "yyyy-MM-dd"))
        .order("completed_at", { ascending: false });

      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId);
      }

      if (typeFilter !== "all") {
        query = query.eq("assignment_type", typeFilter);
      }

      // Filtro de pagamento selecionado
      if (paymentFilter === "with_payment") {
        // Apenas pagamentos reais (dinheiro, cartão, pix), excluindo "não recebido"
        query = query.in("payment_status", ["dinheiro", "cartao", "pix", "confirmado", "parcial"]);
      } else if (paymentFilter === "without_payment") {
        // Sem pagamento selecionado OU "não recebido"
        query = query.or("payment_status.is.null,payment_status.eq.nao_recebido");
      }

      const { data: assignmentsData, error: assignmentsError } = await query;

      if (assignmentsError) {
        console.error("Error fetching check-in history:", assignmentsError);
        setLoading(false);
        return;
      }

      // Buscar informações das vendas
      const saleIds = (assignmentsData || [])
        .map((a) => a.sale_id)
        .filter(Boolean) as string[];

      let salesMap: Record<string, { client_name: string; delivery_address: string | null; products: string[] }> = {};

      if (saleIds.length > 0) {
        const { data: salesData } = await supabase
          .from("sales")
          .select(`
            id,
            client_name,
            delivery_address,
            sale_items (product_name)
          `)
          .in("id", saleIds);

        (salesData || []).forEach((sale) => {
          salesMap[sale.id] = {
            client_name: sale.client_name,
            delivery_address: sale.delivery_address,
            products: sale.sale_items?.map((i) => i.product_name) || [],
          };
        });
      }

      // Buscar nomes dos motoristas
      const driverUserIds = (assignmentsData || [])
        .map((a) => a.completed_by)
        .filter(Boolean) as string[];

      let driversMap: Record<string, string> = {};

      if (driverUserIds.length > 0) {
        const { data: driversData } = await supabase
          .from("drivers")
          .select("user_id, name")
          .in("user_id", driverUserIds);

        (driversData || []).forEach((driver) => {
          driversMap[driver.user_id] = driver.name;
        });
      }

      // Montar registros
      const formattedRecords: CheckInRecord[] = (assignmentsData || []).map((assignment) => {
        const saleInfo = assignment.sale_id ? salesMap[assignment.sale_id] : null;
        const driverName = assignment.completed_by ? driversMap[assignment.completed_by] : null;

        return {
          id: assignment.id,
          assignment_date: assignment.assignment_date,
          assignment_type: assignment.assignment_type,
          completed_at: assignment.completed_at,
          notes: assignment.notes,
          payment_status: assignment.payment_status,
          payment_amount: assignment.payment_amount,
          client_name: saleInfo?.client_name || "Evento de Depósito",
          driver_name: driverName,
          address: saleInfo?.delivery_address || null,
          products: saleInfo?.products || [],
        };
      });

      setRecords(formattedRecords);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = records.map((record) => ({
      "Data/Hora Check-in": format(new Date(record.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      "Data Agendada": format(new Date(record.assignment_date), "dd/MM/yyyy", { locale: ptBR }),
      "Tipo": record.assignment_type === "montagem" ? "Montagem" : 
              record.assignment_type === "desmontagem" ? "Desmontagem" :
              record.assignment_type === "saida_deposito" ? "Saída Depósito" :
              record.assignment_type === "volta_deposito" ? "Volta Depósito" : "Pausa",
      "Cliente": record.client_name,
      "Motorista": record.driver_name || "-",
      "Endereço": record.address || "-",
      "Produtos": record.products.join(", ") || "-",
      "Status Pagamento": record.payment_status === "dinheiro" ? "Dinheiro" :
                          record.payment_status === "cartao" ? "Cartão" :
                          record.payment_status === "pix" ? "PIX" :
                          record.payment_status === "nao_recebido" ? "Não Recebido" :
                          record.payment_status === "confirmado" ? "Confirmado" :
                          record.payment_status === "parcial" ? "Parcial" : "-",
      "Valor Recebido": record.payment_amount ? `R$ ${record.payment_amount.toFixed(2)}` : "-",
      "Observações": record.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico Check-ins");
    XLSX.writeFile(workbook, `historico-checkins-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "montagem":
        return "Montagem";
      case "desmontagem":
        return "Desmontagem";
      case "saida_deposito":
        return "Saída Depósito";
      case "volta_deposito":
        return "Volta Depósito";
      case "pausa":
        return "Pausa";
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "montagem":
        return "default";
      case "desmontagem":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPaymentBadge = (status: string | null, amount: number | null) => {
    if (!status) return null;

    switch (status) {
      // Novos valores
      case "dinheiro":
        return (
          <Badge className="bg-green-500 text-white border-green-600 text-sm px-3 py-1">
            ✅ Recebido Dinheiro {amount ? `- R$ ${amount.toFixed(2)}` : ""}
          </Badge>
        );
      case "cartao":
        return (
          <Badge className="bg-blue-500 text-white border-blue-600 text-sm px-3 py-1">
            ✅ Recebido Cartão {amount ? `- R$ ${amount.toFixed(2)}` : ""}
          </Badge>
        );
      case "pix":
        return (
          <Badge className="bg-teal-500 text-white border-teal-600 text-sm px-3 py-1">
            ✅ Recebido PIX {amount ? `- R$ ${amount.toFixed(2)}` : ""}
          </Badge>
        );
      case "nao_recebido":
        return (
          <Badge className="bg-red-500 text-white border-red-600 text-sm px-3 py-1">
            ❌ Não Recebido
          </Badge>
        );
      // Compatibilidade com valores antigos
      case "confirmado":
      case "received":
        return (
          <Badge className="bg-green-500 text-white border-green-600 text-sm px-3 py-1">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Recebido {amount ? `R$ ${amount.toFixed(2)}` : ""}
          </Badge>
        );
      case "parcial":
      case "partial":
        return (
          <Badge className="bg-yellow-500 text-white border-yellow-600 text-sm px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            Parcial {amount ? `R$ ${amount.toFixed(2)}` : ""}
          </Badge>
        );
      case "not_received":
        return (
          <Badge className="bg-red-500 text-white border-red-600 text-sm px-3 py-1">
            <XCircle className="h-3 w-3 mr-1" />
            Não Recebido
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Check-ins
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">De:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Até:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="montagem">Montagem</SelectItem>
                <SelectItem value="desmontagem">Desmontagem</SelectItem>
                <SelectItem value="saida_deposito">Saída Depósito</SelectItem>
                <SelectItem value="volta_deposito">Volta Depósito</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <DollarSign className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with_payment">Com Pagamento</SelectItem>
                <SelectItem value="without_payment">Sem Pagamento</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={exportToExcel} className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          {/* Lista de check-ins */}
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Carregando...
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <History className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum check-in encontrado no período</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeBadgeVariant(record.assignment_type)}>
                          {getTypeLabel(record.assignment_type)}
                        </Badge>
                        <span className="font-medium">{record.client_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(record.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {record.driver_name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>Motorista: {record.driver_name}</span>
                        </div>
                      )}
                      
                      {record.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{record.address}</span>
                        </div>
                      )}

                      {record.products.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground md:col-span-2">
                          <Package className="h-4 w-4" />
                          <span className="truncate">{record.products.join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getPaymentBadge(record.payment_status, record.payment_amount)}
                      
                      {record.notes && (
                        <span className="text-sm text-muted-foreground italic">
                          "{record.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="text-sm text-muted-foreground text-center">
            {records.length} registro(s) encontrado(s)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
