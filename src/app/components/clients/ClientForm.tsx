import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { X, Plus, Building2, User, Mail, Phone, DollarSign, MapPin, Palette } from 'lucide-react';

interface ClientFormProps {
  clientId: string | null;
  onClose: () => void;
}

// Predefined color palette for clients
const CLIENT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#10b981', // green
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#14b8a6', // teal
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const ClientForm = ({ clientId, onClose }: ClientFormProps) => {
  const { clients, addClient, updateClient } = useData();

  const existingClient = clientId ? clients.find((c) => c.id === clientId) : null;

  const [name, setName] = useState(existingClient?.name || '');
  const [billingFirstName, setBillingFirstName] = useState(existingClient?.billingFirstName || '');
  const [billingLastName, setBillingLastName] = useState(existingClient?.billingLastName || '');
  const [billingPhone, setBillingPhone] = useState(existingClient?.billingPhone || '');
  const [billingEmail, setBillingEmail] = useState(existingClient?.billingEmail || '');
  const [ccEmails, setCcEmails] = useState<string[]>(existingClient?.ccEmails || []);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [addressStreet, setAddressStreet] = useState(existingClient?.addressStreet || '');
  const [addressCity, setAddressCity] = useState(existingClient?.addressCity || '');
  const [addressState, setAddressState] = useState(existingClient?.addressState || '');
  const [addressZip, setAddressZip] = useState(existingClient?.addressZip || '');
  const [addressCountry, setAddressCountry] = useState(existingClient?.addressCountry || 'United States');
  const [hourlyRate, setHourlyRate] = useState(
    existingClient?.hourlyRate?.toString() || '150'
  );
  const [color, setColor] = useState(
    existingClient?.color || CLIENT_COLORS[Math.floor(Math.random() * CLIENT_COLORS.length)]
  );

  const handleAddCcEmail = () => {
    if (newCcEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCcEmail.trim())) {
      setCcEmails([...ccEmails, newCcEmail.trim()]);
      setNewCcEmail('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const handleRemoveCcEmail = (index: number) => {
    setCcEmails(ccEmails.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !billingFirstName.trim() || !billingLastName.trim() || !billingEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid hourly rate');
      return;
    }

    const clientData = {
      name: name.trim(),
      billingFirstName: billingFirstName.trim(),
      billingLastName: billingLastName.trim(),
      billingPhone: billingPhone.trim(),
      billingEmail: billingEmail.trim(),
      ccEmails,
      addressStreet: addressStreet.trim(),
      addressLine2: '',
      addressCity: addressCity.trim(),
      addressState: addressState.trim(),
      addressZip: addressZip.trim(),
      addressCountry: addressCountry.trim(),
      hourlyRate: rate,
      color,
    };

    if (clientId) {
      updateClient(clientId, clientData);
      toast.success('Client updated successfully');
    } else {
      addClient(clientData);
      toast.success('Client added successfully');
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Company Information Card */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-slate-600" />
          Client Information
        </h3>
        
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1">
            <Label htmlFor="name" className="text-sm text-slate-600">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corporation"
              required
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1">
            <Label htmlFor="hourlyRate" className="text-sm text-slate-600">
              Hourly Rate (USD) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="150.00"
              required
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Billing Contact Card */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-slate-600" />
          Billing Contact
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
            <div className="flex-1">
              <Label htmlFor="billingFirstName" className="text-sm text-slate-600">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billingFirstName"
                value={billingFirstName}
                onChange={(e) => setBillingFirstName(e.target.value)}
                placeholder="John"
                required
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
            <div className="flex-1">
              <Label htmlFor="billingLastName" className="text-sm text-slate-600">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billingLastName"
                value={billingLastName}
                onChange={(e) => setBillingLastName(e.target.value)}
                placeholder="Doe"
                required
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1">
            <Label htmlFor="billingEmail" className="text-sm text-slate-600">
              Billing Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="billing@acmecorp.com"
              required
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Phone className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1">
            <Label htmlFor="billingPhone" className="text-sm text-slate-600">Phone Number</Label>
            <Input
              id="billingPhone"
              type="tel"
              value={billingPhone}
              onChange={(e) => setBillingPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1">
            <Label className="text-sm text-slate-600">Additional Recipients</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newCcEmail}
                onChange={(e) => setNewCcEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCcEmail();
                  }
                }}
                placeholder="support@acmecorp.com"
                type="email"
              />
              <Button
                type="button"
                onClick={handleAddCcEmail}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {ccEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCcEmail(index)}
                      className="text-slate-500 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              These addresses will be CC'ed on all invoices.
            </p>
          </div>
        </div>
      </div>

      {/* Address Card */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-slate-600" />
          Address
        </h3>
        
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-slate-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="addressStreet" className="text-sm text-slate-600">Street Address</Label>
              <Input
                id="addressStreet"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="123 Business Street"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="addressCity" className="text-sm text-slate-600">City</Label>
                <Input
                  id="addressCity"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="San Francisco"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="addressState" className="text-sm text-slate-600">State</Label>
                <select
                  id="addressState"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="addressZip" className="text-sm text-slate-600">ZIP Code</Label>
                <Input
                  id="addressZip"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="94105"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="addressCountry" className="text-sm text-slate-600">Country</Label>
                <Input
                  id="addressCountry"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  placeholder="United States"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Color Card */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-slate-600" />
          Calendar Color
        </h3>
        
        <div className="flex items-start gap-3">
          <Palette className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex gap-2 flex-wrap">
              {CLIENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#1e293b' : 'transparent',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              This color will be used to display time entries in the calendar
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 sticky bottom-0 bg-white border-t pb-2">
        <Button type="submit" className="flex-1">
          {clientId ? 'Update Client' : 'Add Client'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
};