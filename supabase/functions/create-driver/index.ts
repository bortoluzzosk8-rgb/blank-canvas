import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify their role
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error('Error getting current user:', userError);
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
      console.error('Error checking role:', roleError1 || roleError2 || roleError3);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isFranqueadora && !isFranqueado && !isVendedor) {
      console.error('User does not have franqueadora, franqueado or vendedor role');
      return new Response(
        JSON.stringify({ error: 'Apenas franqueadoras, franqueados e vendedores podem criar motoristas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { name, email, password, phone, franchise_id } = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the franchise_id to use
    let franchiseIdToUse = franchise_id;

    // If franqueado (but not franqueadora), force using their associated franchise
    if (isFranqueado && !isFranqueadora) {
      const { data: userFranchise, error: franchiseError } = await supabaseAdmin
        .from('user_franchises')
        .select('franchise_id')
        .eq('user_id', currentUser.id)
        .single();

      if (franchiseError || !userFranchise) {
        console.error('Error getting user franchise:', franchiseError);
        return new Response(
          JSON.stringify({ error: 'Franqueado não está vinculado a nenhuma unidade' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Force using the franqueado's franchise (security measure)
      franchiseIdToUse = userFranchise.franchise_id;
    }

    // Vendedor can create drivers without franchise (they are global)

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error('Error creating user:', createError);
      const msg = createError.message?.toLowerCase() || '';
      // Ignore leaked/pwned password warnings
      if (msg.includes('leaked') || msg.includes('pwned') || msg.includes('hibp')) {
        console.log('Ignoring HIBP warning, retrying without password check is not possible via admin API. Treating as success if user was created.');
      } else if (msg.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add motorista role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'motorista',
      });

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir role ao usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add driver record
    const { error: driverInsertError } = await supabaseAdmin
      .from('drivers')
      .insert({
        user_id: newUser.user.id,
        name,
        email,
        phone: phone || null,
        franchise_id: franchiseIdToUse || null,
      });

    if (driverInsertError) {
      console.error('Error creating driver record:', driverInsertError);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar registro do motorista' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creatorRole = isFranqueadora ? 'franqueadora' : (isFranqueado ? 'franqueado' : 'vendedor');
    console.log(`Driver created successfully: ${email} (${newUser.user.id}) by ${creatorRole}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Motorista criado com sucesso',
        user_id: newUser.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-driver function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
