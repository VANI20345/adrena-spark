import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: 'orange' | 'lime' | 'purple' | 'teal';
}

const accentMap = {
  orange: 'bg-brand-orange',
  lime: 'bg-brand-lime',
  purple: 'bg-brand-purple',
  teal: 'bg-brand-teal',
};

const SectionHeader = ({ title, subtitle, accentColor = 'orange' }: SectionHeaderProps) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-2">
      <span className={`w-1 h-6 rounded-full ${accentMap[accentColor]}`} />
      <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
        {title}
      </h2>
    </div>
    {subtitle && (
      <p className="text-sm text-muted-foreground max-w-xl mr-4 font-display">
        {subtitle}
      </p>
    )}
  </div>
);

export default SectionHeader;
