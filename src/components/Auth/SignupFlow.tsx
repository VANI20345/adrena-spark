import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SignupPage1 from './SignupPage1';
import SignupPage2 from './SignupPage2';
import SignupPage3 from './SignupPage3';
import SignupPage4 from './SignupPage4';

export interface SignupData {
  fullName: string;
  email: string;
  emailVerification: string;
  phone: string;
  password: string;
  role: 'attendee' | 'provider';
  city: string;
  birthDate: string;
  gender: string;
  interests: string[];
}

interface SignupFlowProps {
  onFlowStart?: () => void;
}

const SignupFlow = ({ onFlowStart }: SignupFlowProps) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    fullName: '',
    email: '',
    emailVerification: '',
    phone: '',
    password: '',
    role: 'attendee',
    city: '',
    birthDate: '',
    gender: '',
    interests: []
  });

  const updateSignupData = (data: Partial<SignupData>) => {
    setSignupData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentPage === 1 && onFlowStart) {
      onFlowStart();
    }
    setCurrentPage(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentPage(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupData.fullName,
            phone: signupData.phone,
            city: signupData.city,
            birth_date: signupData.birthDate,
            gender: signupData.gender,
            interests: signupData.interests
          }
        }
      });

      if (authError) {
        // Handle duplicate email error
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          throw new Error('البريد الإلكتروني مستخدم بالفعل');
        }
        throw authError;
      }

      if (authData.user) {
        // Update profile with additional data including full_name and email
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: signupData.fullName,
            email: signupData.email,
            phone: signupData.phone,
            city: signupData.city,
            birth_date: signupData.birthDate,
            gender: signupData.gender,
            interests: signupData.interests,
            interests_visibility: 'private'
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw new Error('فشل تحديث الملف الشخصي');
        }

        // Set user role directly during signup
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: signupData.role
          });

        if (roleError) {
          console.error('Role assignment error:', roleError);
          throw new Error('فشل تعيين نوع الحساب');
        }

        // Success - redirect to home
        navigate('/');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      alert(error.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentPage === 1 && (
        <SignupPage1
          data={signupData}
          updateData={updateSignupData}
          onNext={handleNext}
        />
      )}
      {currentPage === 2 && (
        <SignupPage2
          data={signupData}
          updateData={updateSignupData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentPage === 3 && (
        <SignupPage3
          data={signupData}
          updateData={updateSignupData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentPage === 4 && (
        <SignupPage4
          data={signupData}
          updateData={updateSignupData}
          onBack={handleBack}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default SignupFlow;
