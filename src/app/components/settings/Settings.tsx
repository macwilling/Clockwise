import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Building2, Mail, Phone, Globe, Save, Palette, MessageSquare, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useData, UserSettings } from '../../contexts/DataContext';
import { MergeFieldEditor } from './MergeFieldEditor';

export const Settings = () => {
  const { settings: contextSettings, updateSettings } = useData();
  const [settings, setSettings] = useState<UserSettings>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'email' | 'pdf'>('company');
  const messageInsertFieldRef = useRef<((fieldName: string) => void) | null>(null);
  const footerInsertFieldRef = useRef<((fieldName: string) => void) | null>(null);

  const mergeFields = [
    { key: 'client_name', label: 'Client Name' },
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'invoice_total', label: 'Total' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'company_name', label: 'Company Name' },
    { key: 'company_email', label: 'Company Email' },
    { key: 'company_website', label: 'Website' },
  ];

  useEffect(() => {
    // Load settings from context
    if (contextSettings) {
      setSettings(contextSettings);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [contextSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Function to replace merge fields with dummy data
  const previewEmailMessage = (template: string) => {
    const dummyData = {
      client_name: 'John',
      invoice_number: 'INV-2024-001',
      invoice_total: '2,450.00',
      due_date: 'March 15, 2024',
      issue_date: 'February 15, 2024',
      company_name: settings.companyName || 'Your Company',
      company_email: settings.companyEmail || 'billing@company.com',
      company_website: settings.companyWebsite || 'www.company.com',
    };

    let preview = template || '';
    Object.entries(dummyData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  // Function to highlight merge fields in text
  const highlightMergeFields = (text: string) => {
    if (!text) return null;
    
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, index) => {
      if (part.match(/^{{[^}]+}}$/)) {
        return (
          <span key={index} className="bg-blue-100 text-blue-700 px-1 rounded font-semibold">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">
          Manage your company information for invoices and documents
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00a3e0]" />
                Company Information
              </h2>
              <p className="text-sm text-slate-600">
                This information will appear on your PDF invoices
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-700">
                Company Name *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) =>
                    setSettings({ ...settings, companyName: e.target.value })
                  }
                  placeholder="Acme Consulting LLC"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail" className="text-slate-700">
                Company Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="companyEmail"
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, companyEmail: e.target.value })
                  }
                  placeholder="billing@acme.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPhone" className="text-slate-700">
                Company Phone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="companyPhone"
                  type="tel"
                  value={settings.companyPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, companyPhone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite" className="text-slate-700">
                Website
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="companyWebsite"
                  type="url"
                  value={settings.companyWebsite}
                  onChange={(e) =>
                    setSettings({ ...settings, companyWebsite: e.target.value })
                  }
                  placeholder="www.acme.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyAddress" className="text-slate-700">
              Company Address
            </Label>
            <Textarea
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) =>
                setSettings({ ...settings, companyAddress: e.target.value })
              }
              placeholder="123 Business Street&#10;Suite 100&#10;New York, NY 10001"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Enter the full address as it should appear on invoices
            </p>
          </div>
        </div>
      </Card>

      {/* Email Configuration */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#00a3e0]" />
                Email Configuration
              </h2>
              <p className="text-sm text-slate-600">
                Customize how invoice emails are sent to clients
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="emailPrimaryColor" className="text-slate-700 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Email Primary Color
              </Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="emailPrimaryColor"
                  type="color"
                  value={settings.emailPrimaryColor || '#3b82f6'}
                  onChange={(e) =>
                    setSettings({ ...settings, emailPrimaryColor: e.target.value })
                  }
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.emailPrimaryColor || '#3b82f6'}
                  onChange={(e) =>
                    setSettings({ ...settings, emailPrimaryColor: e.target.value })
                  }
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-slate-500">
                This color will be used for headers and accents in email templates
              </p>
            </div>

            {/* Default Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailDefaultMessage" className="text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Default Email Message
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showEmailPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </div>
              
              <MergeFieldEditor
                value={settings.emailDefaultMessage || ''}
                onChange={(value) => setSettings({ ...settings, emailDefaultMessage: value })}
                placeholder="Hi {{client_name}},

Please find attached invoice {{invoice_number}} for services rendered.

The invoice total is ${{invoice_total}} and is due by {{due_date}}.

Thank you for your business!

Best regards,
{{company_name}}"
                rows={8}
                onEditorReady={(insertField) => {
                  messageInsertFieldRef.current = insertField;
                }}
              />
              
              <div className="text-xs text-slate-500 space-y-2">
                <p className="font-medium">Click to insert merge fields:</p>
                <div className="flex flex-wrap gap-2">
                  {mergeFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => {
                        if (messageInsertFieldRef.current) {
                          messageInsertFieldRef.current(field.key);
                        }
                      }}
                      className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors border border-slate-300"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Preview Section */}
              {showEmailPreview && (
                <div className="mt-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                    <p className="text-sm font-semibold text-blue-900">Preview with Sample Data</p>
                  </div>
                  <div className="bg-white p-4">
                    <div className="whitespace-pre-wrap text-sm text-slate-700">
                      {previewEmailMessage(settings.emailDefaultMessage || '')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Email Footer */}
            <div className="space-y-2">
              <Label htmlFor="emailFooter" className="text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Email Footer
              </Label>
              
              <MergeFieldEditor
                value={settings.emailFooter || ''}
                onChange={(value) => setSettings({ ...settings, emailFooter: value })}
                placeholder="Questions? Reply to this email or contact us at {{company_email}}

{{company_name}} | {{company_website}}"
                rows={3}
                onEditorReady={(insertField) => {
                  footerInsertFieldRef.current = insertField;
                }}
              />
              
              <div className="text-xs text-slate-500 space-y-2">
                <p className="font-medium">Click to insert merge fields:</p>
                <div className="flex flex-wrap gap-2">
                  {mergeFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => {
                        if (footerInsertFieldRef.current) {
                          footerInsertFieldRef.current(field.key);
                        }
                      }}
                      className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors border border-slate-300"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PDF Attachment Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="emailIncludePdf" className="text-slate-700 font-medium cursor-pointer">
                    Include PDF Attachment
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Attach a PDF version of the invoice to emails
                  </p>
                </div>
                <Switch
                  id="emailIncludePdf"
                  checked={settings.emailIncludePdf || false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailIncludePdf: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="emailIncludeLineItems" className="text-slate-700 font-medium cursor-pointer">
                    Show Line Items in Email
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Display detailed line items in the email body (in addition to PDF)
                  </p>
                </div>
                <Switch
                  id="emailIncludeLineItems"
                  checked={settings.emailIncludeLineItems || false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailIncludeLineItems: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* PDF Invoice Customization */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#00a3e0]" />
              PDF Invoice Customization
            </h2>
            <p className="text-sm text-slate-600">
              Customize colors, labels, and text that appear on PDF invoices
            </p>
          </div>

          {/* PDF Colors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Colors</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pdfHeaderColor" className="text-slate-700">
                  Header Color
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="pdfHeaderColor"
                    type="color"
                    value={settings.pdfHeaderColor || '#0F2847'}
                    onChange={(e) =>
                      setSettings({ ...settings, pdfHeaderColor: e.target.value })
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.pdfHeaderColor || '#0F2847'}
                    onChange={(e) =>
                      setSettings({ ...settings, pdfHeaderColor: e.target.value })
                    }
                    placeholder="#0F2847"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500">Used for main headers and dark text</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfAccentColor" className="text-slate-700">
                  Accent Color
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="pdfAccentColor"
                    type="color"
                    value={settings.pdfAccentColor || '#00a3e0'}
                    onChange={(e) =>
                      setSettings({ ...settings, pdfAccentColor: e.target.value })
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.pdfAccentColor || '#00a3e0'}
                    onChange={(e) =>
                      setSettings({ ...settings, pdfAccentColor: e.target.value })
                    }
                    placeholder="#00a3e0"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500">Used for highlights and dividers</p>
              </div>
            </div>
          </div>

          {/* PDF Labels */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Labels & Text</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pdfInvoiceTitle" className="text-slate-700">
                  Invoice Title
                </Label>
                <Input
                  id="pdfInvoiceTitle"
                  value={settings.pdfInvoiceTitle || 'INVOICE'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfInvoiceTitle: e.target.value })
                  }
                  placeholder="INVOICE"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfBillToLabel" className="text-slate-700">
                  "Bill To" Label
                </Label>
                <Input
                  id="pdfBillToLabel"
                  value={settings.pdfBillToLabel || 'BILL TO'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfBillToLabel: e.target.value })
                  }
                  placeholder="BILL TO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfDateIssuedLabel" className="text-slate-700">
                  Date Issued Label
                </Label>
                <Input
                  id="pdfDateIssuedLabel"
                  value={settings.pdfDateIssuedLabel || 'Date Issued'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfDateIssuedLabel: e.target.value })
                  }
                  placeholder="Date Issued"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfDueDateLabel" className="text-slate-700">
                  Due Date Label
                </Label>
                <Input
                  id="pdfDueDateLabel"
                  value={settings.pdfDueDateLabel || 'Due Date'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfDueDateLabel: e.target.value })
                  }
                  placeholder="Due Date"
                />
              </div>
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Table Column Headers</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pdfDateColumnLabel" className="text-slate-700 text-xs">
                  Date
                </Label>
                <Input
                  id="pdfDateColumnLabel"
                  value={settings.pdfDateColumnLabel || 'Date'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfDateColumnLabel: e.target.value })
                  }
                  placeholder="Date"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfDescriptionColumnLabel" className="text-slate-700 text-xs">
                  Description
                </Label>
                <Input
                  id="pdfDescriptionColumnLabel"
                  value={settings.pdfDescriptionColumnLabel || 'Description'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfDescriptionColumnLabel: e.target.value })
                  }
                  placeholder="Description"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfHoursColumnLabel" className="text-slate-700 text-xs">
                  Hours
                </Label>
                <Input
                  id="pdfHoursColumnLabel"
                  value={settings.pdfHoursColumnLabel || 'Hours'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfHoursColumnLabel: e.target.value })
                  }
                  placeholder="Hours"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfRateColumnLabel" className="text-slate-700 text-xs">
                  Rate
                </Label>
                <Input
                  id="pdfRateColumnLabel"
                  value={settings.pdfRateColumnLabel || 'Rate'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfRateColumnLabel: e.target.value })
                  }
                  placeholder="Rate"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfAmountColumnLabel" className="text-slate-700 text-xs">
                  Amount
                </Label>
                <Input
                  id="pdfAmountColumnLabel"
                  value={settings.pdfAmountColumnLabel || 'Amount'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfAmountColumnLabel: e.target.value })
                  }
                  placeholder="Amount"
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Totals Labels */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Totals Section</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pdfSubtotalLabel" className="text-slate-700">
                  Subtotal Label
                </Label>
                <Input
                  id="pdfSubtotalLabel"
                  value={settings.pdfSubtotalLabel || 'Subtotal'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfSubtotalLabel: e.target.value })
                  }
                  placeholder="Subtotal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfTotalLabel" className="text-slate-700">
                  Total Label
                </Label>
                <Input
                  id="pdfTotalLabel"
                  value={settings.pdfTotalLabel || 'Total'}
                  onChange={(e) =>
                    setSettings({ ...settings, pdfTotalLabel: e.target.value })
                  }
                  placeholder="Total"
                />
              </div>
            </div>
          </div>

          {/* Footer and Additional Text */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Footer & Additional Text</h3>
            
            <div className="space-y-2">
              <Label htmlFor="pdfFooterText" className="text-slate-700">
                Footer Text
              </Label>
              <Input
                id="pdfFooterText"
                value={settings.pdfFooterText || 'Thank you for your business'}
                onChange={(e) =>
                  setSettings({ ...settings, pdfFooterText: e.target.value })
                }
                placeholder="Thank you for your business"
              />
              <p className="text-xs text-slate-500">
                Text displayed at the bottom of the invoice
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pdfPaymentInstructions" className="text-slate-700">
                  Payment Instructions
                </Label>
                <Switch
                  id="pdfShowPaymentInstructions"
                  checked={settings.pdfShowPaymentInstructions || false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pdfShowPaymentInstructions: checked })
                  }
                />
              </div>
              <Textarea
                id="pdfPaymentInstructions"
                value={settings.pdfPaymentInstructions || ''}
                onChange={(e) =>
                  setSettings({ ...settings, pdfPaymentInstructions: e.target.value })
                }
                placeholder="Payment can be made via:\n• Wire transfer to Account #123456789\n• Check payable to Your Company\n• Credit card (contact for details)"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                Toggle switch above to show/hide payment instructions on invoices
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pdfTerms" className="text-slate-700">
                  Terms & Conditions
                </Label>
                <Switch
                  id="pdfShowTerms"
                  checked={settings.pdfShowTerms || false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pdfShowTerms: checked })
                  }
                />
              </div>
              <Textarea
                id="pdfTerms"
                value={settings.pdfTerms || ''}
                onChange={(e) =>
                  setSettings({ ...settings, pdfTerms: e.target.value })
                }
                placeholder="Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly finance charge. Services may be suspended for overdue accounts."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                Toggle switch above to show/hide terms and conditions on invoices
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <Card className="p-6 bg-slate-50">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Invoice Preview</h3>
        <p className="text-sm text-slate-600 mb-4">
          Your company information will be displayed on PDF invoices like this:
        </p>
        <div className="bg-white p-6 rounded-lg border-2 border-slate-200">
          <div className="bg-[#0F2847] text-white p-4 rounded-t-lg -mx-6 -mt-6 mb-4">
            <h4 className="text-xl font-bold">{settings.companyName || 'Your Company Name'}</h4>
            <div className="text-sm mt-2 space-y-1 text-slate-200">
              {settings.companyAddress ? (
                <p className="whitespace-pre-line">{settings.companyAddress}</p>
              ) : (
                <p className="text-slate-400 italic">Company address will appear here</p>
              )}
              {settings.companyPhone && <p>{settings.companyPhone}</p>}
              {settings.companyEmail && <p>{settings.companyEmail}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#0F2847]">INVOICE</p>
            <p className="text-sm text-[#d4a574] font-mono">INV-001</p>
          </div>
        </div>
      </Card>
    </div>
  );
};