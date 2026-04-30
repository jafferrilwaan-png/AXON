import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  patient: Patient | null;
  loading: boolean;
  isDoctor: boolean;
  signOut: () => Promise<void>;
  signUp: (email: string, pass: string, name: string, role: 'patient' | 'doctor') => Promise<any>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const isDoctor = user?.user_metadata?.role === 'doctor';

  const fetchProfile = useCallback(async (uid: string, role?: string, fullName?: string) => {
    try {
      console.log("Fetching profile for:", uid);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      
      if (error) {
        console.error("Supabase profile error:", error);
        throw error;
      }
      
      if (!data) {
        console.log("No patient profile found. Creating base profile for Google User.");
        
        // If it's a doctor, we don't auto-create a patient profile
        const isUserDoctor = role === 'doctor';
        
        if (!isUserDoctor) {
            const { data: newPatient, error: insertError } = await supabase
              .from('patients')
              .insert([{ 
                user_id: uid, 
                name: fullName || 'New Patient', 
                doctor_access_enabled: false,
                health_vitality_score: 70,
                profile_complete: false,
                onboarding_complete: false
              }])
              .select('*')
              .single();
              
            if (insertError) {
              console.error("Auto profile creation error:", insertError);
              setPatient(null);
            } else {
              setPatient(newPatient);
            }
        } else {
            setPatient(null);
        }
      } else {
        console.log("Profile loaded:", data.clinical_id);
        setPatient(data);
      }
    } catch (err: any) {
      console.error("Error fetching patient profile:", err);
      toast.error("Profile sync failed");
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateUniqueClinicalId = async (): Promise<string> => {
    let unique = false;
    let newId = '';
    while (!unique) {
      newId = `${Math.floor(100000 + Math.random() * 900000)}`;
      const { data, error } = await supabase
        .from('patients')
        .select('clinical_id')
        .eq('clinical_id', newId)
        .maybeSingle();
      if (!error && !data) unique = true;
      if (error) {
        console.error("Clinical ID uniqueness check failed:", error);
        unique = true; // Fallback to break loop, rely on unique constraint
      }
    }
    return newId;
  };

  const signUp = async (email: string, pass: string, name: string, role: 'patient' | 'doctor') => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { 
          data: { 
            full_name: name, 
            role 
          } 
        }
      });

      if (authError) throw authError;

      if (authData.user && role === 'patient') {
        const clinicalId = await generateUniqueClinicalId();
        const { error: profileError } = await supabase
          .from('patients')
          .insert([{ 
            user_id: authData.user.id, 
            name, 
            clinical_id: clinicalId,
            doctor_access_enabled: false,
            health_vitality_score: 70
          }]);
        
        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      } else if (authData.user && role === 'doctor') {
        const { error: doctorError } = await supabase
          .from('doctor_details')
          .insert([{
            user_id: authData.user.id,
            name,
            specialization: 'Clinical AI Specialist',
            hospital_name: 'AXON Medical Network'
          }]);

        if (doctorError) {
          console.error("Doctor profile creation error:", doctorError);
        }
      }

      return authData;
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth init error details:", error);
          // If refresh token is missing or invalid, force sign out to clear local storage
          if (error.message.includes("Refresh Token Not Found") || 
              error.message.includes("refresh_token_not_found") ||
              error.status === 400 ||
              error.status === 401) {
            console.warn("Invalid session detected, clearing auth state...");
            // Use low-level storage clear if signOut fails or just to be sure
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.error("Sign out fail-safe error:", signOutErr);
              // Fallback: clear local storage manually if possible (browser environment)
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem('supabase.auth.token');
              }
            }
            
            if (mounted) {
              setUser(null);
              setPatient(null);
              setLoading(false);
            }
            return;
          }
          throw error;
        }

        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          fetchProfile(currentUser.id, currentUser.user_metadata?.role, currentUser.user_metadata?.full_name);
        } else {
          setPatient(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init fatal error:", err);
        if (mounted) {
          setUser(null);
          setPatient(null);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      
      console.log("Auth event:", event, currentUser?.id);

      if (event === 'SIGNED_IN') {
        setLoading(true);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPatient(null);
        setLoading(false);
        return;
      }

      setUser(prev => {
        if (prev?.id === currentUser?.id) return prev;
        return currentUser;
      });

      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.user_metadata?.role, currentUser.user_metadata?.full_name);
      } else {
        setPatient(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setPatient(null);
      toast.success("Signed out successfully");
    } catch (err: any) {
      toast.error(err.message || "Sign out failed");
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.user_metadata?.role, user.user_metadata?.full_name);
  };

  return (
    <AuthContext.Provider value={{ user, patient, loading, isDoctor, signOut, signUp, refreshProfile }}>
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
