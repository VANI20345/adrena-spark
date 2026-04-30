import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguageContext } from '@/contexts/LanguageContext';
import SignupPage1 from './SignupPage1';
import SignupPage2 from './SignupPage2';
import SignupPage3 from './SignupPage3';
import SignupPage4 from './SignupPage4';
import SignupPage2Provider from './SignupPage2Provider';

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
  // Provider-specific fields
  serviceTypes?: string[];
  address?: string;
  idDocument?: File;
  commercialReg?: File;
  license?: File;
}

interface SignupFlowProps {
  onFlowStart?: () => void;
}

const SignupFlow = ({ onFlowStart }: SignupFlowProps) => {
  const navigate = useNavigate();
  const { language } = useLanguageContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    fullName: '',
    email: '',
    emailVerification: '',
    phone: '',
    password: '',
    role: '' as any, // No default selection
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
    // For providers, skip attendee pages (2-4) and go to provider page
    if (currentPage === 1 && signupData.role === 'provider') {
      setCurrentPage(10); // Provider page
    } else {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleBack = () => {
    // For providers on page 10, go back to page 1
    if (currentPage === 10) {
      setCurrentPage(1);
    } else {
      setCurrentPage(prev => prev - 1);
    }
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
            ...(signupData.role === 'attendee' ? {
              birth_date: signupData.birthDate,
              gender: signupData.gender,
              interests: signupData.interests
            } : {})
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
        const userId = authData.user.id;

        // Upload documents if provider
        let idDocumentUrl = null;
        let commercialRegUrl = null;
        let licenseUrl = null;

        if (signupData.role === 'provider') {
          // Upload ID document
          if (signupData.idDocument) {
            const idFileName = `${userId}/id_document_${Date.now()}.${signupData.idDocument.name.split('.').pop()}`;
            const { error: idUploadError } = await supabase.storage
              .from('provider-documents')
              .upload(idFileName, signupData.idDocument);
            
            if (idUploadError) throw idUploadError;
            
            const { data: idUrlData } = supabase.storage
              .from('provider-documents')
              .getPublicUrl(idFileName);
            idDocumentUrl = idUrlData.publicUrl;
          }

          // Upload commercial registration
          if (signupData.commercialReg) {
            const regFileName = `${userId}/commercial_reg_${Date.now()}.${signupData.commercialReg.name.split('.').pop()}`;
            const { error: regUploadError } = await supabase.storage
              .from('provider-documents')
              .upload(regFileName, signupData.commercialReg);
            
            if (regUploadError) throw regUploadError;
            
            const { data: regUrlData } = supabase.storage
              .from('provider-documents')
              .getPublicUrl(regFileName);
            commercialRegUrl = regUrlData.publicUrl;
          }

          // Upload license
          if (signupData.license) {
            const licenseFileName = `${userId}/license_${Date.now()}.${signupData.license.name.split('.').pop()}`;
            const { error: licenseUploadError } = await supabase.storage
              .from('provider-documents')
              .upload(licenseFileName, signupData.license);
            
            if (licenseUploadError) throw licenseUploadError;
            
            const { data: licenseUrlData } = supabase.storage
              .from('provider-documents')
              .getPublicUrl(licenseFileName);
            licenseUrl = licenseUrlData.publicUrl;
          }
        }

        // Update profile with role-specific data
        const profileUpdate: any = {
          full_name: signupData.fullName,
          email: signupData.email,
          phone: signupData.phone,
          city: signupData.city,
        };

        if (signupData.role === 'attendee') {
          profileUpdate.birth_date = signupData.birthDate;
          profileUpdate.gender = signupData.gender;
          profileUpdate.interests = signupData.interests;
          profileUpdate.interests_visibility = 'private';
          profileUpdate.verification_status = 'approved'; // Auto-approve attendees
        } else if (signupData.role === 'provider') {
          profileUpdate.service_types = signupData.serviceTypes;
          profileUpdate.address = signupData.address;
          profileUpdate.id_document_url = idDocumentUrl;
          profileUpdate.commercial_registration_url = commercialRegUrl;
          profileUpdate.license_url = licenseUrl;
          profileUpdate.verification_status = 'pending'; // Providers need admin approval
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', userId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw new Error('فشل تحديث الملف الشخصي');
        }

        // Set user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: signupData.role
          });

        if (roleError) {
          console.error('Role assignment error:', roleError);
          throw new Error('فشل تعيين نوع الحساب');
        }

        // Success message based on role
        const successMessage = signupData.role === 'provider' 
          ? (language === 'ar' 
              ? "تم إنشاء الحساب بنجاح! سيتم مراجعة مستنداتك وإعلامك بالنتيجة" 
              : "Account created successfully! Your documents will be reviewed and you will be notified.")
          : (language === 'ar' 
              ? "تم إنشاء الحساب بنجاح!" 
              : "Account created successfully!");

        toast.success(successMessage, { duration: 8000 });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      // User-friendly error messages without exposing technical details
      let errorMessage: string;
      
      if (error.message?.includes('البريد') || error.message?.includes('email') || error.message?.includes('already registered')) {
        errorMessage = language === 'ar' 
          ? 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر.'
          : 'This email is already registered. Please use a different email.';
      } else if (error.message?.includes('password')) {
        errorMessage = language === 'ar'
          ? 'كلمة المرور غير صالحة. يجب أن تكون 6 أحرف على الأقل.'
          : 'Invalid password. It must be at least 6 characters.';
      } else {
        errorMessage = language === 'ar' 
          ? 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى لاحقاً.'
          : 'An error occurred while creating your account. Please try again later.';
      }
      
      toast.error(errorMessage, { duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalPages = () => {
    return signupData.role === 'provider' ? 2 : 4;
  };

  const getCurrentStep = () => {
    if (currentPage === 10) return 2; // Provider page 2
    return currentPage;
  };

  const getProgressPercentage = () => {
    return Math.round((getCurrentStep() / getTotalPages()) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            خطوة {getCurrentStep()} من {getTotalPages()}
          </span>
          <span className="text-sm font-medium">{getProgressPercentage()}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Page 1 - Basic Info (Both Attendee & Provider) */}
      {currentPage === 1 && (
        <SignupPage1
          data={signupData}
          updateData={updateSignupData}
          onNext={handleNext}
        />
      )}

      {/* Attendee Flow - Pages 2-4 */}
      {currentPage === 2 && signupData.role === 'attendee' && (
        <SignupPage2
          data={signupData}
          updateData={updateSignupData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentPage === 3 && signupData.role === 'attendee' && (
        <SignupPage3
          data={signupData}
          updateData={updateSignupData}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {currentPage === 4 && signupData.role === 'attendee' && (
        <SignupPage4
          data={signupData}
          updateData={updateSignupData}
          onBack={handleBack}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Provider Flow - Page 10 (Service Provider Details) */}
      {currentPage === 10 && signupData.role === 'provider' && (
        <SignupPage2Provider
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
