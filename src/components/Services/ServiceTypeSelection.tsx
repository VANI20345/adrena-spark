import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Percent, GraduationCap, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";

const ServiceTypeSelection = () => {
  const navigate = useNavigate();

  const serviceTypes = [
    {
      type: 'discount',
      icon: <Percent className="w-12 h-12 text-primary" />,
      title: "خدمات مخفضة",
      titleEn: "Discount Services",
      description: "قدم خدمات بأسعار مخفضة لفترة محدودة لجذب المزيد من العملاء",
      descriptionEn: "Offer services at discounted prices for a limited time",
      path: '/create-service/discount'
    },
    {
      type: 'training',
      icon: <GraduationCap className="w-12 h-12 text-primary" />,
      title: "تدريب",
      titleEn: "Training Service",
      description: "قدم تدريبات احترافية للمغامرين وعشاق الأنشطة الخارجية",
      descriptionEn: "Provide professional training for adventurers",
      path: '/create-service/training'
    },
    {
      type: 'other',
      icon: <Package className="w-12 h-12 text-primary" />,
      title: "خدمات إضافية أخرى",
      titleEn: "Other Additional Services",
      description: "خدمات متنوعة أخرى تقدمها للمغامرين",
      descriptionEn: "Various other services you provide",
      path: '/create-service/other'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              إضافة خدمة جديدة
            </h1>
            <p className="text-lg text-muted-foreground">
              اختر نوع الخدمة التي تريد إضافتها
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {serviceTypes.map((service) => (
              <Card 
                key={service.type}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col"
                onClick={() => navigate(service.path)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {service.icon}
                  </div>
                  <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mb-1">
                    {service.titleEn}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center flex flex-col flex-1">
                  <p className="text-muted-foreground mb-2">{service.description}</p>
                  <p className="text-sm text-muted-foreground mb-4">{service.descriptionEn}</p>
                  <Button 
                    className="w-full mt-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(service.path);
                    }}
                  >
                    اختر هذا النوع
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceTypeSelection;