import { Client } from '../../contexts/DataContext';
import { Mail, MapPin, Phone, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface ClientListProps {
  clients: Client[];
  onViewClient: (clientId: string) => void;
}

export const ClientList = ({ clients, onViewClient }: ClientListProps) => {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600">No clients yet. Add your first client to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Hourly Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const fullAddress = [
            client.addressCity,
            client.addressState,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <TableRow 
              key={client.id}
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => onViewClient(client.id)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: client.color }}
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                      {client.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {client.billingFirstName} {client.billingLastName}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-slate-900">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {client.billingEmail}
                  </div>
                  {client.billingPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {client.billingPhone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {fullAddress ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {fullAddress}
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono font-semibold text-lg text-slate-900">
                  ${client.hourlyRate.toFixed(2)}
                </span>
                <span className="text-slate-500 text-sm">/hr</span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};