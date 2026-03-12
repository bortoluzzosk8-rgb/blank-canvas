import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function downloadElementAsPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Elemento não encontrado');

  // Criar uma cópia do elemento para manipulação
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '800px';
  clone.style.padding = '20px';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.backgroundColor = '#ffffff';
  document.body.appendChild(clone);

  // Forçar estilos desktop na cópia (remover media queries mobile)
  const allElements = clone.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    // Garantir que colunas ocultas no mobile fiquem visíveis no PDF
    if (htmlEl.style.display === 'none') {
      htmlEl.style.display = '';
    }
  });

  // Identificar seções que não devem ser quebradas
  const sections = clone.querySelectorAll('.section, .payment-summary, .clauses, .signatures, .products-table, .header, .footer');
  sections.forEach((section) => {
    const htmlSection = section as HTMLElement;
    htmlSection.style.pageBreakInside = 'avoid';
    htmlSection.style.breakInside = 'avoid';
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);

  // Capturar em alta resolução
  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 800
  });

  document.body.removeChild(clone);

  // Calcular proporções
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Se cabe em uma página, adicionar diretamente
  if (imgHeight <= contentHeight) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, imgHeight);
  } else {
    // Múltiplas páginas: dividir respeitando proporção
    const totalPages = Math.ceil(imgHeight / contentHeight);
    
    for (let page = 0; page < totalPages; page++) {
      const sourceY = (page * contentHeight / imgHeight) * canvas.height;
      const sourceHeight = Math.min(
        (contentHeight / imgHeight) * canvas.height,
        canvas.height - sourceY
      );

      // Criar canvas temporário para esta página
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
      }

      const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;

      if (page > 0) {
        pdf.addPage();
      }

      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, pageImgHeight);
    }
  }

  pdf.save(fileName);
}
