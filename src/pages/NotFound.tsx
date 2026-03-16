import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">🏔️</div>
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">
          يبدو أنك تهت في البرية!
        </p>
        <p className="text-muted-foreground mb-6">
          الصفحة التي تبحث عنها غير موجودة
        </p>
        <a 
          href="/" 
          className="inline-flex items-center px-6 py-3 text-primary-foreground bg-primary hover:bg-primary-glow rounded-lg smooth-transition"
        >
          العودة للصفحة الرئيسية
        </a>
      </div>
    </div>
  );
};

export default NotFound;
