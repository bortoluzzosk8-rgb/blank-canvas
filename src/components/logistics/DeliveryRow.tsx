import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GripVertical, Phone, MapPin, CheckCircle, ExternalLink, Pencil, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { DeliveryItem } from "@/pages/admin/Logistics";
import { EditAddressModal } from "./EditAddressModal";
interface DeliveryRowProps {
  item: DeliveryItem;
  onTimeChange?: (item: DeliveryItem, newTime: string) => void;
  onDateChange?: (item: DeliveryItem, newDate: string) => void;
  onCheckIn?: (item: DeliveryItem) => void;
  onEditAddress?: (saleId: string, address: { address: string; city: string; state: string; cep: string; observation: string }) => Promise<void>;
  canDrag?: boolean;
  isMotorista?: boolean;
}

export const DeliveryRow = ({
  item,
  onTimeChange,
  onDateChange,
  onCheckIn,
  onEditAddress,
  canDrag = true,
  isMotorista = false,
}: DeliveryRowProps) => {
  const [editableDate, setEditableDate] = useState(item.logisticsDate);
  const [editableTime, setEditableTime] = useState(item.scheduledTime.substring(0, 5));
  const [showEditAddress, setShowEditAddress] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  const handleTimeUpdate = () => {
    if (onTimeChange && editableTime !== item.scheduledTime.substring(0, 5)) {
      onTimeChange(item, editableTime);
    }
  };

  const handleDateUpdate = () => {
    if (onDateChange && editableDate !== item.logisticsDate) {
      onDateChange(item, editableDate);
    }
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
    
    // Formatar a data de logística para a mensagem
    const dataRetirada = item.logisticsDate 
      ? format(parseISO(item.logisticsDate), "dd/MM/yyyy", { locale: ptBR })
      : "";
    
    let message: string;
    
    if (isDesmontagem) {
      message = `Olá! 👋

Gostaríamos de confirmar a *retirada* do brinquedo no dia ${dataRetirada} às ${horario}. Podemos confirmar esse horário?`;
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
  const isCompleted = item.status === "concluido";
  const productsText = item.products.join(", ");

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`
        ${isMontagem ? "bg-green-50 dark:bg-green-950/20" : "bg-orange-50 dark:bg-orange-950/20"}
        ${isCompleted ? "opacity-60" : ""}
        hover:bg-muted/50
      `}
    >
      {/* Drag handle */}
      {canDrag && (
        <TableCell className="w-8 px-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
      )}

      {/* Tipo */}
      <TableCell className="px-2">
        <Badge variant={isMontagem ? "default" : "secondary"} className={`text-xs ${isMontagem ? "bg-green-600" : "bg-orange-600"}`}>
          {isMontagem ? "M" : "D"}
        </Badge>
      </TableCell>

      {/* Cliente */}
      <TableCell className="px-2 font-medium max-w-[120px] truncate">
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-left hover:underline text-primary truncate block w-full">
              {item.clientName}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{item.clientName}</p>
              </div>
              {item.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={whatsappUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {item.phone}
                  </a>
                </div>
              )}
              {item.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{item.address}</p>
                    {item.city && <p>{item.city}{item.state ? ` - ${item.state}` : ""}</p>}
                    {googleMapsUrl && (
                      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" /> Ver no mapa
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Produtos:</p>
                <p className="text-sm text-muted-foreground">{productsText}</p>
              </div>
              {item.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Observações:</p>
                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>

      {/* Produtos - movido para logo após Cliente */}
      <TableCell className="px-2 text-sm bg-primary/5 min-w-[150px]">
        <div className="flex flex-col font-medium">
          {item.products.map((product, index) => (
            <span key={index} className="text-foreground">{product}</span>
          ))}
        </div>
      </TableCell>

      {/* Endereço */}
      <TableCell className="px-2 max-w-[150px] text-sm">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            {googleMapsUrl ? (
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">
                {item.address || "-"}
              </a>
            ) : (
              <span className="truncate">{item.address || "-"}</span>
            )}
            {onEditAddress && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditAddress(true)}
                className="h-6 w-6 p-0 shrink-0"
                title="Editar endereço"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
          {item.addressObservation && (
            <span className="text-xs text-muted-foreground italic truncate" title={item.addressObservation}>
              {item.addressObservation}
            </span>
          )}
        </div>
      </TableCell>

      {/* Cidade */}
      <TableCell className="px-2 text-sm max-w-[80px] truncate">
        {item.city || "-"}
      </TableCell>

      {/* Telefone */}
      <TableCell className="px-2 text-sm">
        {item.phone ? (
          <a href={whatsappUrl || "#"} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary whitespace-nowrap">
            {item.phone}
          </a>
        ) : "-"}
      </TableCell>

      {/* Horário Logística (editável) */}
      <TableCell className="px-2">
        <div className="flex items-center gap-1">
          <Input
            type="time"
            value={editableTime}
            onChange={(e) => setEditableTime(e.target.value)}
            onBlur={handleTimeUpdate}
            className="h-7 w-20 text-xs"
            disabled={!onTimeChange}
          />
        </div>
      </TableCell>

      {/* Data Logística (editável) */}
      <TableCell className="px-2">
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={editableDate}
            onChange={(e) => setEditableDate(e.target.value)}
            onBlur={handleDateUpdate}
            className="h-7 w-28 text-xs"
            disabled={!onDateChange}
          />
        </div>
      </TableCell>

      {/* Data Festa */}
      <TableCell className="px-2 text-sm whitespace-nowrap">
        {formatDate(item.partyDate)}
      </TableCell>

      {/* Horário Combinado */}
      <TableCell className="px-2 text-sm whitespace-nowrap">
        {item.originalTime ? formatTime(item.originalTime) : "-"}
      </TableCell>

      {/* Data Original */}
      <TableCell className="px-2 text-sm whitespace-nowrap">
        {formatDate(item.originalDate)}
      </TableCell>

      {/* Observações */}
      <TableCell className="px-2 text-sm max-w-[100px] truncate" title={item.notes || ""}>
        {item.notes || "-"}
      </TableCell>

      {/* Monitoria */}
      <TableCell className="px-2 text-sm">
        {item.monitoringInfo?.hasMonitoring ? (
          <div className="flex flex-col gap-1">
            {item.monitoringInfo.slots.map((slot, i) => {
              const hasMonitor = !!slot.monitorName;
              const monitorWhatsAppUrl = slot.monitorPhone 
                ? `https://wa.me/55${slot.monitorPhone.replace(/\D/g, "")}`
                : null;
              
              return hasMonitor ? (
                <Popover key={i}>
                  <PopoverTrigger asChild>
                    <button className="text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors">
                      <span className="font-medium flex items-center gap-1 text-primary">
                        <User className="h-3 w-3" />
                        1 monitor
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" />
                        Detalhes do Monitor
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Nome</p>
                          <p className="font-medium">{slot.monitorName}</p>
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
                          variant="outline"
                          size="sm"
                          className="w-full"
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
                <div key={i}>
                  <span className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    1 monitor
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
              );
            })}
          </div>
        ) : "-"}
      </TableCell>

      {/* Valor */}
      <TableCell className="px-2 text-sm whitespace-nowrap font-medium">
        {item.paymentAmount ? `R$ ${item.paymentAmount.toFixed(2)}` : "-"}
      </TableCell>

      {/* Saldo a Pagar */}
      <TableCell className="px-2 text-sm whitespace-nowrap font-bold">
        {item.remainingAmount > 0 ? (
          <span className="text-destructive">
            R$ {item.remainingAmount.toFixed(2)}
          </span>
        ) : (
          <span className="text-green-600">Pago ✓</span>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell className="px-2">
        {!isCompleted && onCheckIn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheckIn(item)}
            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-100"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
        {isCompleted && (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
              ✓
            </Badge>
            {onCheckIn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCheckIn(item)}
                className="h-6 w-6 p-0"
                title="Editar check-in"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      </TableCell>

      {/* Modal de Edição de Endereço */}
      {onEditAddress && (
        <EditAddressModal
          open={showEditAddress}
          onOpenChange={setShowEditAddress}
          clientName={item.clientName}
          currentAddress={{
            address: item.address,
            city: item.city,
            state: item.state,
            cep: item.cep,
            observation: item.addressObservation || "",
          }}
          onSave={async (newAddress) => {
            await onEditAddress(item.saleId, newAddress);
          }}
        />
      )}
    </TableRow>
  );
};
