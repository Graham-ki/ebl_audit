// app/employees/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Employee {
  id: number;
  name: string;
  role: string;
  contact: string;
  salary: number;
  start_date: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

interface AttendanceRecord {
  id: number;
  employee_id: number;
  day: number;
  month: number;
  year: number;
  status: 'Present' | 'Absent';
  created_at: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState<Omit<Employee, "id" | "created_at">>({
    name: "",
    role: "",
    contact: "",
    salary: 0,
    start_date: new Date().toISOString().split('T')[0],
    status: 'Active'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [weekStartDate, setWeekStartDate] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false });

        if (employeesError) throw employeesError;
        setEmployees(employeesData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchAttendance = async (employeeId: number) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance records.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'salary' ? Number(value) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([formData])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setEmployees(prev => [data[0], ...prev]);
        setFormData({
          name: "",
          role: "",
          contact: "",
          salary: 0,
          start_date: new Date().toISOString().split('T')[0],
          status: 'Active'
        });
        setIsDialogOpen(false);
      }
    } catch (err) {
      console.error('Error adding employee:', err);
      setError('Failed to add employee. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.filter(employee => employee.id !== id));
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee. Please try again.');
    }
  };

  const toggleStatus = async (id: number, currentStatus: 'Active' | 'Inactive') => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ status: currentStatus === 'Active' ? 'Inactive' : 'Active' })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setEmployees(prev => prev.map(emp => 
          emp.id === id ? { ...emp, status: data[0].status } : emp
        ));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update employee status.');
    }
  };

  const openAttendanceModal = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await fetchAttendance(employee.id);
    setShowAttendanceModal(true);
  };

  const markAttendance = async (date: Date, status: 'Present' | 'Absent') => {
    if (!selectedEmployee) return;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedEmployee.id)
        .eq('day', day)
        .eq('month', month)
        .eq('year', year)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id)
          .select();

        if (error) throw error;

        setAttendanceRecords(prev => prev.map(rec => 
          rec.id === existing.id ? { ...rec, status } : rec
        ));
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert([{
            employee_id: selectedEmployee.id,
            day,
            month,
            year,
            status
          }])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setAttendanceRecords(prev => [...prev, data[0]]);
        }
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('Failed to mark attendance. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  const getAttendanceStatus = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const record = attendanceRecords.find(rec => 
      rec.day === day && rec.month === month && rec.year === year
    );

    return record ? record.status : 'Absent';
  };

  const getWeekDates = (startDate: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getMonthDates = (month: number, year: number) => {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month - 1, day));
    }
    return dates;
  };

  const getYearMonths = (year: number) => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      months.push(new Date(year, month, 1));
    }
    return months;
  };

  const renderDayView = () => (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h4 className="font-medium mb-4 text-lg">
        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </h4>
      <div className="flex items-center gap-4">
        <span className="font-medium">Status:</span>
        <button
          onClick={() => markAttendance(selectedDate, 'Present')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${getAttendanceStatus(selectedDate) === 'Present' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-50 border border-gray-200'}`}
        >
          <span>✅</span> Present
        </button>
        <button
          onClick={() => markAttendance(selectedDate, 'Absent')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${getAttendanceStatus(selectedDate) === 'Absent' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-50 border border-gray-200'}`}
        >
          <span>❌</span> Absent
        </button>
      </div>
    </div>
  );

  const renderWeekView = () => {
    const weekDates = getWeekDates(weekStartDate);
    
    return (
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h4 className="font-medium">
            Week of {weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
            {new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </h4>
          <div className="flex gap-2">
            <button 
              onClick={() => setWeekStartDate(new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              ◀
            </button>
            <button 
              onClick={() => setWeekStartDate(new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              ▶
            </button>
          </div>
        </div>
        
        <div className="divide-y">
          {weekDates.map(date => (
            <div key={date.toString()} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium w-32">
                  {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${getAttendanceStatus(date) === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {getAttendanceStatus(date)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => markAttendance(date, 'Present')}
                  className="px-3 py-1 text-sm rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                >
                  Mark Present
                </button>
                <button
                  onClick={() => markAttendance(date, 'Absent')}
                  className="px-3 py-1 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Mark Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDates = getMonthDates(selectedMonth, selectedYear);
    const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' });
    
    return (
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h4 className="font-medium">
            {monthName} {selectedYear}
          </h4>
          <div className="flex gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1 border rounded-lg"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-20 px-3 py-1 border rounded-lg"
              min="2000"
              max="2100"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 p-2 bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 p-2">
          {monthDates.map(date => (
            <div 
              key={date.toString()}
              className={`p-2 h-16 border rounded-lg ${date.getMonth() + 1 !== selectedMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}
            >
              <div className="flex flex-col h-full">
                <span className="text-xs">{date.getDate()}</span>
                <span className={`text-xs mt-1 px-1 rounded ${getAttendanceStatus(date) === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {getAttendanceStatus(date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const yearMonths = getYearMonths(selectedYear);
    
    return (
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h4 className="font-medium">
            {selectedYear}
          </h4>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-24 px-3 py-1 border rounded-lg"
            min="2000"
            max="2100"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4 p-4">
          {yearMonths.map(month => {
            const monthName = month.toLocaleDateString('en-US', { month: 'long' });
            const status = attendanceRecords.some(rec => 
              rec.month === month.getMonth() + 1 && rec.year === month.getFullYear()
            ) ? 'Some Records' : 'No Records';
            
            return (
              <div 
                key={monthName}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedMonth(month.getMonth() + 1);
                  setSelectedYear(month.getFullYear());
                  setAttendanceFilter('month');
                }}
              >
                <div className="font-medium">{monthName}</div>
                <div className={`text-sm mt-1 ${status === 'Some Records' ? 'text-green-600' : 'text-gray-500'}`}>
                  {status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAttendanceView = () => {
    switch (attendanceFilter) {
      case 'day': return renderDayView();
      case 'week': return renderWeekView();
      case 'month': return renderMonthView();
      case 'year': return renderYearView();
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-500">👥</span> Employee Management
            </h1>
            <p className="text-gray-600">Manage your team and track attendance</p>
          </div>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>+</span> Add Employee
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {employees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No employees yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first team member</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{employee.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(employee.salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(employee.id, employee.status)}
                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {employee.status === 'Active' ? '✅' : '❌'} {employee.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(employee.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openAttendanceModal(employee)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                        >
                          <span>📅</span> Attendance
                        </button>
                        <button 
                          onClick={() => handleDelete(employee.id)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                        >
                          <span>🗑️</span> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Employee</h3>
                <button 
                  onClick={() => setIsDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary/Wage
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span>📅</span> Attendance for {selectedEmployee.name}
                </h3>
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">View:</span>
                  <select
                    value={attendanceFilter}
                    onChange={(e) => setAttendanceFilter(e.target.value as 'day' | 'week' | 'month' | 'year')}
                    className="px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                
                {attendanceFilter === 'day' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Date:</span>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                
                {attendanceFilter === 'week' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Week of:</span>
                    <input
                      type="date"
                      value={weekStartDate.toISOString().split('T')[0]}
                      onChange={(e) => setWeekStartDate(new Date(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                
                {attendanceFilter === 'month' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="2000"
                      max="2100"
                    />
                  </div>
                )}
                
                {attendanceFilter === 'year' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Year:</span>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="2000"
                      max="2100"
                    />
                  </div>
                )}
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {renderAttendanceView()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
