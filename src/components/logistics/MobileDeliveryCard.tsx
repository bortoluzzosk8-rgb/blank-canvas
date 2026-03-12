import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Package, 
  Wrench, 
  CheckCircle, 
  ExternalLink,
  Calendar,
  DollarSign,
  MessageCircle,
  Warehouse,
  Coffee,
  Truck,
  AlertTriangle,
  Pencil,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DeliveryItem } from "@/pages/admin/Logistics";

interface EquipmentToLoad {
  name: string;
  isUnavailable: boolean;
  unavailableReason?: string;
}

interface MobileDeliveryCardProps {
  item: DeliveryItem;
  onCheckIn?: (item: DeliveryItem) => void;
  onDeleteDepotEvent?: (item: DeliveryItem) => void;
  calculatedEquipments?: EquipmentToLoad[];
  isMotorista?: boolean;
}

export const MobileDeliveryCard = ({
  item,
  onCheckIn,
  onDeleteDepotEvent,
  calculatedEquipments,
  isMotorista = false,
}: MobileDeliveryCardProps) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr + "T12:00:00"), "dd/MM", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const googleMapsUrl = item.address 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${item.address}${item.city ? `, ${item.city}` : ""}${item.state ? ` - ${item.state}` : ""}`
      )}`
    : null;

  // Gerar URL do WhatsApp com mensagem pronta para franqueadora/franqueado
  const generateWhatsAppUrl = () => {
    const phoneClean = item.phone?.replace(/\D/g, "") || "";
    if (!phoneClean) return null;
    
    // Se for motorista, retornar URL simples
    if (isMotorista) {
      return `https://wa.me/55${phoneClean}`;
    }
    
    // Para franqueadora/franqueado: mensagem pronta
    const horario = item.scheduledTime.substring(0, 5);
    const produtos = item.products.join(", ");
    const endereco = [item.address, item.city, item.state]
      .filter(Boolean)
      .join(", ");
    
    const isDesmontagem = item.type === "desmontagem";
    
    let message: string;
    
    if (isDesmontagem) {
      message = `Olá! 👋

Gostaríamos de confirmar a *retirada* do brinquedo no horário ${horario}. Podemos confirmar esse horário?`;
    } else {
      message = `Olá! 👋

Gostaríamos de confirmar a *entrega* do brinquedo para o seu evento:

📦 *Produto(s):* ${produtos}
🕐 *Horário previsto:* ${horario}
📍 *Endereço:* ${endereco}

Podemos confirmar esse horário? Se precisar de algum ajuste, é só nos avisar!`;
    }

    return `https://wa.me/55${phoneClean}?text=${encodeURIComponent(message)}`;
  };

  const whatsappUrl = generateWhatsAppUrl();

  const isMontagem = item.type === "montagem";
  const isDesmontagem = item.type === "desmontagem";
  const isDepotEvent = ["saida_deposito", "volta_deposito", "pausa"].includes(item.type);
  const isCompleted = item.status === "concluido";

  // Renderizar card de evento de depósito
  if (isDepotEvent) {
    const getDepotEventInfo = () => {
      switch (item.type) {
        case "saida_deposito":
          return { icon: Truck, label: "Saída do Depósito", color: "bg-blue-500" };
        case "volta_deposito":
          return { icon: Warehouse, label: "Volta ao Depósito", color: "bg-purple-500" };
        case "pausa":
          return { icon: Coffee, label: "Pausa", color: "bg-amber-500" };
        default:
          return { icon: Package, label: "Evento", color: "bg-gray-500" };
      }
    };

    const eventInfo = getDepotEventInfo();
    const EventIcon = eventInfo.icon;

    return (
      <Card className={`${eventInfo.color} text-white`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <EventIcon className="h-6 w-6" />
              <div>
                <p className="font-bold text-lg">{eventInfo.label}</p>
                <p className="text-white/80 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(item.scheduledTime)}
                </p>
              </div>
            </div>
            {onDeleteDepotEvent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteDepotEvent(item)}
                className="text-white hover:bg-white/20"
              >
                Remover
              </Button>
            )}
          </div>

          {/* Lista de equipamentos para carregar */}
          {item.type === "saida_deposito" && calculatedEquipments && calculatedEquipments.length > 0 && (
            <div className="bg-white/20 rounded-lg p-3 mt-2">
              <p className="text-sm font-bold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Carregar no veículo:
              </p>
              <div className="space-y-1.5">
                {calculatedEquipments.map((equip, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    {equip.isUnavailable && (
                      <AlertTriangle className="h-4 w-4 text-yellow-300 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className={`text-base font-medium ${equip.isUnavailable ? "text-yellow-200" : ""}`}>
                        • {equip.name}
                      </p>
                      {equip.isUnavailable && equip.unavailableReason && (
                        <p className="text-xs text-yellow-200/80">{equip.unavailableReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.type === "saida_deposito" && (!calculatedEquipments || calculatedEquipments.length === 0) && (
            <div className="bg-white/20 rounded-lg p-3 mt-2">
              <p className="text-sm text-white/80 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Nenhum equipamento para carregar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Card de entrega/desmontagem
  return (
    <Card className={`
      overflow-hidden
      ${isMontagem ? "border-l-4 border-l-green-500" : "border-l-4 border-l-orange-500"}
      ${isCompleted ? "opacity-60" : ""}
    `}>
      <CardContent className="p-0">
        {/* Header com tipo e horário */}
        <div className={`
          px-4 py-3 flex items-center justify-between
          ${isMontagem ? "bg-green-50 dark:bg-green-950/30" : "bg-orange-50 dark:bg-orange-950/30"}
        `}>
          <div className="flex items-center gap-3">
            <Badge 
              className={`text-sm px-3 py-1 ${isMontagem ? "bg-green-600 hover:bg-green-600" : "bg-orange-600 hover:bg-orange-600"}`}
            >
              {isMontagem ? (
                <><Package className="h-4 w-4 mr-1" /> Montagem</>
              ) : (
                <><Wrench className="h-4 w-4 mr-1" /> Desmontagem</>
              )}
            </Badge>
            {isCompleted && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ✓ Concluído
                </Badge>
                {onCheckIn && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onCheckIn(item)}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{formatDate(item.logisticsDate)}</span>
          </div>
        </div>

        {/* Produtos em destaque */}
        <div className="px-4 py-3 bg-primary/5 border-b">
          <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Produtos</p>
          <div className="space-y-1">
            {item.products.map((product, index) => (
              <p key={index} className="text-lg font-bold text-foreground">
                • {product}
              </p>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs text-muted-foreground mb-1">Cliente</p>
          <p className="text-lg font-semibold text-foreground">{item.clientName}</p>
        </div>

        {/* Endereço com link para Maps */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs text-muted-foreground mb-1">Endereço</p>
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-base font-medium">{item.address || "Endereço não informado"}</p>
              {item.city && (
                <p className="text-sm text-muted-foreground">
                  {item.city}{item.state ? ` - ${item.state}` : ""}
                </p>
              )}
            </div>
          </div>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-primary font-medium text-sm bg-primary/10 px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir no Google Maps
            </a>
          )}
        </div>

        {/* Telefone/WhatsApp */}
        {item.phone && (
          <div className="px-4 py-3 border-b">
            <p className="text-xs text-muted-foreground mb-1">Contato</p>
            <a
              href={whatsappUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-600 font-medium text-base bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              {item.phone}
            </a>
          </div>
        )}

        {/* Info row: Horário e Valor */}
        <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Horário Logística</p>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">{formatTime(item.scheduledTime)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Saldo a Pagar</p>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {item.remainingAmount > 0 ? (
                <span className="text-lg font-bold text-destructive">
                  R$ {item.remainingAmount.toFixed(2)}
                </span>
              ) : (
                <span className="text-lg font-bold text-green-600">Pago ✓</span>
              )}
            </div>
          </div>
        </div>

        {/* Observações */}
        {item.notes && (
          <div className="px-4 py-3 bg-muted/30 border-b">
            <p className="text-xs text-muted-foreground mb-1">Observações</p>
            <p className="text-sm">{item.notes}</p>
          </div>
        )}

        {/* Monitoria */}
        {item.monitoringInfo?.hasMonitoring && (
          <div className="px-4 py-3 border-b bg-blue-50 dark:bg-blue-950/30">
            <p className="text-xs text-muted-foreground mb-2">Monitoria</p>
            <div className="space-y-2">
              {item.monitoringInfo.slots.map((slot, i) => {
                const hasMonitor = !!slot.monitorName;
                const monitorWhatsAppUrl = slot.monitorPhone 
                  ? `https://wa.me/55${slot.monitorPhone.replace(/\D/g, "")}`
                  : null;
                
                return hasMonitor ? (
                  <Popover key={i}>
                    <PopoverTrigger asChild>
                      <button className="w-full text-left bg-white dark:bg-background rounded-lg p-3 border hover:border-primary transition-colors">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-700 dark:text-blue-400">1 monitor</span>
                          <span className="text-sm text-muted-foreground ml-auto">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          Toque para ver detalhes
                        </p>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 font-medium">
                          <User className="h-5 w-5 text-blue-600" />
                          Detalhes do Monitor
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Nome</p>
                            <p className="font-semibold text-lg">{slot.monitorName}</p>
                          </div>
                          {slot.monitorPhone && (
                            <div>
                              <p className="text-xs text-muted-foreground">Telefone</p>
                              <p className="font-medium">{slot.monitorPhone}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Horário</p>
                            <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                          </div>
                        </div>
                        {monitorWhatsAppUrl && (
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => window.open(monitorWhatsAppUrl, "_blank")}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Abrir WhatsApp
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div key={i} className="bg-white dark:bg-background rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700 dark:text-blue-400">1 monitor</span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Monitor não atribuído
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botão de Check-in ou Editar */}
        {onCheckIn && (
          <div className="p-4">
            {!isCompleted ? (
              <Button
                onClick={() => onCheckIn(item)}
                className={`w-full h-14 text-lg font-bold ${
                  isMontagem 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                <CheckCircle className="h-6 w-6 mr-2" />
                Fazer Check-in
              </Button>
            ) : (
              <Button
                onClick={() => onCheckIn(item)}
                variant="outline"
                className="w-full h-12 text-base font-medium"
              >
                <Pencil className="h-5 w-5 mr-2" />
                Editar Check-in
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
