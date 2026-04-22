import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TrainingSet {
  date: string;
  start_time: string;
  end_time: string;
  available_spots: number;
}

interface TrainingSetsSchedulerProps {
  trainingSets: TrainingSet[];
  setTrainingSets: (sets: TrainingSet[]) => void;
  maxCapacity: number;
  durationPerSet: number;
}

// Helper functions for 12-hour time format
const to12Hour = (time24: string): { time: string; period: 'AM' | 'PM' } => {
  if (!time24) return { time: '', period: 'AM' };
  const [hours, minutes] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return { time: `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, period };
};

const to24Hour = (time12: string, period: 'AM' | 'PM'): string => {
  if (!time12) return '';
  const [hours, minutes] = time12.split(':').map(Number);
  let hours24 = hours;
  if (period === 'PM' && hours !== 12) hours24 += 12;
  if (period === 'AM' && hours === 12) hours24 = 0;
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const addMinutes = (time24: string, minutes: number): string => {
  if (!time24) return '';
  const [hours, mins] = time24.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
};

const TrainingSetsScheduler = ({ trainingSets, setTrainingSets, maxCapacity, durationPerSet }: TrainingSetsSchedulerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [startTime12, setStartTime12] = useState("");
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [currentSet, setCurrentSet] = useState<TrainingSet>({
    date: "",
    start_time: "",
    end_time: "",
    available_spots: maxCapacity || 10,
  });

  // Update available_spots when maxCapacity changes
  useEffect(() => {
    if (maxCapacity && !editingIndex) {
      setCurrentSet(prev => ({ ...prev, available_spots: maxCapacity }));
    }
  }, [maxCapacity, editingIndex]);

  // Calculate end time when start time or duration changes
  useEffect(() => {
    if (startTime12 && durationPerSet > 0) {
      const startTime24 = to24Hour(startTime12, startPeriod);
      const endTime24 = addMinutes(startTime24, durationPerSet);
      setCurrentSet(prev => ({ ...prev, start_time: startTime24, end_time: endTime24 }));
    }
  }, [startTime12, startPeriod, durationPerSet]);

  const handleAddSet = () => {
    setError("");

    // Validate date
    if (!currentSet.date) {
      setError("يرجى تحديد التاريخ");
      return;
    }

    const selectedDate = new Date(currentSet.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError("لا يمكن اختيار تاريخ في الماضي");
      return;
    }

    // Validate times
    if (!currentSet.start_time || !currentSet.end_time) {
      setError("يرجى تحديد أوقات الجلسة");
      return;
    }

    const [startHour, startMin] = currentSet.start_time.split(':').map(Number);
    const [endHour, endMin] = currentSet.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      setError("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }

    if (editingIndex !== null) {
      const updated = [...trainingSets];
      updated[editingIndex] = currentSet;
      setTrainingSets(updated);
      setEditingIndex(null);
    } else {
      setTrainingSets([...trainingSets, currentSet]);
    }
    setCurrentSet({ date: "", start_time: "", end_time: "", available_spots: maxCapacity || 10 });
    setStartTime12("");
    setStartPeriod('AM');
    setIsDialogOpen(false);
  };

  const handleEdit = (index: number) => {
    const set = trainingSets[index];
    setCurrentSet(set);
    const { time, period } = to12Hour(set.start_time);
    setStartTime12(time);
    setStartPeriod(period);
    setEditingIndex(index);
    setError("");
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteIndex !== null) {
      setTrainingSets(trainingSets.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const openAddDialog = () => {
    setCurrentSet({ date: "", start_time: "", end_time: "", available_spots: maxCapacity || 10 });
    setStartTime12("");
    setStartPeriod('AM');
    setEditingIndex(null);
    setError("");
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" onClick={openAddDialog} className="w-full">
            <Plus className="w-4 h-4 ml-2" />
            إضافة موعد تدريب
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">{editingIndex !== null ? "تعديل" : "إضافة"} موعد تدريب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-right">
              <Label className="text-right block mb-2">التاريخ</Label>
              <Input
                type="date"
                value={currentSet.date}
                onChange={(e) => setCurrentSet({ ...currentSet, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="text-right"
              />
            </div>

            <div className="text-right">
              <Label className="text-right block mb-2">وقت البداية</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="time"
                  value={startTime12}
                  onChange={(e) => setStartTime12(e.target.value)}
                  className="col-span-2 text-right"
                  placeholder="00:00"
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={startPeriod === 'AM' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStartPeriod('AM')}
                    className="flex-1"
                  >
                    AM
                  </Button>
                  <Button
                    type="button"
                    variant={startPeriod === 'PM' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStartPeriod('PM')}
                    className="flex-1"
                  >
                    PM
                  </Button>
                </div>
              </div>
            </div>

            {currentSet.end_time && (
              <div className="text-right p-3 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">وقت النهاية (محسوب تلقائياً)</Label>
                <p className="text-lg font-semibold mt-1">
                  {(() => {
                    const { time, period } = to12Hour(currentSet.end_time);
                    return `${time} ${period}`;
                  })()}
                </p>
              </div>
            )}

            <div className="text-right p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm text-muted-foreground">عدد الأماكن المتاحة</Label>
              <p className="text-lg font-semibold mt-1">{currentSet.available_spots} شخص</p>
              <p className="text-xs text-muted-foreground mt-1">محدد من الحد الأقصى للمتدربين</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={handleAddSet} className="flex-1">
                {editingIndex !== null ? "حفظ التعديلات" : "إضافة"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {trainingSets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              لم يتم إضافة أي مواعيد بعد
              <br />
              <span className="text-sm">انقر على "إضافة موعد تدريب" لإضافة مواعيد</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trainingSets.map((set, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        {format(new Date(set.date), "d MMMM yyyy", { locale: ar })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {(() => {
                          const start = to12Hour(set.start_time);
                          const end = to12Hour(set.end_time);
                          return `${start.time} ${start.period} - ${end.time} ${end.period}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{set.available_spots} أماكن متاحة</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteIndex(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف موعد التدريب هذا نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrainingSetsScheduler;