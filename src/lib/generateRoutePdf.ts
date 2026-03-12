import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EquipmentToLoad {
  name: string;
  isUnavailable: boolean;
  unavailableReason?: string;
}

interface RouteItem {
  time: string;
  type: string;
  clientName?: string;
  products?: string[];
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  remainingAmount?: number;
  notes?: string;
  equipments?: EquipmentToLoad[];
  partyTime?: string;
}

interface RouteData {
  vehicleName: string;
  vehiclePlate?: string;
  driverName?: string;
  date: Date;
  items: RouteItem[];
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'montagem': return 'MONTAGEM';
    case 'desmontagem': return 'DESMONTAGEM';
    case 'saida_deposito': return 'SAÍDA DO DEPÓSITO';
    case 'volta_deposito': return 'VOLTA AO DEPÓSITO';
    case 'pausa': return 'PAUSA';
    default: return type.toUpperCase();
  }
}

function getTypePrefix(type: string): string {
  switch (type) {
    case 'montagem': return '[M]';
    case 'desmontagem': return '[D]';
    case 'saida_deposito': return '[S]';
    case 'volta_deposito': return '[V]';
    case 'pausa': return '[P]';
    default: return '[-]';
  }
}

function getTypeColor(type: string): { r: number; g: number; b: number } {
  switch (type) {
    case 'montagem': return { r: 22, g: 163, b: 74 };      // Verde
    case 'desmontagem': return { r: 234, g: 88, b: 12 };   // Laranja
    case 'saida_deposito': return { r: 59, g: 130, b: 246 }; // Azul
    case 'volta_deposito': return { r: 107, g: 114, b: 128 }; // Cinza
    case 'pausa': return { r: 107, g: 114, b: 128 };       // Cinza
    default: return { r: 0, g: 0, b: 0 };
  }
}

export async function generateRoutePdf(data: RouteData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  const formattedDate = format(data.date, "dd/MM/yyyy (EEEE)", { locale: ptBR });

  // Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`ROTA DO DIA - ${data.vehicleName}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Placa se existir
  if (data.vehiclePlate) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Placa: ${data.vehiclePlate}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }

  // Subtítulo com data e motorista
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  let subtitle = `Data: ${formattedDate}`;
  if (data.driverName) {
    subtitle += ` | Motorista: ${data.driverName}`;
  }
  pdf.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Linha separadora
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Resumo
  const montagemCount = data.items.filter(i => i.type === 'montagem').length;
  const desmontagemCount = data.items.filter(i => i.type === 'desmontagem').length;
  pdf.setFontSize(10);
  pdf.text(`Total: ${data.items.length} paradas | Montagens: ${montagemCount} | Desmontagens: ${desmontagemCount}`, margin, yPos);
  yPos += 10;

  // Itens da rota
  data.items.forEach((item, index) => {
    // Verificar se precisa de nova página
    if (yPos > 260) {
      pdf.addPage();
      yPos = 20;
    }

    // Número, horário e tipo com cor
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const typeLabel = getTypeLabel(item.type);
    const prefix = getTypePrefix(item.type);
    const typeColor = getTypeColor(item.type);
    pdf.setTextColor(typeColor.r, typeColor.g, typeColor.b);
    pdf.text(`${index + 1}. ${item.time.substring(0, 5)} - ${prefix} ${typeLabel}`, margin, yPos);
    pdf.setTextColor(0, 0, 0); // Voltar para preto
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    // Conteúdo baseado no tipo
    if (item.type === 'saida_deposito' && item.equipments && item.equipments.length > 0) {
      pdf.text('Carregar no veículo:', margin + 5, yPos);
      yPos += 5;
      item.equipments.forEach(eq => {
        const warning = eq.isUnavailable ? ' [ATENÇÃO!]' : '';
        pdf.text(`  • ${eq.name}${warning}`, margin + 8, yPos);
        yPos += 4;
        if (eq.isUnavailable && eq.unavailableReason) {
          pdf.setFontSize(8);
          pdf.setTextColor(200, 0, 0);
          pdf.text(`     ${eq.unavailableReason}`, margin + 10, yPos);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          yPos += 4;
        }
      });
    } else if (['montagem', 'desmontagem'].includes(item.type)) {
      if (item.clientName) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Cliente: ${item.clientName}`, margin + 5, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
      }
      if (item.products && item.products.length > 0) {
        pdf.text(`Produtos: ${item.products.join(', ')}`, margin + 5, yPos);
        yPos += 5;
      }
      if (item.address) {
        pdf.text(`Endereço: ${item.address}`, margin + 5, yPos);
        yPos += 5;
      }
      if (item.city) {
        pdf.text(`Cidade: ${item.city}${item.state ? ` - ${item.state}` : ''}`, margin + 5, yPos);
        yPos += 5;
      }
      if (item.partyTime) {
        pdf.text(`Horário da Festa: ${item.partyTime.substring(0, 5)}`, margin + 5, yPos);
        yPos += 5;
      }
      if (item.phone) {
        pdf.text(`Telefone: ${item.phone}`, margin + 5, yPos);
        yPos += 5;
      }
      
      // Saldo
      if (item.remainingAmount !== undefined) {
        const saldoText = item.remainingAmount > 0 
          ? `R$ ${item.remainingAmount.toFixed(2).replace('.', ',')}` 
          : 'Pago ✓';
        pdf.text(`Saldo: ${saldoText}`, margin + 5, yPos);
        yPos += 5;
      }
      
      if (item.notes) {
        pdf.setFontSize(9);
        pdf.text(`Obs: ${item.notes}`, margin + 5, yPos);
        pdf.setFontSize(10);
        yPos += 5;
      }
    } else if (item.type === 'pausa') {
      if (item.notes) {
        pdf.text(`Obs: ${item.notes}`, margin + 5, yPos);
        yPos += 5;
      }
    }

    // Linha separadora entre itens
    yPos += 3;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(margin + 5, yPos, pageWidth - margin - 5, yPos);
    yPos += 6;
  });

  // Rodapé
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, 290);
  }

  // Salvar
  const vehicleNameClean = data.vehicleName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const dateClean = format(data.date, 'dd-MM-yyyy');
  const filename = `Rota_${vehicleNameClean}_${dateClean}.pdf`;
  pdf.save(filename);
}
