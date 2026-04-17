import * as React from 'react'; // React namespace required for React.ReactNode

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <hr className="mt-1.5 border-border" />
      </div>
      {children}
    </div>
  );
}
