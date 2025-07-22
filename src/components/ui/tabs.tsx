import * as React from 'react';

type TabsProps = {
  defaultValue: string;
  children: React.ReactNode;
};

export const Tabs = ({ defaultValue, children }: TabsProps) => {
  const [selected, setSelected] = React.useState(defaultValue);

  return (
    <div>
      {React.Children.map(children, (child) =>
        React.isValidElement<TabsListProps>(child) && child.type === TabsList
          ? React.cloneElement(child, { selected, setSelected })
          : child
      )}
    </div>
  );
};

type TabsListProps = {
  children: React.ReactNode;
  selected: string;
  setSelected: (value: string) => void;
};

export const TabsList = ({ children, selected, setSelected }: TabsListProps) => (
  <div className="flex border-b">
    {React.Children.map(children, (child) =>
      React.isValidElement<TabsTriggerProps>(child) ? React.cloneElement(child, { selected, setSelected }) : child
    )}
  </div>
);

type TabsTriggerProps = {
  value: string;
  children: React.ReactNode;
  selected: string;
  setSelected: (value: string) => void;
};

export const TabsTrigger = ({ value, children, selected, setSelected }: TabsTriggerProps) => (
  <button
    className={`px-4 py-2 ${selected === value ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}
    onClick={() => setSelected(value)}
  >
    {children}
  </button>
);
