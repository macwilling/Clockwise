import { useState, useEffect, useRef } from "react";
import {
  Building2,
  User,
  Mail,
  Phone,
  DollarSign,
  MapPin,
  Edit2,
  XCircle,
  Check,
  Calendar,
  Clock,
  FileText,
  Plus,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useData } from "../../contexts/DataContext";
import { AddTimeEntryForm } from "./AddTimeEntryForm";
import { CreateInvoiceForm } from "./CreateInvoiceForm";
import type { Client } from "../../contexts/DataContext";

interface ClientDetailViewProps {
  clientId: string;
}

type TabType = "overview" | "timeLogs" | "invoices";
type EditMode = "none" | "company" | "billing" | "address" | "all"; // Card-level editing

export const ClientDetailView = ({
  clientId,
}: ClientDetailViewProps) => {
  const {
    clients,
    timeEntries,
    invoices,
    updateClient,
    addTimeEntry,
    addInvoice,
  } = useData();
  const client = clients.find((c) => c.id === clientId);

  const [activeTab, setActiveTab] =
    useState<TabType>("overview");
  const [editMode, setEditMode] = useState<EditMode>("none");
  const [editedClient, setEditedClient] =
    useState<Client | null>(client || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingTimeEntry, setIsAddingTimeEntry] =
    useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] =
    useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update editedClient when the actual client changes but we're not currently editing
  useEffect(() => {
    if (client && editMode === "none") {
      setEditedClient(client);
    }
  }, [client, editMode]);

  // If client not found, return null
  if (!client) {
    return null;
  }

  // Filter data for this client
  const clientTimeEntries = timeEntries.filter(
    (entry) => entry.clientId === client.id,
  );
  const clientInvoices = invoices.filter(
    (invoice) => invoice.clientId === client.id,
  );

  // Calculate totals
  const totalHours = clientTimeEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0,
  );
  const totalBilled = clientInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = clientInvoices
    .filter(
      (inv) => inv.status !== "paid" && inv.status !== "draft",
    )
    .reduce((sum, inv) => sum + inv.total, 0);

  const fullAddress = [
    client.addressStreet,
    client.addressCity,
    client.addressState,
    client.addressZip,
  ]
    .filter(Boolean)
    .join(", ");

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-50";
      case "sent":
        return "text-blue-600 bg-blue-50";
      case "overdue":
        return "text-red-600 bg-red-50";
      case "draft":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleCardEdit = (
    cardName: "company" | "billing" | "address",
  ) => {
    setEditMode(cardName);
    setEditedClient({
      ...client,
      addressLine2: client.addressLine2 || "",
    });
  };

  const handleCancelEdit = () => {
    setEditMode("none");
    setEditedClient(client);
  };

  const handleSaveCard = async (
    cardName: "company" | "billing" | "address",
  ) => {
    setIsSaving(true);
    try {
      let updates: Partial<Client> = {};

      if (cardName === "company") {
        updates = {
          name: editedClient!.name,
          hourlyRate: editedClient!.hourlyRate,
        };
      } else if (cardName === "billing") {
        updates = {
          billingFirstName: editedClient!.billingFirstName,
          billingLastName: editedClient!.billingLastName,
          billingEmail: editedClient!.billingEmail,
          billingPhone: editedClient!.billingPhone,
          ccEmails: editedClient!.ccEmails,
        };
      } else if (cardName === "address") {
        updates = {
          addressStreet: editedClient!.addressStreet,
          addressLine2: editedClient!.addressLine2,
          addressCity: editedClient!.addressCity,
          addressState: editedClient!.addressState,
          addressZip: editedClient!.addressZip,
          addressCountry: editedClient!.addressCountry,
        };
      }

      await updateClient(client.id, updates);
      Object.assign(client, updates);
      setEditMode("none");
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<Client> = {
        name: editedClient!.name,
        hourlyRate: editedClient!.hourlyRate,
        billingFirstName: editedClient!.billingFirstName,
        billingLastName: editedClient!.billingLastName,
        billingEmail: editedClient!.billingEmail,
        billingPhone: editedClient!.billingPhone,
        ccEmails: editedClient!.ccEmails,
        addressStreet: editedClient!.addressStreet,
        addressLine2: editedClient!.addressLine2,
        addressCity: editedClient!.addressCity,
        addressState: editedClient!.addressState,
        addressZip: editedClient!.addressZip,
        addressCountry: editedClient!.addressCountry,
      };
      await updateClient(client.id, updates);
      Object.assign(client, updates);
      setEditMode("none");
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isEditingCard = (
    cardName: "company" | "billing" | "address",
  ) => editMode === cardName;
  const isInEditMode = editMode !== "none";

  // Render company info card
  const renderCompanyCard = () => {
    const isEditing = isEditingCard("company");

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            Client Information
          </h3>
        </div>
        <div
          className={`bg-slate-50 rounded-lg p-6 space-y-4 transition-all ${
            !isInEditMode && !isEditing
              ? "cursor-pointer hover:bg-slate-100"
              : ""
          }`}
          onClick={() =>
            !isInEditMode &&
            !isEditing &&
            handleCardEdit("company")
          }
        >
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-sm text-slate-600 block mb-1">
                Company Name
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editedClient!.name}
                  onChange={(e) =>
                    setEditedClient({
                      ...editedClient!,
                      name: e.target.value,
                    })
                  }
                  placeholder="Company Name"
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-base text-slate-900 font-medium">
                  {client.name || "—"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-sm text-slate-600 block mb-1">
                Hourly Rate
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedClient!.hourlyRate}
                  onChange={(e) =>
                    setEditedClient({
                      ...editedClient!,
                      hourlyRate:
                        parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="150.00"
                  step="0.01"
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-base text-slate-900 font-medium">
                  ${Number(client.hourlyRate).toFixed(2)}/hr
                </p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveCard("company");
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render billing card
  const renderBillingCard = () => {
    const isEditing = isEditingCard("billing");

    const handleAddEmail = (email: string) => {
      const trimmedEmail = email.trim();
      if (trimmedEmail && trimmedEmail.includes("@")) {
        const currentEmails = editedClient!.ccEmails || [];
        if (!currentEmails.includes(trimmedEmail)) {
          setEditedClient({
            ...editedClient!,
            ccEmails: [...currentEmails, trimmedEmail],
          });
        }
        setEmailInput("");
      }
    };

    const handleRemoveEmail = (emailToRemove: string) => {
      setEditedClient({
        ...editedClient!,
        ccEmails: (editedClient!.ccEmails || []).filter(
          (email) => email !== emailToRemove,
        ),
      });
    };

    const handleEmailKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddEmail(emailInput);
      } else if (e.key === "," && emailInput.trim()) {
        e.preventDefault();
        handleAddEmail(emailInput);
      }
    };

    const handleEmailBlur = () => {
      if (emailInput.trim()) {
        handleAddEmail(emailInput);
      }
    };

    return (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-600" />
          Billing Contact
        </h3>
        <div
          className={`bg-slate-50 rounded-lg p-6 space-y-4 transition-all ${
            !isInEditMode && !isEditing
              ? "cursor-pointer hover:bg-slate-100"
              : ""
          }`}
          onClick={() =>
            !isInEditMode &&
            !isEditing &&
            handleCardEdit("billing")
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-sm text-slate-600 block mb-1">
                  First Name
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    value={editedClient!.billingFirstName}
                    onChange={(e) =>
                      setEditedClient({
                        ...editedClient!,
                        billingFirstName: e.target.value,
                      })
                    }
                    placeholder="John"
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-base text-slate-900 font-medium">
                    {client.billingFirstName || "—"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-sm text-slate-600 block mb-1">
                  Last Name
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    value={editedClient!.billingLastName}
                    onChange={(e) =>
                      setEditedClient({
                        ...editedClient!,
                        billingLastName: e.target.value,
                      })
                    }
                    placeholder="Doe"
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-base text-slate-900 font-medium">
                    {client.billingLastName || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-sm text-slate-600 block mb-1">
                Email
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editedClient!.billingEmail}
                  onChange={(e) =>
                    setEditedClient({
                      ...editedClient!,
                      billingEmail: e.target.value,
                    })
                  }
                  placeholder="john@example.com"
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-base text-slate-900 font-medium">
                  {client.billingEmail || "—"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-sm text-slate-600 block mb-1">
                Phone
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={editedClient!.billingPhone || ""}
                  onChange={(e) =>
                    setEditedClient({
                      ...editedClient!,
                      billingPhone: e.target.value,
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-base text-slate-900 font-medium">
                  {client.billingPhone || "—"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-sm text-slate-600 block mb-1">Additional Recipients</label>
              {isEditing ? (
                <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                  {/* Input for adding new emails */}
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleEmailKeyDown}
                      placeholder="support@acmecorp.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => handleAddEmail(emailInput)}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Display current CC emails as removable tags */}
                  {editedClient!.ccEmails && editedClient!.ccEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editedClient!.ccEmails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm"
                        >
                          <span>{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="text-slate-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    These addresses will be CC'ed on all invoices.
                  </p>
                </div>
              ) : (
                client.ccEmails && client.ccEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {client.ccEmails.map((email, index) => (
                      <span key={index} className="text-sm bg-slate-200 px-2 py-1 rounded">
                        {email}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-slate-900 font-medium">—</p>
                )
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveCard("billing");
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render address card
  const renderAddressCard = () => {
    const isEditing = isEditingCard("address");
    const hasAddress =
      client.addressStreet ||
      client.addressLine2 ||
      client.addressCity ||
      client.addressState ||
      client.addressZip ||
      client.addressCountry;

    return (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-600" />
          Address
        </h3>
        <div
          className={`bg-slate-50 rounded-lg p-6 space-y-4 transition-all ${
            !isInEditMode && !isEditing
              ? "cursor-pointer hover:bg-slate-100"
              : ""
          }`}
          onClick={() =>
            !isInEditMode &&
            !isEditing &&
            handleCardEdit("address")
          }
        >
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-sm text-slate-600 block mb-1">
                Address
              </label>
              {isEditing ? (
                <div
                  className="space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    type="text"
                    value={editedClient!.addressStreet || ""}
                    onChange={(e) =>
                      setEditedClient({
                        ...editedClient!,
                        addressStreet: e.target.value,
                      })
                    }
                    placeholder="Address Line 1"
                    className="w-full"
                  />
                  <Input
                    type="text"
                    value={editedClient!.addressLine2 || ""}
                    onChange={(e) =>
                      setEditedClient({
                        ...editedClient!,
                        addressLine2: e.target.value,
                      })
                    }
                    placeholder="Address Line 2 (optional)"
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      value={editedClient!.addressCity || ""}
                      onChange={(e) =>
                        setEditedClient({
                          ...editedClient!,
                          addressCity: e.target.value,
                        })
                      }
                      placeholder="City"
                    />
                    <Input
                      type="text"
                      value={editedClient!.addressState || ""}
                      onChange={(e) =>
                        setEditedClient({
                          ...editedClient!,
                          addressState: e.target.value,
                        })
                      }
                      placeholder="State"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      value={editedClient!.addressZip || ""}
                      onChange={(e) =>
                        setEditedClient({
                          ...editedClient!,
                          addressZip: e.target.value,
                        })
                      }
                      placeholder="ZIP Code"
                    />
                    <Input
                      type="text"
                      value={editedClient!.addressCountry || ""}
                      onChange={(e) =>
                        setEditedClient({
                          ...editedClient!,
                          addressCountry: e.target.value,
                        })
                      }
                      placeholder="Country"
                    />
                  </div>
                </div>
              ) : hasAddress ? (
                <div className="text-base text-slate-900 font-medium space-y-1">
                  {client.addressStreet && (
                    <div>{client.addressStreet}</div>
                  )}
                  {client.addressLine2 && (
                    <div>{client.addressLine2}</div>
                  )}
                  <div>
                    {[client.addressCity, client.addressState]
                      .filter(Boolean)
                      .join(", ")}
                    {client.addressZip &&
                      ` ${client.addressZip}`}
                  </div>
                  {client.addressCountry && (
                    <div>{client.addressCountry}</div>
                  )}
                </div>
              ) : (
                <p className="text-base text-slate-900 font-medium">
                  —
                </p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveCard("address");
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: client.color }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {client.name}
            </h1>
            <p className="text-slate-600 mt-1">
              {client.billingFirstName} {client.billingLastName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-6 p-8 bg-slate-50 border-b">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">
              Total Hours
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {totalHours.toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">
              Total Billed
            </span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            ${totalBilled.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">
              Outstanding
            </span>
          </div>
          <p className="text-3xl font-bold text-amber-600">
            ${totalOutstanding.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white px-8">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-6 py-4 font-medium transition-colors border-b-2 ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("timeLogs")}
          className={`px-6 py-4 font-medium transition-colors border-b-2 ${
            activeTab === "timeLogs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Time Logs ({clientTimeEntries.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-6 py-4 font-medium transition-colors border-b-2 ${
            activeTab === "invoices"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Invoices ({clientInvoices.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Edit All Controls when in edit mode */}
            {editMode === "all" && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">
                  Editing all fields - make your changes and
                  save when ready
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save All Changes
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Client Information */}
            {renderCompanyCard()}

            {/* Contact Information */}
            {renderBillingCard()}

            {/* Address Information */}
            {renderAddressCard()}

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {clientTimeEntries.length === 0 &&
                clientInvoices.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">
                    No activity yet
                  </p>
                ) : (
                  <>
                    {clientTimeEntries
                      .slice(0, 5)
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {entry.project}
                              </p>
                              <p className="text-sm text-slate-600">
                                {entry.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">
                              {format(
                                parseISO(entry.date),
                                "MMM d, yyyy",
                              )}
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {entry.hours.toFixed(1)} hrs
                            </p>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeLogs" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Time Entries
              </h3>
              <Button
                onClick={() => setIsAddingTimeEntry(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time Entry
              </Button>
            </div>
            {clientTimeEntries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">
                  No time entries logged yet
                </p>
                <Button
                  onClick={() => setIsAddingTimeEntry(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Time Entry
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">
                      Hours
                    </TableHead>
                    <TableHead className="text-right">
                      Value
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientTimeEntries
                    .sort((a, b) =>
                      b.date.localeCompare(a.date),
                    )
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {format(
                              parseISO(entry.date),
                              "MMM d, yyyy",
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.project}
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 font-mono">
                          {formatTime(entry.startTime)} -{" "}
                          {formatTime(entry.endTime)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {entry.hours.toFixed(1)} hrs
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          $
                          {(
                            entry.hours * client.hourlyRate
                          ).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Invoices
              </h3>
              <Button
                onClick={() => setIsCreatingInvoice(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
            {clientInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">
                  No invoices created yet
                </p>
                <Button
                  onClick={() => setIsCreatingInvoice(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Invoice
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInvoices
                    .sort((a, b) =>
                      b.dateIssued.localeCompare(a.dateIssued),
                    )
                    .map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-semibold">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {format(
                            parseISO(invoice.dateIssued),
                            "MMM d, yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            parseISO(invoice.dueDate),
                            "MMM d, yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              invoice.status,
                            )}`}
                          >
                            {invoice.status
                              .charAt(0)
                              .toUpperCase() +
                              invoice.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg font-mono">
                          ${invoice.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {/* Add Time Entry Dialog */}
      <Dialog
        open={isAddingTimeEntry}
        onOpenChange={setIsAddingTimeEntry}
      >
        <DialogContent className="max-w-2xl">
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Log time worked for {client.name}
          </DialogDescription>
          <AddTimeEntryForm
            clientId={client.id}
            clientName={client.name}
            onClose={() => setIsAddingTimeEntry(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog
        open={isCreatingInvoice}
        onOpenChange={setIsCreatingInvoice}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for {client.name}
          </DialogDescription>
          <CreateInvoiceForm
            clientId={client.id}
            clientName={client.name}
            hourlyRate={client.hourlyRate}
            onClose={() => setIsCreatingInvoice(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};