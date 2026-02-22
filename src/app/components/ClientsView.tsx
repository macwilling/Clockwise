import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ClientList } from './clients/ClientList';
import { ClientForm } from './clients/ClientForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';

export const ClientsView = () => {
  const { clients } = useData();
  const navigate = useNavigate();
  const [isAddingClient, setIsAddingClient] = useState(false);

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-600 mt-1">
            Manage your clients and their hourly rates
          </p>
        </div>
        <Button onClick={() => setIsAddingClient(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card className="p-6">
        <ClientList 
          clients={clients} 
          onViewClient={handleViewClient}
        />
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
        <DialogContent>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Add a new client to your roster
          </DialogDescription>
          <ClientForm clientId={null} onClose={() => setIsAddingClient(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};