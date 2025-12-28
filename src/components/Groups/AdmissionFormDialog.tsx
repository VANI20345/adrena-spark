import React, { useState } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, ChevronLeft, ChevronRight, Loader2, Check, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AdmissionFormDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  questions: string[];
  onSuccess: () => void;
}

export const AdmissionFormDialog: React.FC<AdmissionFormDialogProps> = ({
  open,
  onClose,
  groupId,
  groupName,
  questions,
  onSuccess
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const useStepByStep = questions.length > 2;
  const totalSteps = questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };
  
  const canProceed = answers[currentStep]?.trim().length > 0;
  const allAnswered = answers.every(a => a.trim().length > 0);
  
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (answers.some(a => !a.trim())) {
      toast({
        title: isRTL ? 'مطلوب' : 'Required',
        description: isRTL ? 'الرجاء الإجابة على جميع الأسئلة' : 'Please answer all questions',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          status: 'pending',
          message: isRTL ? 'طلب انضمام مع نموذج القبول' : 'Join request with admission form',
          admission_answers: questions.map((q, i) => ({
            question: q,
            answer: answers[i].trim()
          }))
        });
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: isRTL ? 'طلب موجود' : 'Request Exists',
            description: isRTL 
              ? 'لديك طلب انضمام قيد المراجعة بالفعل'
              : 'You already have a pending join request',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }
      
      toast({
        title: isRTL ? 'تم إرسال الطلب' : 'Request Submitted',
        description: isRTL 
          ? 'سيتم مراجعة إجاباتك من قبل قائد المجموعة'
          : 'Your answers will be reviewed by the group leader'
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting admission form:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل إرسال الطلب' : 'Failed to submit request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setCurrentStep(0);
    setAnswers(questions.map(() => ''));
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <ClipboardList className="w-6 h-6 text-primary" />
            </motion.div>
            <div>
              <DialogTitle className="text-xl">
                {isRTL ? 'نموذج الانضمام' : 'Admission Form'}
              </DialogTitle>
              <DialogDescription>{groupName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {/* Step Progress - Only show for 3+ questions */}
        {useStepByStep && (
          <div className="space-y-3 pt-4 flex-shrink-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isRTL ? `السؤال ${currentStep + 1} من ${totalSteps}` : `Question ${currentStep + 1} of ${totalSteps}`}
              </span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm font-medium",
                    index === currentStep
                      ? "bg-primary text-primary-foreground shadow-lg scale-110"
                      : answers[index]?.trim()
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {answers[index]?.trim() && index !== currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4">
            {useStepByStep ? (
              /* Step-by-step mode */
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <Label className="font-medium text-base leading-relaxed block">
                    {questions[currentStep]}
                  </Label>
                  <Textarea
                    value={answers[currentStep]}
                    onChange={(e) => handleAnswerChange(currentStep, e.target.value)}
                    placeholder={isRTL ? 'إجابتك...' : 'Your answer...'}
                    rows={5}
                    className="resize-none text-base"
                    autoFocus
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              /* All questions at once for 1-2 questions */
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? 'يرجى الإجابة على الأسئلة التالية للانضمام إلى المجموعة'
                    : 'Please answer the following questions to join the group'
                  }
                </p>
                
                {questions.map((question, index) => (
                  <motion.div 
                    key={index} 
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Label className="font-medium">
                      {index + 1}. {question}
                    </Label>
                    <Textarea
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder={isRTL ? 'إجابتك...' : 'Your answer...'}
                      rows={3}
                      required
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex-shrink-0 pt-4 border-t">
            {useStepByStep ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 0 ? handleClose : handlePrev}
                  className="gap-2"
                >
                  {isRTL ? (
                    <>
                      {currentStep === 0 ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'السابق' : 'Previous')}
                      {currentStep > 0 && <ChevronRight className="w-4 h-4" />}
                    </>
                  ) : (
                    <>
                      {currentStep > 0 && <ChevronLeft className="w-4 h-4" />}
                      {currentStep === 0 ? 'Cancel' : 'Previous'}
                    </>
                  )}
                </Button>
                
                {currentStep < totalSteps - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="gap-2"
                  >
                    {isRTL ? (
                      <>
                        <ChevronLeft className="w-4 h-4" />
                        {isRTL ? 'التالي' : 'Next'}
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !allAnswered}
                    className="gap-2 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isRTL ? 'جاري الإرسال...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {isRTL ? 'إرسال الطلب' : 'Submit Request'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !allAnswered}
                  className="gap-2 min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isRTL ? 'جاري الإرسال...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {isRTL ? 'إرسال الطلب' : 'Submit Request'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};