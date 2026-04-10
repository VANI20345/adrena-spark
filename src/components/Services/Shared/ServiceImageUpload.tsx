import { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface ServiceImageUploadProps {
  form: UseFormReturn<any>;
}

const ServiceImageUpload = ({ form }: ServiceImageUploadProps) => {
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [detailPreviews, setDetailPreviews] = useState<string[]>([]);

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setThumbnailPreview(result);
        form.setValue("thumbnail", file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetailImagesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const currentFiles = form.getValues("detail_images") || [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setDetailPreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    
    form.setValue("detail_images", [...currentFiles, ...files]);
  };

  const removeDetailImage = (index: number) => {
    const currentFiles = form.getValues("detail_images") || [];
    const newFiles = currentFiles.filter((_: any, i: number) => i !== index);
    form.setValue("detail_images", newFiles);
    setDetailPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="thumbnail"
        render={() => (
          <FormItem>
            <FormLabel>صورة مصغرة للخدمة (Thumbnail)</FormLabel>
            <FormControl>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
                    {thumbnailPreview ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail Preview" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.preventDefault();
                            setThumbnailPreview(null);
                            form.setValue("thumbnail", null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">انقر لتحديد صورة مصغرة</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG أو JPEG (MAX. 5MB)
                        </p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                    />
                  </label>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="detail_images"
        render={() => (
          <FormItem>
            <FormLabel>صور تفصيلية للخدمة</FormLabel>
            <FormControl>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">انقر لإضافة صور تفصيلية</span>
                      </p>
                      <p className="text-xs text-muted-foreground">يمكنك اختيار عدة صور</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      multiple
                      onChange={handleDetailImagesUpload}
                    />
                  </label>
                </div>

                {detailPreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {detailPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={preview} 
                          alt={`Detail ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeDetailImage(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default ServiceImageUpload;