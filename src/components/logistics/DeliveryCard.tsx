import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, MapPin, GripVertical, Package, PartyPopper, Calendar, RefreshCw, Phone, MessageCircle, ExternalLink, Check, DollarSign, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DeliveryItem } from "@/pages/admin/Logistics";

interface DeliveryCardProps {
  item: DeliveryItem;
  isDragging?: boolean;
  onTimeChange?: (newTime: string) => void;
  onDateChange?: (newDate: string) => void;
  onCheckIn?: () => void;
  canDrag?: boolean;
  isMotorista?: boolean;
}

export const DeliveryCard = ({ item, isDragging, onTimeChange, onDateChange, onCheckIn, canDrag = true, isMotorista = false }: DeliveryCardProps) => {
  const [editedDate, setEditedDate] = useState(item.logisticsDate);
  const hasDateChanged = editedDate !== item.logisticsDate;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const isMontagem = item.type === "montagem";
  const isCompleted = item.status === "concluido";
  
  // Visual diferenciado para concluído
  const bgColor = isCompleted
    ? "bg-emerald-100 border-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-600"
    : isMontagem 
      ? "bg-emerald-500/10 border-emerald-500/30" 
      : "bg-orange-500/10 border-orange-500/30";
  
  const badgeClass = isMontagem
    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
    : "bg-orange-500 hover:bg-orange-600 text-white";

  const timeValue = item.scheduledTime.substring(0, 5);
  const originalTimeValue = item.originalTime.substring(0, 5);

  // Formatar datas
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const partyDateFormatted = formatDate(item.partyDate);

  // Criar endereço completo para Google Maps
  const fullAddress = [item.address, item.city, item.state, item.cep].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  // Gerar URL do WhatsApp com mensagem pronta para franqueadora/franqueado
  const generateWhatsAppUrl = () => {
    const phoneClean = item.phone?.replace(/\D/g, "") || "";
    if (!phoneClean) return "";
    
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

  const handleUpdateDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDateChange && hasDateChanged) {
      onDateChange(editedDate);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-shadow overflow-hidden ${bgColor} ${
        isDragging ? "shadow-lg scale-105" : ""
      }`}
    >
      <CardContent className="p-2">
        <div className="flex items-start gap-1.5">
          {/* Drag Handle - only show if canDrag */}
          {canDrag && (
            <div
              {...attributes}
              {...listeners}
              className="mt-0.5 p-1 rounded cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header com tipo, status e data da festa */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <Badge className={`${badgeClass} text-[10px] px-1.5 py-0`}>
                  {isMontagem ? "Montagem" : "Desmontagem"}
                </Badge>
                {isCompleted && (
                  <div className="flex items-center gap-0.5">
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-1.5 py-0">
                      <Check className="w-2.5 h-2.5 mr-0.5" />
                      Concluído
                    </Badge>
                    {onCheckIn && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheckIn();
                        }}
                        title="Editar check-in"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5 text-[10px] bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                <PartyPopper className="w-2.5 h-2.5 text-primary" />
                <span className="font-medium text-primary">{partyDateFormatted}</span>
              </div>
            </div>

            {/* Nome do cliente com popup de detalhes */}
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="font-semibold text-xs truncate text-left hover:underline cursor-pointer w-full block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.clientName}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">{item.clientName}</h4>
                  
                  {/* Telefone */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{item.phone || "Não informado"}</span>
                  </div>
                  
                  {/* Endereço completo clicável */}
                  {fullAddress && (
                    <a 
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="flex-1 break-words">{fullAddress}</span>
                      <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                    </a>
                  )}

                  {/* Produtos */}
                  {item.products.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{item.products.join(", ")}</span>
                    </div>
                  )}
                  
                  {/* Botão WhatsApp */}
                  {whatsappUrl && (
                    <Button asChild className="w-full bg-green-500 hover:bg-green-600">
                      <a 
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Endereço clicável para Google Maps */}
            {(item.address || item.city) && (
              <div className="space-y-0.5">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1 text-[10px] text-muted-foreground hover:text-blue-600 hover:underline cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-1 break-all">
                    {item.address}
                    {item.address && item.city && " - "}
                    {item.city}
                  </span>
                </a>
                {item.addressObservation && (
                  <span className="text-[9px] text-muted-foreground italic line-clamp-1 ml-3.5" title={item.addressObservation}>
                    {item.addressObservation}
                  </span>
                )}
              </div>
            )}

            {/* Produtos */}
            {item.products.length > 0 && (
              <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
                <Package className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{item.products.join(", ")}</span>
              </div>
            )}

            <Separator className="my-1" />

            {/* Seção de Data e Horário - layout compacto */}
            <div className="space-y-1">
              {/* Data da Logística (editável) */}
              {onDateChange ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>Data:</span>
                  </div>
                  <Input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="h-6 w-full text-[10px] px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {hasDateChanged && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-5 w-full text-[10px]"
                      onClick={handleUpdateDate}
                    >
                      <RefreshCw className="w-2.5 h-2.5 mr-1" />
                      Atualizar
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>Data:</span>
                  </div>
                  <span className="font-medium">{formatDate(item.logisticsDate)}</span>
                </div>
              )}

              {/* Horários em linha */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Comb:</span>
                </div>
                <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-[10px]">
                  {originalTimeValue}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Log:</span>
                </div>
                {onTimeChange ? (
                  <Input
                    type="time"
                    value={timeValue}
                    onChange={(e) => onTimeChange(e.target.value)}
                    className="h-5 w-16 text-[10px] px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="font-medium">{timeValue}</span>
                )}
              </div>
            </div>

            {/* Observações (se concluído) */}
            {isCompleted && item.notes && (
              <div className="bg-muted/50 rounded p-1.5 text-[10px] text-muted-foreground">
                <div className="flex items-start gap-1">
                  <MessageCircle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{item.notes}</span>
                </div>
              </div>
            )}

            {/* Pagamento (se concluído com status de pagamento) */}
            {isCompleted && item.paymentStatus && (
              <div className="flex items-center gap-1 text-[10px]">
                <DollarSign className="w-2.5 h-2.5" />
                <span className={
                  item.paymentStatus === "confirmado" 
                    ? "text-emerald-600" 
                    : item.paymentStatus === "parcial" 
                      ? "text-yellow-600" 
                      : "text-red-500"
                }>
                  {item.paymentStatus === "confirmado" && "Pago"}
                  {item.paymentStatus === "parcial" && `Parcial: R$ ${item.paymentAmount?.toFixed(2)}`}
                  {item.paymentStatus === "nao_recebido" && "Não recebido"}
                </span>
              </div>
            )}

            {/* Botão Check-in */}
            {!isCompleted && onCheckIn && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-6 text-[10px] mt-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckIn();
                }}
              >
                <Check className="w-3 h-3 mr-1" />
                Check-in
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
