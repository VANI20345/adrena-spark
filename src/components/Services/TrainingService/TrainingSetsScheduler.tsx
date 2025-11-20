import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
}

const TrainingSetsScheduler = ({ trainingSets, setTrainingSets }: TrainingSetsSchedulerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [currentSet, setCurrentSet] = useState<TrainingSet>({
    date: "",
    start_time: "",
    end_time: "",
    available_spots: 10,
  });

  const handleAddSet = () => {
    if (editingIndex !== null) {
      const updated = [...trainingSets];
      updated[editingIndex] = currentSet;
      setTrainingSets(updated);
      setEditingIndex(null);
    } else {
      setTrainingSets([...trainingSets, currentSet]);
    }
    setCurrentSet({ date: "", start_time: "", end_time: "", available_spots: 10 });
    setIsDialogOpen(false);
  };

  const handleEdit = (index: number) => {
    setCurrentSet(trainingSets[index]);
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteIndex !== null) {
      setTrainingSets(trainingSets.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const openAddDialog = () => {
    setCurrentSet({ date: "", start_time: "", end_time: "", available_spots: 10 });
    setEditingIndex(null);
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
            <DialogTitle>{editingIndex !== null ? "تعديل" : "إضافة"} موعد تدريب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={currentSet.date}
                onChange={(e) => setCurrentSet({ ...currentSet, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>من الساعة</Label>
                <Input
                  type="time"
                  value={currentSet.start_time}
                  onChange={(e) => setCurrentSet({ ...currentSet, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>إلى الساعة</Label>
                <Input
                  type="time"
                  value={currentSet.end_time}
                  onChange={(e) => setCurrentSet({ ...currentSet, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>عدد الأماكن المتاحة</Label>
              <Input
                type="number"
                min="1"
                value={currentSet.available_spots}
                onChange={(e) => setCurrentSet({ ...currentSet, available_spots: Number(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleAddSet} className="flex-1">
                {editingIndex !== null ? "حفظ التعديلات" : "إضافة"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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
                      <span>{set.start_time} - {set.end_time}</span>
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