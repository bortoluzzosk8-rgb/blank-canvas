// @ts-nocheck
export function buildPrintHtml(documentType, documentContent) {
  const title = documentType === 'receipt' ? '🧾 Recibo de Locação' : '📄 Contrato de Locação de Equipamentos';
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111827; background: #ffffff; margin: 0; }
      .page { width: 210mm; margin: 0 auto; padding: 16mm; }
      @media print {
        .page { padding: 12mm; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      ${documentContent}
    </div>
    <script>
      window.onload = () => {
        setTimeout(() => window.print(), 300);
      };
    <\/script>
  </body>
</html>`;
}
