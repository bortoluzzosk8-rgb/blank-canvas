import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Franchise = {
  id: string;
  name: string;
  city: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isFranqueadora: boolean;
  isVendedor: boolean;
  isMotorista: boolean;
  userFranchise: Franchise | null;
  checkingAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android/i.test(ua);
  const browser = /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Outro';
  return `${isMobile ? 'Mobile' : 'Desktop'} - ${browser}`;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFranqueadora, setIsFranqueadora] = useState(false);
  const [isVendedor, setIsVendedor] = useState(false);
  const [isMotorista, setIsMotorista] = useState(false);
  const [userFranchise, setUserFranchise] = useState<Franchise | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const checkInProgressRef = useRef(false);

  const upsertSession = async (userId: string, accessToken: string) => {
    try {
      await supabase
        .from('user_sessions')
        .upsert({
          user_id: userId,
          session_token: accessToken.substring(0, 50),
          device_info: getDeviceInfo(),
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Error upserting session:', err);
    }
  };

  const deleteSession = async (userId: string) => {
    try {
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const checkAdminStatus = async (userId: string, userEmail?: string) => {
    if (checkInProgressRef.current) return;
    checkInProgressRef.current = true;
    setCheckingAdmin(true);
    try {
      const [franqueadoraCheck, adminCheck, vendedorCheck, motoristaCheck, superAdminCheck] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'franqueadora' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'vendedor' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'motorista' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' })
      ]);
      
      let isFranqueadoraRole = franqueadoraCheck.data || false;
      let isAdminRole = adminCheck.data || false;
      let isVendedorRole = vendedorCheck.data || false;
      let isMotoristaRole = motoristaCheck.data || false;
      let isSuperAdminRole = superAdminCheck.data || false;
      
      const hasSomeRole = isFranqueadoraRole || isAdminRole || isVendedorRole || isMotoristaRole || isSuperAdminRole;
      
      if (!hasSomeRole && userEmail) {
        console.log('Usuário sem role detectado, atribuindo role automaticamente...');
        
        const { error: assignError } = await supabase.functions.invoke('assign-franqueadora-role', {
          body: { user_id: userId }
        });
        
        if (assignError) {
          console.error('Erro ao atribuir role:', assignError);
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const [newFranqueadoraCheck, newSuperAdminCheck] = await Promise.all([
            supabase.rpc('has_role', { _user_id: userId, _role: 'franqueadora' }),
            supabase.rpc('has_role', { _user_id: userId, _role: 'super_admin' })
          ]);
          
          isFranqueadoraRole = newFranqueadoraCheck.data || false;
          isSuperAdminRole = newSuperAdminCheck.data || false;
          
          console.log('Roles após atribuição:', { isFranqueadoraRole, isSuperAdminRole });
        }
      }
      
      setIsSuperAdmin(isSuperAdminRole);
      setIsFranqueadora(isFranqueadoraRole);
      setIsVendedor(isVendedorRole);
      setIsMotorista(isMotoristaRole);
      setIsAdmin(isAdminRole || isFranqueadoraRole || isVendedorRole || isMotoristaRole || isSuperAdminRole);
      
      if (isFranqueadoraRole) {
        const { data: franchiseRows } = await supabase
          .from('user_franchises')
          .select('franchise_id, franchises(id, name, city)')
          .eq('user_id', userId)
          .limit(1);
        const franchiseData = franchiseRows?.[0] || null;
        
        if (franchiseData?.franchises) {
          setUserFranchise(franchiseData.franchises as any);
        }
      } else if (isMotoristaRole) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('franchise_id, franchise:franchises(id, name, city)')
          .eq('user_id', userId)
          .single();
        
        if (driverData?.franchise) {
          setUserFranchise(driverData.franchise as any);
        }
      } else {
        setUserFranchise(null);
      }
    } catch (err) {
      console.error('Erro ao verificar roles:', err);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsFranqueadora(false);
      setIsVendedor(false);
      setIsMotorista(false);
      setUserFranchise(null);
    } finally {
      checkInProgressRef.current = false;
      setCheckingAdmin(false);
    }
  };

  const refreshRoles = async (): Promise<boolean> => {
    if (user) {
      await checkAdminStatus(user.id);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          checkAdminStatus(session.user.id, session.user.email);
          // Register/update session
          upsertSession(session.user.id, session.access_token);
        } else {
          setIsAdmin(false);
          setIsVendedor(false);
          setIsMotorista(false);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkAdminStatus(session.user.id, session.user.email);
        await upsertSession(session.user.id, session.access_token);
      } else {
        setIsAdmin(false);
        setIsVendedor(false);
        setIsMotorista(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (user) {
      await deleteSession(user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsFranqueadora(false);
    setIsVendedor(false);
    setIsMotorista(false);
    setUserFranchise(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAdmin, 
      isSuperAdmin,
      isFranqueadora, 
      isVendedor,
      isMotorista,
      userFranchise,
      checkingAdmin, 
      signOut,
      refreshRoles
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
