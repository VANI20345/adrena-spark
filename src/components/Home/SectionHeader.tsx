import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: 'orange' | 'lime' | 'purple' | 'teal';
}

const accentMap = {
  orange: 'bg-[hsl(var(--brand-orange))]',
  lime: 'bg-[hsl(var(--brand-lime))]',
  purple: 'bg-[hsl(var(--brand-purple))]',
  teal: 'bg-[hsl(var(--brand-teal))]',
};

const SectionHeader = ({ title, subtitle, accentColor = 'orange' }: SectionHeaderProps) => (
  <div className="mb-10">
    <div className="flex items-center gap-3 mb-3">
      <span className={`w-1.5 h-7 rounded-full ${accentMap[accentColor]}`} />
      <h2 className="text-2xl md:text-3xl font-bold text-foreground">
        {title}
      </h2>
    </div>
    {subtitle && (
      <p className="text-sm md:text-base text-muted-foreground max-w-2xl mr-5">
        {subtitle}
      </p>
    )}
  </div>
);

export default SectionHeader;
