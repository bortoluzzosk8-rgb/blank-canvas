

## Corrigir erro "Algo deu errado" na verificacao de email

### Problema raiz
Tres problemas combinados causam o erro:

1. **Tipo de link errado na edge function**: Usa `type: 'magiclink'` mas deveria usar `type: 'signup'` para confirmar o email do usuario corretamente
2. **URL hardcoded**: O `redirectTo` aponta fixo para `playgestor.com.br`, quebrando testes no preview
3. **Tratamento de erro fragil no VerifyEmail**: O `supabase.functions.invoke` pode retornar erro em formato inesperado, causando crash no React que o ErrorBoundary captura

### Correcoes

**1. Edge function `send-email` (supabase/functions/send-email/index.ts)**
- Trocar `type: 'magiclink'` por `type: 'signup'` no `generateLink` para gerar link de confirmacao de email real
- Receber `origin` no body da requisicao para construir o `redirectTo` dinamicamente
- Fallback para `https://playgestor.com.br` se origin nao for fornecido

**2. VerifyEmail.tsx**
- Passar `window.location.origin` ao chamar a edge function para que o link funcione no ambiente correto
- Melhorar tratamento de erro: verificar `data.error` alem de `error` do invoke, evitando throw de objetos nao-Error
- Envolver o handleResend em tratamento defensivo para evitar crash do React

**3. UserRegister.tsx**
- Passar `window.location.origin` ao chamar a edge function de confirmacao

### Secao tecnica

**Edge function - correcao do generateLink:**
```typescript
case 'confirmation': {
  const origin = data?.origin || 'https://playgestor.com.br';
  
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',  // era 'magiclink', agora 'signup' para confirmar email
    email: to,
    options: {
      redirectTo: `${origin}/auth/callback`,
    }
  });
  // ...
}
```

**VerifyEmail.tsx - chamada corrigida:**
```typescript
const handleResend = async () => {
  if (!email || cooldown > 0) return;
  setResending(true);
  try {
    const response = await supabase.functions.invoke('send-email', {
      body: { 
        type: 'confirmation', 
        to: email, 
        name: name || '',
        data: { origin: window.location.origin }
      }
    });
    
    if (response.error || response.data?.error) {
      throw new Error(response.data?.error || 'Erro ao enviar email');
    }
    
    toast({ title: "Email reenviado!", description: "Verifique sua caixa de entrada e spam." });
    setCooldown(60);
  } catch (err) {
    toast({ title: "Erro ao reenviar", description: "Tente novamente.", variant: "destructive" });
  } finally {
    setResending(false);
  }
};
```

**UserRegister.tsx - passar origin:**
```typescript
await supabase.functions.invoke('send-email', {
  body: { 
    type: 'confirmation', 
    to: email.trim(), 
    name: name.trim(),
    data: { origin: window.location.origin }
  }
});
```

### Resultado esperado
- Link de confirmacao confirma o email corretamente (tipo signup, nao magiclink)
- Link funciona tanto no preview quanto na URL publicada
- Nenhum crash do React ao reenviar email - erros sao tratados graciosamente com toast

