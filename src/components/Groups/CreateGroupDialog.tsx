import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
}

export const CreateGroupDialog = ({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) => {
  const { language } = useLanguageContext();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    category: '',
    type: 'public' as 'public' | 'private',
    max_members: 500,
    image_url: ''
  });
  
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'مغامرات', label: language === 'ar' ? 'مغامرات' : 'Adventures' },
    { value: 'تخييم', label: language === 'ar' ? 'تخييم' : 'Camping' },
    { value: 'تسلق', label: language === 'ar' ? 'تسلق' : 'Climbing' },
    { value: 'رياضة', label: language === 'ar' ? 'رياضة' : 'Sports' },
    { value: 'طبيعة', label: language === 'ar' ? 'طبيعة' : 'Nature' },
    { value: 'تصوير', label: language === 'ar' ? 'تصوير' : 'Photography' },
    { value: 'أخرى', label: language === 'ar' ? 'أخرى' : 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.category) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      // API call to create group
      console.log('Creating group:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: language === 'ar' ? 'تم إنشاء المجموعة' : 'Group Created',
        description: language === 'ar' ? 'تم إنشاء المجموعة بنجاح' : 'Group created successfully'
      });
      
      onGroupCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        category: '',
        type: 'public',
        max_members: 500,
        image_url: ''
      });
      
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إنشاء المجموعة' : 'Failed to create group',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle image upload
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          image_url: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إنشاء مجموعة جديدة' : 'Create New Group'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Image */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'صورة المجموعة (اختيارية)' : 'Group Image (Optional)'}</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
                {formData.image_url ? (
                  <img 
                    src={formData.image_url} 
                    alt="Group" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="group-image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('group-image')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'رفع صورة' : 'Upload Image'}
                </Button>
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {language === 'ar' ? 'اسم المجموعة (عربي)' : 'Group Name (Arabic)'} *
              </Label>
              <Input
                id="name"
                value={language === 'ar' ? formData.name : formData.name_ar}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [language === 'ar' ? 'name' : 'name_ar']: e.target.value
                }))}
                placeholder={language === 'ar' ? 'أدخل اسم المجموعة' : 'Enter group name in Arabic'}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_en">
                {language === 'ar' ? 'اسم المجموعة (إنجليزي)' : 'Group Name (English)'}
              </Label>
              <Input
                id="name_en"
                value={language === 'ar' ? formData.name_ar : formData.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [language === 'ar' ? 'name_ar' : 'name']: e.target.value
                }))}
                placeholder={language === 'ar' ? 'أدخل اسم المجموعة بالإنجليزية' : 'Enter group name in English'}
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">
                {language === 'ar' ? 'وصف المجموعة (عربي)' : 'Group Description (Arabic)'} *
              </Label>
              <Textarea
                id="description"
                value={language === 'ar' ? formData.description : formData.description_ar}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [language === 'ar' ? 'description' : 'description_ar']: e.target.value
                }))}
                placeholder={language === 'ar' ? 'اكتب وصفاً للمجموعة وأهدافها' : 'Write description in Arabic'}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_en">
                {language === 'ar' ? 'وصف المجموعة (إنجليزي)' : 'Group Description (English)'}
              </Label>
              <Textarea
                id="description_en"
                value={language === 'ar' ? formData.description_ar : formData.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [language === 'ar' ? 'description_ar' : 'description']: e.target.value
                }))}
                placeholder={language === 'ar' ? 'اكتب وصفاً للمجموعة بالإنجليزية' : 'Write description in English'}
                rows={4}
              />
            </div>
          </div>

          {/* Category and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفئة' : 'Category'} *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_members">{language === 'ar' ? 'الحد الأقصى للأعضاء' : 'Max Members'}</Label>
              <Input
                id="max_members"
                type="number"
                min="10"
                max="5000"
                value={formData.max_members}
                onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 500 }))}
              />
            </div>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                {language === 'ar' ? 'مجموعة خاصة' : 'Private Group'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 
                  'المجموعات الخاصة تتطلب موافقة للانضمام' : 
                  'Private groups require approval to join'
                }
              </p>
            </div>
            <Switch
              checked={formData.type === 'private'}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                type: checked ? 'private' : 'public' 
              }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'
              ) : (
                language === 'ar' ? 'إنشاء المجموعة' : 'Create Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};