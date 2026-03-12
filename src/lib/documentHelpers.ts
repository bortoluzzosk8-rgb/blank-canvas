import { marked } from 'marked';

export const convertMarkdownToHTML = (markdown: string): string => {
  return marked(markdown) as string;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const getPaymentMethodLabel = (method: string | null): string => {
  const labels: Record<string, string> = {
    // Formatos antigos (sales.payment_method)
    'cash': 'Dinheiro',
    'credit': 'Cartão de Crédito',
    'boleto': 'Boleto Bancário',
    'pix': 'PIX',
    // Formatos novos (sale_payments.payment_method)
    'dinheiro': 'Dinheiro',
    'debito': 'Cartão de Débito',
    'credito': 'Cartão de Crédito',
  };
  return labels[method || 'cash'] || method || 'Dinheiro';
};

export interface DocumentVariable {
  tag: string;
  label: string;
  description: string;
}

export const getAvailableVariables = (): DocumentVariable[] => {
  return [
    { tag: '{{saleNumber}}', label: 'Número da Venda', description: 'ID único da venda' },
    { tag: '{{saleDate}}', label: 'Data da Venda', description: 'Data formatada' },
    { tag: '{{companyName}}', label: 'Nome da Empresa', description: 'Razão social' },
    { tag: '{{companyCNPJ}}', label: 'CNPJ', description: 'CNPJ da empresa' },
    { tag: '{{companyAddress}}', label: 'Endereço', description: 'Endereço completo' },
    { tag: '{{companyCity}}', label: 'Cidade', description: 'Cidade da empresa' },
    { tag: '{{companyState}}', label: 'Estado', description: 'UF da empresa' },
    { tag: '{{companyCEP}}', label: 'CEP', description: 'CEP da empresa' },
    { tag: '{{companyPhone}}', label: 'Telefone', description: 'Telefone da empresa' },
    { tag: '{{companyEmail}}', label: 'Email', description: 'Email da empresa' },
    { tag: '{{clientName}}', label: 'Nome do Cliente', description: 'Nome completo' },
    { tag: '{{clientDocument}}', label: 'CPF/CNPJ Cliente', description: 'Documento do cliente' },
    { tag: '{{clientPhone}}', label: 'Telefone Cliente', description: 'Telefone do cliente' },
    { tag: '{{clientEmail}}', label: 'Email Cliente', description: 'Email do cliente' },
    { tag: '{{clientAddress}}', label: 'Endereço Cliente', description: 'Endereço completo' },
    { tag: '{{clientCity}}', label: 'Cidade Cliente', description: 'Cidade do cliente' },
    { tag: '{{clientState}}', label: 'Estado Cliente', description: 'UF do cliente' },
    { tag: '{{clientCEP}}', label: 'CEP Cliente', description: 'CEP do cliente' },
    { tag: '{{totalValue}}', label: 'Valor Total', description: 'Valor total da venda' },
    { tag: '{{paymentMethod}}', label: 'Forma de Pagamento', description: 'Método escolhido' },
    { tag: '{{installments}}', label: 'Parcelas', description: 'Número de parcelas' },
    { tag: '{{installmentValue}}', label: 'Valor da Parcela', description: 'Valor de cada parcela' },
    { tag: '{{downPayment}}', label: 'Entrada', description: 'Valor da entrada' },
    { tag: '{{installmentAmount}}', label: 'Saldo Parcelado', description: 'Valor restante' },
  ];
};

export const buildReceiptTemplate = (
  title: string, 
  notes: string, 
  primaryColor: string = '#8B5CF6',
  secondaryColor: string = '#7C3AED',
  signatureUrl?: string
): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2d3748; background: white; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 30px; border-bottom: 3px solid ${primaryColor}; margin-bottom: 30px; }
    .header-logo { max-width: 120px; max-height: 80px; object-fit: contain; }
    .header-title { flex: 1; text-align: right; }
    .header-title h1 { font-size: 28px; color: ${primaryColor}; margin-bottom: 5px; font-weight: 700; }
    .doc-number { font-size: 14px; color: #718096; font-weight: 500; }
    .section { margin-bottom: 25px; padding: 20px; background: #f7fafc; border-radius: 8px; border-left: 4px solid ${primaryColor}; }
    .section-title { font-size: 12px; text-transform: uppercase; color: ${primaryColor}; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; }
    .section-content { font-size: 14px; color: #2d3748; }
    .section-content strong { color: #1a202c; font-weight: 600; }
    .products-table { width: 100%; border-collapse: collapse; margin: 25px 0; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    .products-table th { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 14px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .products-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .products-table tbody tr:last-child td { border-bottom: none; }
    .products-table tbody tr:hover { background: #f7fafc; }
    .payment-summary { background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid ${primaryColor}; }
    .payment-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; color: #2d3748; }
    .payment-row.total { border-top: 2px solid ${primaryColor}; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: 700; color: ${primaryColor}; }
    .installments-list { margin-top: 15px; padding: 15px; background: white; border-radius: 6px; }
    .installment-item { padding: 8px 0; border-bottom: 1px dashed #cbd5e0; font-size: 13px; color: #2d3748; }
    .installment-item:last-child { border-bottom: none; }
    .notes { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .notes-title { font-weight: 700; color: #92400e; margin-bottom: 10px; font-size: 14px; }
    .notes-content { color: #78350f; font-size: 14px; white-space: pre-wrap; }
    .signatures { display: flex; justify-content: space-around; margin-top: 60px; padding-top: 30px; border-top: 2px solid #e2e8f0; }
    .signature-block { text-align: center; flex: 1; }
    .signature-line { border-top: 2px solid #2d3748; margin: 0 20px 10px; padding-top: 8px; }
    .signature-label { font-size: 12px; color: #718096; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .signature-name { font-size: 14px; color: #2d3748; font-weight: 600; margin-top: 5px; }
    .signature-image { max-height: 80px; max-width: 250px; object-fit: contain; margin: 0 auto 10px; display: block; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #a0aec0; font-size: 12px; }
    /* Mobile Responsiveness for Receipt */
    @media screen and (max-width: 640px) {
      body { padding: 16px 8px; font-size: 13px; }
      .container { padding: 0; }
      .header { flex-direction: column; text-align: center; gap: 15px; padding-bottom: 20px; }
      .header-title { text-align: center; }
      .header-title h1 { font-size: 20px; }
      .header-logo { max-width: 100px; margin: 0 auto; }
      .section { padding: 15px; margin-bottom: 15px; }
      .section-title { font-size: 12px; }
      .section-content { font-size: 13px; }
      .products-table { font-size: 11px; }
      .products-table th, .products-table td { padding: 8px 4px; }
      .products-table th:nth-child(1), .products-table td:nth-child(1),
      .products-table th:nth-child(3), .products-table td:nth-child(3),
      .products-table th:nth-child(5), .products-table td:nth-child(5)
      { display: none; }
      .payment-summary { padding: 15px; }
      .payment-row { flex-direction: column; gap: 4px; align-items: flex-start; }
      .payment-row span:last-child { font-weight: 600; }
      .payment-row.total { flex-direction: row; font-size: 15px; justify-content: space-between; align-items: center; }
      .signatures { flex-direction: column; gap: 40px; margin-top: 40px; }
      .signature-block { width: 100%; }
      .signature-line { margin: 0 0 10px 0; }
      .footer { font-size: 11px; margin-top: 30px; }
    }

    @media print { 
      body { padding: 0; } 
      .container { box-shadow: none; }
      .section, .payment-summary, .notes, .signatures, .products-table { page-break-inside: avoid; break-inside: avoid; }
      tr { page-break-inside: avoid; break-inside: avoid; }
      h1, h2, h3, .section-title { page-break-after: avoid; break-after: avoid; }
      p { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#logoUrl}}<img src="{{logoUrl}}" class="header-logo" alt="Logo" />{{/logoUrl}}
      <div class="header-title">
        <h1>${title}</h1>
        <div class="doc-number">Nº {{saleNumber}} | {{saleDate}}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">🏢 Locador</div>
      <div class="section-content">
        <strong>{{companyName}}</strong><br>
        CNPJ: {{companyCNPJ}}<br>
        {{companyAddress}}, {{companyCity}}/{{companyState}} - CEP: {{companyCEP}}<br>
        Telefone: {{companyPhone}} | Email: {{companyEmail}}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">👤 Locatário</div>
      <div class="section-content">
        <strong>{{clientName}}</strong><br>
        CPF/CNPJ: {{clientDocument}}<br>
        Telefone: {{clientPhone}}{{#clientEmail}} | Email: {{clientEmail}}{{/clientEmail}}<br>
        {{#clientAddress}}Endereço: {{clientAddress}}, {{clientCity}}/{{clientState}} - CEP: {{clientCEP}}{{/clientAddress}}
        {{^clientAddress}}Endereço: Não informado{{/clientAddress}}
      </div>
    </div>
    
    <table class="products-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Produto</th>
          <th>Código</th>
          <th style="text-align: center;">Qtd</th>
          <th style="text-align: right;">Valor Unit.</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#products}}
        <tr>
          <td>{{number}}</td>
          <td><strong>{{name}}</strong></td>
          <td><span style="font-family: monospace; background: #f7fafc; padding: 2px 6px; border-radius: 4px;">{{code}}</span></td>
          <td style="text-align: center;">{{quantity}}</td>
          <td style="text-align: right;">R$ {{unitValue}}</td>
          <td style="text-align: right;"><strong>R$ {{totalValue}}</strong></td>
        </tr>
        {{/products}}
      </tbody>
    </table>
    
    <div class="payment-summary">
      <div class="payment-row total">
        <span>💰 Valor Total da Locação</span>
        <span>R$ {{totalValue}}</span>
      </div>
      {{#hasDiscount}}
      <div class="payment-row" style="color: #e53e3e;">
        <span><strong>🏷️ Desconto:</strong></span>
        <span>- R$ {{discountValue}}</span>
      </div>
      {{/hasDiscount}}
      
      {{#hasPaidPayments}}
      <div class="payment-row" style="color: #16a34a;">
        <span><strong>✅ Valor Pago:</strong></span>
        <span>R$ {{paidAmount}}</span>
      </div>
      {{#hasPaymentDate}}
      <div class="payment-row">
        <span><strong>📅 Data do Pagamento:</strong></span>
        <span>{{paymentDate}}</span>
      </div>
      {{/hasPaymentDate}}
      {{#hasRemainingAmount}}
      <div class="payment-row" style="color: #dc2626;">
        <span><strong>⚠️ Resta a pagar:</strong></span>
        <span>R$ {{remainingAmount}}</span>
      </div>
      {{/hasRemainingAmount}}
      {{/hasPaidPayments}}
      
      {{^hasPaidPayments}}
      <div class="payment-row" style="color: #dc2626; font-weight: 600;">
        <span><strong>⚠️ Pagamento Pendente:</strong></span>
        <span>R$ {{totalValue}}</span>
      </div>
      <div class="payment-row">
        <span style="font-style: italic; color: #718096;">Nenhum pagamento registrado até o momento.</span>
      </div>
      {{/hasPaidPayments}}
    </div>
    
    ${notes ? `
    <div class="notes">
      <div class="notes-title">📝 Observações</div>
      <div class="notes-content">${notes}</div>
    </div>
    ` : ''}
    
    <div class="signatures">
      <div class="signature-block">
        ${signatureUrl ? `<img src="${signatureUrl}" class="signature-image" alt="Assinatura" />` : '<div class="signature-line"></div>'}
        <div class="signature-label">Locador</div>
        <div class="signature-name">{{companyName}}</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Locatário</div>
        <div class="signature-name">{{clientName}}</div>
      </div>
    </div>
    
    <div class="footer">
      {{#hasPaidPayments}}
      <p>Recebemos de {{clientName}} a quantia de R$ {{paidAmount}} referente à locação dos equipamentos discriminados acima.</p>
      {{/hasPaidPayments}}
      {{^hasPaidPayments}}
      <p>Este documento é uma confirmação de reserva. Pagamento pendente.</p>
      {{/hasPaidPayments}}
      <p style="margin-top: 10px;">{{companyCity}}/{{companyState}}, {{saleDate}}</p>
    </div>
  </div>
</body>
</html>`;
};

export const buildContractTemplate = (
  title: string, 
  clauses: string,
  primaryColor: string = '#8B5CF6',
  secondaryColor: string = '#7C3AED',
  signatureUrl?: string
): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #2d3748; background: white; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 30px; border-bottom: 3px solid ${primaryColor}; margin-bottom: 30px; }
    .header-logo { max-width: 120px; max-height: 80px; object-fit: contain; }
    .header-title { flex: 1; text-align: right; }
    .header-title h1 { font-size: 28px; color: ${primaryColor}; margin-bottom: 5px; font-weight: 700; }
    .doc-number { font-size: 14px; color: #718096; font-weight: 500; }
    .section { margin-bottom: 25px; padding: 20px; background: #f7fafc; border-radius: 8px; border-left: 4px solid ${primaryColor}; }
    .section-title { font-size: 14px; text-transform: uppercase; color: ${primaryColor}; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; }
    .section-content { font-size: 14px; color: #2d3748; }
    .section-content strong { color: #1a202c; font-weight: 600; }
    .products-table { width: 100%; border-collapse: collapse; margin: 25px 0; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    .products-table th { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 14px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .products-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .products-table tbody tr:last-child td { border-bottom: none; }
    .products-table tbody tr:hover { background: #f7fafc; }
    .payment-summary { background: #f7fafc; padding: 20px 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${primaryColor}; }
    .payment-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #2d3748; border-bottom: 1px solid #e2e8f0; }
    .payment-row:last-child { border-bottom: none; }
    .installments-list { margin-top: 15px; padding: 15px; background: white; border-radius: 6px; }
    .installment-item { padding: 8px 0; border-bottom: 1px dashed #cbd5e0; font-size: 13px; }
    .installment-item:last-child { border-bottom: none; }
    .clauses { background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #e2e8f0; }
    .clauses-title { font-size: 18px; font-weight: 700; color: ${primaryColor}; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .clauses-content { font-size: 14px; color: #2d3748; white-space: pre-wrap; line-height: 1.8; }
    .clauses-content strong { color: ${primaryColor}; font-weight: 700; }
    .signatures { display: flex; justify-content: space-around; margin-top: 60px; padding-top: 30px; border-top: 2px solid #e2e8f0; }
    .signature-block { text-align: center; flex: 1; }
    .signature-line { border-top: 2px solid #2d3748; margin: 0 20px 10px; padding-top: 8px; }
    .signature-label { font-size: 12px; color: #718096; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .signature-name { font-size: 14px; color: #2d3748; font-weight: 600; margin-top: 5px; }
    .signature-image { max-height: 80px; max-width: 250px; object-fit: contain; margin: 0 auto 10px; display: block; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #a0aec0; font-size: 12px; }
    /* Mobile Responsiveness */
    @media screen and (max-width: 640px) {
      body { padding: 16px 8px; font-size: 13px; }
      .container { padding: 0; }
      .header { flex-direction: column; text-align: center; gap: 15px; padding-bottom: 20px; }
      .header-title { text-align: center; }
      .header-title h1 { font-size: 20px; }
      .header-logo { max-width: 100px; margin: 0 auto; }
      .section { padding: 15px; margin-bottom: 15px; }
      .section-title { font-size: 12px; }
      .section-content { font-size: 13px; }
      
      /* Tabela responsiva: esconder colunas menos importantes */
      .products-table { font-size: 11px; }
      .products-table th, .products-table td { padding: 8px 4px; }
      .products-table th:nth-child(1), .products-table td:nth-child(1),
      .products-table th:nth-child(3), .products-table td:nth-child(3),
      .products-table th:nth-child(5), .products-table td:nth-child(5)
      { display: none; }
      
      .payment-summary { padding: 15px; }
      .payment-row { flex-direction: column; gap: 4px; align-items: flex-start; }
      .payment-row span:last-child { font-weight: 600; }
      
      .clauses { padding: 15px; }
      .clauses-title { font-size: 16px; }
      .clauses-content { font-size: 12px; line-height: 1.6; }
      
      .signatures { flex-direction: column; gap: 40px; margin-top: 40px; }
      .signature-block { width: 100%; }
      .signature-line { margin: 0 0 10px 0; }
      
      .footer { font-size: 11px; margin-top: 30px; }
      .installments-list { padding: 10px; }
      .installment-item { font-size: 12px; padding: 6px 0; }
    }

    @media print { 
      body { padding: 0; } 
      .container { box-shadow: none; }
      .section, .payment-summary, .clauses, .signatures, .products-table { page-break-inside: avoid; break-inside: avoid; }
      tr { page-break-inside: avoid; break-inside: avoid; }
      h1, h2, h3, .section-title, .clauses-title { page-break-after: avoid; break-after: avoid; }
      p { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#logoUrl}}<img src="{{logoUrl}}" class="header-logo" alt="Logo" />{{/logoUrl}}
      <div class="header-title">
        <h1>${title}</h1>
        <div class="doc-number">Contrato Nº {{saleNumber}} | {{saleDate}}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">🏢 LOCADOR</div>
      <div class="section-content">
        <strong>{{companyName}}</strong><br>
        CNPJ: {{companyCNPJ}}<br>
        {{companyAddress}}, {{companyCity}}/{{companyState}} - CEP: {{companyCEP}}<br>
        Telefone: {{companyPhone}} | Email: {{companyEmail}}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">👤 LOCATÁRIO</div>
      <div class="section-content">
        <strong>{{clientName}}</strong><br>
        CPF/CNPJ: {{clientDocument}}<br>
        Telefone: {{clientPhone}}{{#clientEmail}} | Email: {{clientEmail}}{{/clientEmail}}<br>
        {{#clientAddress}}Endereço: {{clientAddress}}, {{clientCity}}/{{clientState}} - CEP: {{clientCEP}}{{/clientAddress}}
        {{^clientAddress}}Endereço: Não informado{{/clientAddress}}
      </div>
    </div>
    
    {{#hasRentalDates}}
    <div class="section">
      <div class="section-title">📅 Período da Locação</div>
      <div class="section-content">
        <strong>Data do Evento:</strong> {{rentalStartDate}}{{#partyStartTime}} às {{partyStartTime}}{{/partyStartTime}}<br>
        {{#returnDate}}<strong>Data de Retirada:</strong> {{returnDate}}{{#returnTime}} às {{returnTime}}{{/returnTime}}{{/returnDate}}
      </div>
    </div>
    {{/hasRentalDates}}
    
    {{#hasDeliveryAddress}}
    <div class="section">
      <div class="section-title">📍 Local de Entrega</div>
      <div class="section-content">
        <strong>Endereço:</strong> {{deliveryAddress}}<br>
        {{#deliveryCity}}Cidade: {{deliveryCity}}{{/deliveryCity}}{{#deliveryState}}/{{deliveryState}}{{/deliveryState}}{{#deliveryCEP}} - CEP: {{deliveryCEP}}{{/deliveryCEP}}
      </div>
    </div>
    {{/hasDeliveryAddress}}
    
    <div class="section">
      <div class="section-title">📦 Objeto do Contrato</div>
      <div class="section-content">
        O LOCADOR disponibiliza ao LOCATÁRIO os seguintes equipamentos:
      </div>
    </div>
    
    <table class="products-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Produto</th>
          <th>Código</th>
          <th style="text-align: center;">Qtd</th>
          <th style="text-align: right;">Valor Unit.</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {{#products}}
        <tr>
          <td>{{number}}</td>
          <td><strong>{{name}}</strong></td>
          <td><span style="font-family: monospace; background: #f7fafc; padding: 2px 6px; border-radius: 4px;">{{code}}</span></td>
          <td style="text-align: center;">{{quantity}}</td>
          <td style="text-align: right;">R$ {{unitValue}}</td>
          <td style="text-align: right;"><strong>R$ {{totalValue}}</strong></td>
        </tr>
        {{/products}}
      </tbody>
    </table>
    
    <div class="payment-summary">
      {{#hasFreight}}
      <div class="payment-row">
        <span>🚚 <strong>Frete:</strong></span>
        <span>R$ {{freightValue}}</span>
      </div>
      {{/hasFreight}}
      {{#hasDiscount}}
      <div class="payment-row" style="color: #e53e3e;">
        <span>🏷️ <strong>Desconto:</strong></span>
        <span>- R$ {{discountValue}}</span>
      </div>
      {{/hasDiscount}}
      <div class="payment-row">
        <span>💰 <strong>Valor Total:</strong></span>
        <span><strong>R$ {{totalValue}}</strong></span>
      </div>
      {{#hasPaidPayments}}
      <div class="payment-row" style="color: #10b981;">
        <span>✅ <strong>Valor já pago:</strong></span>
        <span>R$ {{paidAmount}}</span>
      </div>
      <div class="payment-row" style="color: #f59e0b;">
        <span>⏳ <strong>Valor restante:</strong></span>
        <span>R$ {{remainingAmount}}</span>
      </div>
      {{/hasPaidPayments}}
      {{#installmentDates}}
      <div class="installments-list">
        {{#installmentDates}}
        <div class="installment-item">
          📅 Parcela {{number}}: Vencimento em <strong>{{date}}</strong> - R$ {{installmentValue}}
        </div>
        {{/installmentDates}}
      </div>
      {{/installmentDates}}
    </div>
    
    <div class="clauses">
      <div class="clauses-title">📋 Cláusulas Contratuais</div>
      <div class="clauses-content">${clauses}</div>
    </div>
    
    {{#notes}}
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <div style="font-weight: 700; color: #92400e; margin-bottom: 10px; font-size: 14px;">📝 Observações Adicionais</div>
      <div style="color: #78350f; font-size: 14px; white-space: pre-wrap;">{{notes}}</div>
    </div>
    {{/notes}}
    
    <div class="footer">
      <p style="margin-bottom: 15px;">E por estarem assim justos e contratados, assinam o presente instrumento em duas vias de igual teor e forma.</p>
      <p>{{companyCity}}/{{companyState}}, {{saleDate}}</p>
    </div>
    
    <div class="signatures">
      <div class="signature-block">
        ${signatureUrl ? `<img src="${signatureUrl}" class="signature-image" alt="Assinatura" />` : '<div class="signature-line"></div>'}
        <div class="signature-label">LOCADOR</div>
        <div class="signature-name">{{companyName}}</div>
      </div>
      <div class="signature-block">
        <div class="signature-line" style="margin-top: 70px;"></div>
        <div class="signature-label">LOCATÁRIO</div>
        <div class="signature-name">{{clientName}}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
};
