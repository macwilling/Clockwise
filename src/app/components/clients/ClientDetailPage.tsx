import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { ClientDetailView } from './ClientDetailView';

export const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  if (!clientId) {
    navigate('/clients');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/clients')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>

      {/* Client Detail Content */}
      <ClientDetailView clientId={clientId} />
    </div>
  );
};
