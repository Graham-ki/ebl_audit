// components/DateRangePicker.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface DateRangePickerProps {
  onChange: (range: { start: Date; end: Date }) => void;
  initialRange: { start: Date; end: Date };
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, initialRange }) => {
  const [startDate, setStartDate] = useState<string>(
    initialRange.start.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    initialRange.end.toISOString().split('T')[0]
  );

  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      onChange({ start, end });
    }
  }, [startDate, endDate, onChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-4">
      <div className="flex items-center">
        <label htmlFor="start-date" className="mr-2 text-sm text-gray-600">From:</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          max={endDate}
        />
      </div>
      <div className="flex items-center">
        <label htmlFor="end-date" className="mr-2 text-sm text-gray-600">To:</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          min={startDate}
        />
      </div>
      <button
        onClick={() => {
          const today = new Date();
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          setStartDate(lastMonth.toISOString().split('T')[0]);
          setEndDate(today.toISOString().split('T')[0]);
        }}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        Reset
      </button>
    </div>
  );
};
