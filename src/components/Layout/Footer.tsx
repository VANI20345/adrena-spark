import { Link } from "react-router-dom";
import { Mountain, Instagram, Twitter, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg hero-gradient">
                <Mountain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">أدرينا</span>
            </div>
            <p className="text-sm text-muted-foreground">
              منصة الأنشطة الخارجية والمغامرات الرائدة في المملكة العربية السعودية
            </p>
            <div className="flex space-x-4 rtl:space-x-reverse">
              <Instagram className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
              <Twitter className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
              <Youtube className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              <li><Link to="/explore" className="text-sm text-muted-foreground hover:text-primary smooth-transition">استكشاف الفعاليات</Link></li>
              <li><Link to="/services" className="text-sm text-muted-foreground hover:text-primary smooth-transition">الخدمات</Link></li>
              <li><Link to="/create-event" className="text-sm text-muted-foreground hover:text-primary smooth-transition">أنشئ فعاليتك</Link></li>
              <li><Link to="/create-service" className="text-sm text-muted-foreground hover:text-primary smooth-transition">قدّم خدمتك</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">الدعم</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-sm text-muted-foreground hover:text-primary smooth-transition">مركز المساعدة</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary smooth-transition">تواصل معنا</Link></li>
              <li><Link to="/safety" className="text-sm text-muted-foreground hover:text-primary smooth-transition">إرشادات السلامة</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">قانوني</h3>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary smooth-transition">الشروط والأحكام</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary smooth-transition">سياسة الخصوصية</Link></li>
              <li><Link to="/refund" className="text-sm text-muted-foreground hover:text-primary smooth-transition">سياسة الاسترداد</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 أدرينا. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;