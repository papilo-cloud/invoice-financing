import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Calendar, DollarSign, User } from 'lucide-react';

export const InvoiceForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    debtorName: '',
    faceValue: '',
    dueDate: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Debtor Name</label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            name="debtorName"
            value={formData.debtorName}
            onChange={handleChange}
            className="input-field pl-12"
            placeholder="Apple Inc."
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Face Value (ETH)</label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="number"
            name="faceValue"
            value={formData.faceValue}
            onChange={handleChange}
            className="input-field pl-12"
            placeholder="50000"
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Due Date</label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="input-field pl-12"
            min={minDateString}
            required
          />
        </div>
      </div>
      <Button type="submit" loading={loading} className="w-full">
        Create Invoice
      </Button>
    </form>
  );
};