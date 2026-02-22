import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { InvoiceList } from './invoices/InvoiceList';
import { NewInvoiceFlow } from './invoices/NewInvoiceFlow';
import { InvoiceDetail } from './invoices/InvoiceDetail';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export const InvoicesView = () => {
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-600 mt-1">Manage and track your invoices</p>
        </div>
        <Button onClick={() => setIsNewInvoiceOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InvoiceList
            filter="all"
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        </TabsContent>
        <TabsContent value="draft">
          <InvoiceList
            filter="draft"
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        </TabsContent>
        <TabsContent value="sent">
          <InvoiceList
            filter="sent"
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        </TabsContent>
        <TabsContent value="paid">
          <InvoiceList
            filter="paid"
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        </TabsContent>
        <TabsContent value="overdue">
          <InvoiceList
            filter="overdue"
            onSelectInvoice={(id) => setSelectedInvoiceId(id)}
          />
        </TabsContent>
      </Tabs>

      {/* New Invoice Dialog */}
      <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Select a client and date range to generate an invoice from your time entries
            </DialogDescription>
          </DialogHeader>
          <NewInvoiceFlow onClose={() => setIsNewInvoiceOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={selectedInvoiceId !== null}
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              View and manage invoice information
            </DialogDescription>
          </DialogHeader>
          {selectedInvoiceId && (
            <InvoiceDetail
              invoiceId={selectedInvoiceId}
              onClose={() => setSelectedInvoiceId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};