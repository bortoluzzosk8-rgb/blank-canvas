import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has franqueadora, franqueado OR vendedor role
    const { data: isFranqueadora, error: roleError1 } = await supabaseUser.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'franqueadora'
    });

    const { data: isFranqueado, error: roleError2 } = await supabaseUser.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'franqueado'
    });

    const { data: isVendedor, error: roleError3 } = await supabaseUser.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'vendedor'
    });

    if (roleError1 || roleError2 || roleError3) {
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isFranqueadora && !isFranqueado && !isVendedor) {
      return new Response(
        JSON.stringify({ error: 'Apenas franqueadoras, franqueados e vendedores podem resetar senhas de motoristas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário e nova senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // If franqueado (but not franqueadora), verify the driver belongs to their franchise
    if (isFranqueado && !isFranqueadora) {
      // Get the franqueado's franchise
      const { data: userFranchise, error: franchiseError } = await supabaseAdmin
        .from('user_franchises')
        .select('franchise_id')
        .eq('user_id', currentUser.id)
        .single();

      if (franchiseError || !userFranchise) {
        return new Response(
          JSON.stringify({ error: 'Franqueado não está vinculado a nenhuma unidade' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the driver's franchise
      const { data: driver, error: driverError } = await supabaseAdmin
        .from('drivers')
        .select('franchise_id')
        .eq('user_id', user_id)
        .single();

      if (driverError || !driver) {
        return new Response(
          JSON.stringify({ error: 'Motorista não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the driver belongs to the franqueado's franchise
      if (driver.franchise_id !== userFranchise.franchise_id) {
        return new Response(
          JSON.stringify({ error: 'Você só pode resetar senhas de motoristas da sua unidade' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Vendedor can reset any driver's password (they are global)

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao resetar senha' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creatorRole = isFranqueadora ? 'franqueadora' : (isFranqueado ? 'franqueado' : 'vendedor');
    console.log(`Password reset for driver: ${user_id} by ${creatorRole}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Senha resetada com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-driver-password function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
