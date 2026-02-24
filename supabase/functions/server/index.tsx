import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Supabase configuration from environment (see .env.example)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('CRITICAL: Missing required Supabase configuration (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
}

// Initialize Supabase client with service role key for database access
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Create a separate client with ANON_KEY for JWT validation
const supabaseAuth = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-07ab6163/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug endpoints: only report presence of env vars (no key prefixes). Disable in production if desired.
const DEBUG_ENABLED = Deno.env.get('DEBUG_ENDPOINTS') === 'true';
app.get("/make-server-07ab6163/debug/env", (c) => {
  if (!DEBUG_ENABLED) return c.json({ error: "Disabled" }, 404);
  return c.json({
    hasSupabaseUrl: !!SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
  });
});
app.get("/make-server-07ab6163/debug/auth", async (c) => {
  if (!DEBUG_ENABLED) return c.json({ error: "Disabled" }, 404);
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: "No Authorization header" }, 401);
  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: anonData, error: anonError } = await supabaseAuth.auth.getUser(token);
    return c.json({
      success: !!anonData.user,
      hasUser: !!anonData.user,
      error: anonError?.message,
    });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Get Google Maps API key
app.get("/make-server-07ab6163/config/google-maps-key", (c) => {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') ?? '';
  return c.json({ apiKey });
});

// ============ AUTH ============

// Sign up endpoint
app.post("/make-server-07ab6163/auth/signup", async (c) => {
  try {
    const { email, password, name, companyName } = await c.req.json();

    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, companyName },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.error("Error creating user during signup:", error);
      return c.json({ error: error.message }, 400);
    }

    // Create default settings for the user
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert([{
        user_id: data.user.id,
        company_name: companyName,
        company_address: '',
        company_phone: '',
        company_email: email,
        company_website: '',
      }]);

    if (settingsError) {
      console.error("Error creating user settings:", settingsError);
      // Don't fail signup if settings creation fails
    }

    return c.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
        companyName,
      },
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

// Helper function to get authenticated user from request
async function getAuthenticatedUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Invalid JWT' };
  }
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { user: null, error: 'Invalid JWT' };
  }

  try {
    // Use ANON client to validate the JWT — user JWTs must be validated with
    // the ANON key, not SERVICE_ROLE.
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error) {
      console.error('Error validating JWT:', error.message);
      return { user: null, error: error.message || 'Invalid JWT' };
    }

    if (!user) {
      console.error('No user found for JWT');
      return { user: null, error: 'Invalid JWT' };
    }

    return { user, error: null };
  } catch (error) {
    console.error('Exception validating JWT:', error instanceof Error ? error.message : String(error));
    return { user: null, error: error instanceof Error ? error.message : 'Invalid JWT' };
  }
}

// ============ CLIENTS ============

// Get all clients
app.get("/make-server-07ab6163/clients", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const { data, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      return c.json({ error: clientsError.message }, 500);
    }

    // Transform to camelCase
    const clients = (data || []).map(client => ({
      id: client.id,
      name: client.name,
      billingFirstName: client.billing_first_name,
      billingLastName: client.billing_last_name,
      billingPhone: client.billing_phone,
      billingEmail: client.billing_email,
      ccEmails: client.cc_emails || [],
      addressStreet: client.address_street,
      addressLine2: client.address_line_2,
      addressCity: client.address_city,
      addressState: client.address_state,
      addressZip: client.address_zip,
      addressCountry: client.address_country,
      hourlyRate: client.hourly_rate,
      color: client.color,
    }));

    return c.json({ clients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

// Add a client
app.post("/make-server-07ab6163/clients", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const clientData = await c.req.json();
    
    const { data, error: insertError } = await supabase
      .from('clients')
      .insert([{
        user_id: user.id,
        name: clientData.name,
        billing_first_name: clientData.billingFirstName,
        billing_last_name: clientData.billingLastName,
        billing_phone: clientData.billingPhone,
        billing_email: clientData.billingEmail,
        cc_emails: clientData.ccEmails || [],
        address_street: clientData.addressStreet,
        address_line_2: clientData.addressLine2,
        address_city: clientData.addressCity,
        address_state: clientData.addressState,
        address_zip: clientData.addressZip,
        address_country: clientData.addressCountry || 'United States',
        hourly_rate: clientData.hourlyRate,
        color: clientData.color,
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Error adding client:", insertError);
      return c.json({ error: insertError.message }, 500);
    }

    // Transform back to camelCase for frontend
    const client = {
      id: data.id,
      name: data.name,
      billingFirstName: data.billing_first_name,
      billingLastName: data.billing_last_name,
      billingPhone: data.billing_phone,
      billingEmail: data.billing_email,
      ccEmails: data.cc_emails || [],
      addressStreet: data.address_street,
      addressLine2: data.address_line_2,
      addressCity: data.address_city,
      addressState: data.address_state,
      addressZip: data.address_zip,
      addressCountry: data.address_country,
      hourlyRate: data.hourly_rate,
      color: data.color,
    };

    return c.json({ success: true, client });
  } catch (error) {
    console.error("Error adding client:", error);
    return c.json({ error: "Failed to add client" }, 500);
  }
});

// Update a client
app.put("/make-server-07ab6163/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Get raw text first to debug
    const text = await c.req.text();
    console.log('Received PUT request body:', text);
    
    if (!text || text.trim() === '') {
      console.error('Empty request body received');
      return c.json({ error: 'Empty request body' }, 400);
    }
    
    let updates;
    try {
      updates = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.billingFirstName !== undefined) updateData.billing_first_name = updates.billingFirstName;
    if (updates.billingLastName !== undefined) updateData.billing_last_name = updates.billingLastName;
    if (updates.billingPhone !== undefined) updateData.billing_phone = updates.billingPhone;
    if (updates.billingEmail !== undefined) updateData.billing_email = updates.billingEmail;
    if (updates.ccEmails !== undefined) updateData.cc_emails = updates.ccEmails;
    if (updates.addressStreet !== undefined) updateData.address_street = updates.addressStreet;
    if (updates.addressLine2 !== undefined) updateData.address_line_2 = updates.addressLine2;
    if (updates.addressCity !== undefined) updateData.address_city = updates.addressCity;
    if (updates.addressState !== undefined) updateData.address_state = updates.addressState;
    if (updates.addressZip !== undefined) updateData.address_zip = updates.addressZip;
    if (updates.addressCountry !== undefined) updateData.address_country = updates.addressCountry;
    if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
    if (updates.color !== undefined) updateData.color = updates.color;
    
    console.log('Update data to send to DB:', updateData);

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating client:", error);
      return c.json({ error: error.message }, 500);
    }

    const client = {
      id: data.id,
      name: data.name,
      billingFirstName: data.billing_first_name,
      billingLastName: data.billing_last_name,
      billingPhone: data.billing_phone,
      billingEmail: data.billing_email,
      ccEmails: data.cc_emails || [],
      addressStreet: data.address_street,
      addressLine2: data.address_line_2,
      addressCity: data.address_city,
      addressState: data.address_state,
      addressZip: data.address_zip,
      addressCountry: data.address_country,
      hourlyRate: data.hourly_rate,
      color: data.color,
    };

    return c.json({ success: true, client });
  } catch (error) {
    console.error("Error updating client:", error);
    return c.json({ error: "Failed to update client" }, 500);
  }
});

// Delete a client
app.delete("/make-server-07ab6163/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting client:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return c.json({ error: "Failed to delete client" }, 500);
  }
});

// ============ TIME ENTRIES ============

// Get all time entries
app.get("/make-server-07ab6163/time-entries", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    // Optional query params for filtering
    const invoicedParam = c.req.query('invoiced'); // 'true', 'false', or undefined (all)
    const clientIdParam = c.req.query('clientId');

    let query = supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id);
    
    // Filter by invoiced status if specified
    if (invoicedParam === 'true') {
      query = query.not('invoice_id', 'is', null);
    } else if (invoicedParam === 'false') {
      query = query.is('invoice_id', null);
    }
    
    // Filter by client if specified
    if (clientIdParam) {
      query = query.eq('client_id', clientIdParam);
    }

    const { data, error: entriesError } = await query.order('date', { ascending: false });

    if (entriesError) {
      console.error("Error fetching time entries:", entriesError);
      return c.json({ error: entriesError.message }, 500);
    }

    // Transform to camelCase
    const entries = (data || []).map(entry => ({
      id: entry.id,
      clientId: entry.client_id,
      date: entry.date,
      startTime: entry.start_time,
      endTime: entry.end_time,
      hours: parseFloat(entry.hours),
      project: entry.project,
      description: entry.description,
      invoiceId: entry.invoice_id || null,
    }));

    return c.json({ entries });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return c.json({ error: "Failed to fetch time entries" }, 500);
  }
});

// Add a time entry
app.post("/make-server-07ab6163/time-entries", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const entryData = await c.req.json();
    
    const { data, error: insertError } = await supabase
      .from('time_entries')
      .insert([{
        user_id: user.id,
        client_id: entryData.clientId,
        date: entryData.date,
        start_time: entryData.startTime,
        end_time: entryData.endTime,
        hours: entryData.hours,
        project: entryData.project,
        description: entryData.description,
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Error adding time entry:", insertError);
      return c.json({ error: insertError.message }, 500);
    }

    const entry = {
      id: data.id,
      clientId: data.client_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      hours: parseFloat(data.hours),
      project: data.project,
      description: data.description,
    };

    return c.json({ success: true, entry });
  } catch (error) {
    console.error("Error adding time entry:", error);
    return c.json({ error: "Failed to add time entry" }, 500);
  }
});

// Update a time entry
app.put("/make-server-07ab6163/time-entries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const updateData: any = {};
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.hours !== undefined) updateData.hours = updates.hours;
    if (updates.project !== undefined) updateData.project = updates.project;
    if (updates.description !== undefined) updateData.description = updates.description;

    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating time entry:", error);
      return c.json({ error: error.message }, 500);
    }

    const entry = {
      id: data.id,
      clientId: data.client_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      hours: parseFloat(data.hours),
      project: data.project,
      description: data.description,
    };

    return c.json({ success: true, entry });
  } catch (error) {
    console.error("Error updating time entry:", error);
    return c.json({ error: "Failed to update time entry" }, 500);
  }
});

// Delete a time entry
app.delete("/make-server-07ab6163/time-entries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting time entry:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return c.json({ error: "Failed to delete time entry" }, 500);
  }
});

// ============ INVOICES ============

// Get all invoices
app.get("/make-server-07ab6163/invoices", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('date_issued', { ascending: false });

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return c.json({ error: invoicesError.message }, 500);
    }

    // Fetch line items for all invoices
    const invoices = await Promise.all((invoicesData || []).map(async (invoice) => {
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (lineItemsError) {
        console.error("Error fetching line items:", lineItemsError);
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        dateIssued: invoice.date_issued,
        dueDate: invoice.due_date,
        status: invoice.status,
        total: parseFloat(invoice.total),
        lineItems: (lineItems || []).map(item => ({
          id: item.id,
          date: item.date,
          description: item.description,
          hours: parseFloat(item.hours),
          rate: parseFloat(item.rate),
          subtotal: parseFloat(item.subtotal),
          timeEntryId: item.time_entry_id,
        })),
      };
    }));

    return c.json({ invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return c.json({ error: "Failed to fetch invoices" }, 500);
  }
});

// Add an invoice
app.post("/make-server-07ab6163/invoices", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const invoiceData = await c.req.json();
    
    const { data, error: insertError } = await supabase
      .from('invoices')
      .insert([{
        user_id: user.id,
        invoice_number: invoiceData.invoiceNumber,
        client_id: invoiceData.clientId,
        date_issued: invoiceData.dateIssued,
        due_date: invoiceData.dueDate,
        status: invoiceData.status,
        total: invoiceData.total,
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Error adding invoice:", insertError);
      return c.json({ error: insertError.message }, 500);
    }

    // Add line items
    if (invoiceData.lineItems && invoiceData.lineItems.length > 0) {
      const lineItemsToInsert = invoiceData.lineItems.map((item: any) => ({
        invoice_id: data.id,
        time_entry_id: item.timeEntryId || null,
        date: item.date,
        description: item.description,
        hours: item.hours,
        rate: item.rate,
        subtotal: item.subtotal,
      }));

      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert)
        .select();

      if (lineItemsError) {
        console.error("Error adding line items:", lineItemsError);
        // Rollback invoice if line items fail
        await supabase.from('invoices').delete().eq('id', data.id);
        return c.json({ error: lineItemsError.message }, 500);
      }

      // Update time entries to mark them as invoiced
      const timeEntryIds = invoiceData.lineItems
        .map((item: any) => item.timeEntryId)
        .filter((id: any) => id); // Only process items with time entry IDs

      if (timeEntryIds.length > 0) {
        const { error: updateError } = await supabase
          .from('time_entries')
          .update({ invoice_id: data.id })
          .in('id', timeEntryIds);

        if (updateError) {
          console.error("Error updating time entries with invoice_id:", updateError);
          // Don't fail the invoice creation, just log the error
        }
      }

      const invoice = {
        id: data.id,
        invoiceNumber: data.invoice_number,
        clientId: data.client_id,
        dateIssued: data.date_issued,
        dueDate: data.due_date,
        status: data.status,
        total: parseFloat(data.total),
        lineItems: lineItemsData.map(item => ({
          id: item.id,
          date: item.date,
          description: item.description,
          hours: parseFloat(item.hours),
          rate: parseFloat(item.rate),
          subtotal: parseFloat(item.subtotal),
          timeEntryId: item.time_entry_id,
        })),
      };

      return c.json({ success: true, invoice });
    }

    const invoice = {
      id: data.id,
      invoiceNumber: data.invoice_number,
      clientId: data.client_id,
      dateIssued: data.date_issued,
      dueDate: data.due_date,
      status: data.status,
      total: parseFloat(data.total),
      lineItems: [],
    };

    return c.json({ success: true, invoice });
  } catch (error) {
    console.error("Error adding invoice:", error);
    return c.json({ error: "Failed to add invoice" }, 500);
  }
});

// Update an invoice
app.put("/make-server-07ab6163/invoices/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const updateData: any = {};
    if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.dateIssued !== undefined) updateData.date_issued = updates.dateIssued;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.total !== undefined) updateData.total = updates.total;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating invoice:", error);
      return c.json({ error: error.message }, 500);
    }

    // Update line items if provided
    if (updates.lineItems) {
      // Delete existing line items
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id);

      // Insert new line items
      if (updates.lineItems.length > 0) {
        const lineItemsToInsert = updates.lineItems.map((item: any) => ({
          invoice_id: id,
          time_entry_id: item.timeEntryId || null,
          date: item.date,
          description: item.description,
          hours: item.hours,
          rate: item.rate,
          subtotal: item.subtotal,
        }));

        await supabase
          .from('invoice_line_items')
          .insert(lineItemsToInsert);
      }
    }

    // Fetch updated line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id);

    const invoice = {
      id: data.id,
      invoiceNumber: data.invoice_number,
      clientId: data.client_id,
      dateIssued: data.date_issued,
      dueDate: data.due_date,
      status: data.status,
      total: parseFloat(data.total),
      lineItems: (lineItems || []).map(item => ({
        id: item.id,
        date: item.date,
        description: item.description,
        hours: parseFloat(item.hours),
        rate: parseFloat(item.rate),
        subtotal: parseFloat(item.subtotal),
        timeEntryId: item.time_entry_id,
      })),
    };

    return c.json({ success: true, invoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return c.json({ error: "Failed to update invoice" }, 500);
  }
});

// Delete an invoice
app.delete("/make-server-07ab6163/invoices/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Clear invoice_id from time entries to un-invoice them
    const { error: clearError } = await supabase
      .from('time_entries')
      .update({ invoice_id: null })
      .eq('invoice_id', id);

    if (clearError) {
      console.error("Error clearing invoice_id from time entries:", clearError);
      // Don't fail deletion, just log
    }

    // Delete line items first (cascade should handle this, but being explicit)
    await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id);

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting invoice:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return c.json({ error: "Failed to delete invoice" }, 500);
  }
});

// ============ INVOICE EMAILS ============

// Get an invoice by ID (public, no auth required)
app.get("/make-server-07ab6163/invoices/:id/public", async (c) => {
  try {
    const id = c.req.param("id");

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) {
      console.error("Error fetching invoice:", invoiceError);
      return c.json({ error: invoiceError.message }, 404);
    }

    // Fetch line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id);

    if (lineItemsError) {
      console.error("Error fetching line items:", lineItemsError);
    }

    // Fetch client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoiceData.client_id)
      .single();

    if (clientError) {
      console.error("Error fetching client:", clientError);
    }

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    const invoice = {
      id: invoiceData.id,
      invoiceNumber: invoiceData.invoice_number,
      clientId: invoiceData.client_id,
      dateIssued: invoiceData.date_issued,
      dueDate: invoiceData.due_date,
      status: invoiceData.status,
      total: parseFloat(invoiceData.total),
      lineItems: (lineItems || []).map(item => ({
        id: item.id,
        date: item.date,
        description: item.description,
        hours: parseFloat(item.hours),
        rate: parseFloat(item.rate),
        subtotal: parseFloat(item.subtotal),
        timeEntryId: item.time_entry_id,
      })),
    };

    const client = clientData ? {
      id: clientData.id,
      name: clientData.name,
      billingFirstName: clientData.billing_first_name,
      billingLastName: clientData.billing_last_name,
      billingEmail: clientData.billing_email,
      addressStreet: clientData.address_street,
      addressLine2: clientData.address_line_2,
      addressCity: clientData.address_city,
      addressState: clientData.address_state,
      addressZip: clientData.address_zip,
      addressCountry: clientData.address_country,
    } : null;

    const settings = settingsData ? {
      companyName: settingsData.company_name,
      companyAddress: settingsData.company_address,
      companyPhone: settingsData.company_phone,
      companyEmail: settingsData.company_email,
      companyWebsite: settingsData.company_website,
    } : null;

    return c.json({ invoice, client, settings });
  } catch (error) {
    console.error("Error fetching public invoice:", error);
    return c.json({ error: "Failed to fetch invoice" }, 500);
  }
});

// Send invoice via email
app.post("/make-server-07ab6163/invoices/:id/send", async (c) => {
  try {
    const id = c.req.param("id");
    const { message } = await c.req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return c.json({ error: 'Email service not configured' }, 500);
    }

    // Fetch invoice, client, and settings
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) {
      console.error("Error fetching invoice:", invoiceError);
      return c.json({ error: invoiceError.message }, 404);
    }

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id);

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoiceData.client_id)
      .single();

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    if (!clientData || !settingsData) {
      return c.json({ error: 'Missing client or settings data' }, 400);
    }

    // Generate PDF using jsPDF
    const { jsPDF } = await import('npm:jspdf@2.5.2');
    const { default: autoTable } = await import('npm:jspdf-autotable@3.8.4');
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper function to convert hex color to RGB tuple
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
    };

    // Use settings or fallback to defaults
    const headerColor = settingsData.pdf_header_color ? hexToRgb(settingsData.pdf_header_color) : [15, 40, 71]; // #0F2847
    const accentColor = settingsData.pdf_accent_color ? hexToRgb(settingsData.pdf_accent_color) : [0, 163, 224]; // #00a3e0
    const darkGray: [number, number, number] = [64, 64, 64];
    const mediumGray: [number, number, number] = [107, 114, 128];

    // Labels from settings
    const invoiceTitle = settingsData.pdf_invoice_title || 'INVOICE';
    const billToLabel = settingsData.pdf_bill_to_label || 'BILL TO';
    const dateIssuedLabel = settingsData.pdf_date_issued_label || 'Date Issued';
    const dueDateLabel = settingsData.pdf_due_date_label || 'Due Date';
    const dateColumnLabel = settingsData.pdf_date_column_label || 'Date';
    const descriptionColumnLabel = settingsData.pdf_description_column_label || 'Description';
    const hoursColumnLabel = settingsData.pdf_hours_column_label || 'Hours';
    const rateColumnLabel = settingsData.pdf_rate_column_label || 'Rate';
    const amountColumnLabel = settingsData.pdf_amount_column_label || 'Amount';
    const subtotalLabel = settingsData.pdf_subtotal_label || 'Subtotal';
    const totalLabel = settingsData.pdf_total_label || 'Total';
    const footerText = settingsData.pdf_footer_text || 'Thank you for your business';

    // Margins: 0.25 inch (18 points) all around
    const margin = 18;
    let y = margin;

    // Header - Company name and contact info
    doc.setTextColor(...headerColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(settingsData.company_name || 'Your Company Name', margin, y);

    y += 6;
    doc.setTextColor(...darkGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (settingsData.company_address) {
      const companyLines = settingsData.company_address.split('\n');
      companyLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 4;
      });
    }
    
    if (settingsData.company_phone) {
      doc.text(settingsData.company_phone, margin, y);
      y += 4;
    }
    
    if (settingsData.company_email) {
      doc.text(settingsData.company_email, margin, y);
      y += 4;
    }
    
    if (settingsData.company_website) {
      doc.text(settingsData.company_website, margin, y);
    }

    // Invoice title and number - right side
    let rightY = margin;
    doc.setTextColor(...headerColor);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceTitle, pageWidth - margin, rightY, { align: 'right' });

    rightY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text(invoiceData.invoice_number, pageWidth - margin, rightY, { align: 'right' });

    rightY += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mediumGray);
    doc.text(dateIssuedLabel, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4;
    doc.setTextColor(...darkGray);
    doc.text(new Date(invoiceData.date_issued).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - margin, rightY, { align: 'right' });

    rightY += 7;
    doc.setTextColor(...mediumGray);
    doc.text(dueDateLabel, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4;
    
    const isOverdue = new Date() > new Date(invoiceData.due_date) && invoiceData.status !== 'paid';
    doc.setTextColor(isOverdue ? 220 : darkGray[0], isOverdue ? 38 : darkGray[1], isOverdue ? 38 : darkGray[2]);
    doc.text(new Date(invoiceData.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - margin, rightY, { align: 'right' });

    // Divider line
    y = Math.max(y, rightY) + 12;
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // Bill To section
    y += 10;
    doc.setTextColor(...accentColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(billToLabel, margin, y);

    y += 5;
    doc.setTextColor(...headerColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(clientData.name, margin, y);

    y += 5;
    doc.setTextColor(...darkGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${clientData.billing_first_name} ${clientData.billing_last_name}`, margin, y);

    if (clientData.address_street) {
      y += 4;
      doc.text(clientData.address_street, margin, y);
    }
    if (clientData.address_line2) {
      y += 4;
      doc.text(clientData.address_line2, margin, y);
    }
    if (clientData.address_city || clientData.address_state || clientData.address_zip) {
      y += 4;
      const cityStateZip = [clientData.address_city, clientData.address_state, clientData.address_zip]
        .filter(Boolean)
        .join(', ');
      doc.text(cityStateZip, margin, y);
    }
    
    if (clientData.billing_email) {
      y += 4;
      doc.setTextColor(...mediumGray);
      doc.setFontSize(8);
      doc.text(clientData.billing_email, margin, y);
    }

    // Line items table
    y += 14;

    // Build table data
    const tableData = (lineItems || []).map((item: any) => [
      new Date(item.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      item.description,
      parseFloat(item.hours).toFixed(2),
      `$${parseFloat(item.rate).toFixed(2)}`,
      `$${parseFloat(item.subtotal).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [[dateColumnLabel, descriptionColumnLabel, hoursColumnLabel, rateColumnLabel, amountColumnLabel]],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: headerColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      },
      bodyStyles: {
        textColor: darkGray,
        fontSize: 9,
        cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      didParseCell: function(data: any) {
        if (data.section === 'head') {
          if (data.column.index === 2 || data.column.index === 3 || data.column.index === 4) {
            data.cell.styles.halign = 'right';
          }
        }
      },
    });

    // Calculate totals position
    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // Totals section
    const totalsX = pageWidth - margin - 60;
    let totalsY = currentY;

    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    doc.text(subtotalLabel, totalsX, totalsY);
    doc.text(`$${parseFloat(invoiceData.total).toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });

    totalsY += 8;
    doc.setDrawColor(...headerColor);
    doc.setLineWidth(0.5);
    doc.line(totalsX, totalsY, pageWidth - margin, totalsY);

    totalsY += 7;
    doc.setFontSize(12);
    doc.setTextColor(...headerColor);
    doc.setFont('helvetica', 'bold');
    doc.text(totalLabel, totalsX, totalsY);
    doc.text(`$${parseFloat(invoiceData.total).toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });

    currentY = totalsY + 12;

    // Payment Instructions (if enabled and provided)
    if (settingsData.pdf_show_payment_instructions && settingsData.pdf_payment_instructions) {
      const paymentLines = settingsData.pdf_payment_instructions.split('\n');
      
      const neededSpace = (paymentLines.length * 4) + 15;
      if (currentY + neededSpace > pageHeight - margin - 15) {
        doc.addPage();
        currentY = margin;
      }

      currentY += 6;
      doc.setFontSize(9);
      doc.setTextColor(...headerColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Instructions', margin, currentY);
      
      currentY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'normal');
      paymentLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 4;
      });
      
      currentY += 4;
    }

    // Terms & Conditions (if enabled and provided)
    if (settingsData.pdf_show_terms && settingsData.pdf_terms) {
      const termsLines = settingsData.pdf_terms.split('\n');
      
      const neededSpace = (termsLines.length * 4) + 15;
      if (currentY + neededSpace > pageHeight - margin - 15) {
        doc.addPage();
        currentY = margin;
      }

      currentY += 6;
      doc.setFontSize(9);
      doc.setTextColor(...headerColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Terms & Conditions', margin, currentY);
      
      currentY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'normal');
      termsLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 4;
      });
    }

    // Footer
    const footerY = pageHeight - margin;
    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // Create invoice view URL
    const invoiceUrl = `${c.req.header('origin') || 'http://localhost:8080'}/invoice/${id}`;

    // Get email customization settings
    const emailPrimaryColor = settingsData.email_primary_color || '#0ea5e9';
    const emailIncludeLineItems = settingsData.email_include_line_items || false;
    const emailIncludePdf = settingsData.email_include_pdf !== false; // Default to true
    
    // Function to replace merge fields with actual data
    const replaceMergeFields = (template: string) => {
      if (!template) return '';
      return template
        .replace(/\{\{client_name\}\}/g, clientData.billing_first_name || clientData.name)
        .replace(/\{\{invoice_number\}\}/g, invoiceData.invoice_number)
        .replace(/\{\{invoice_date\}\}/g, new Date(invoiceData.date_issued).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        .replace(/\{\{due_date\}\}/g, new Date(invoiceData.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        .replace(/\{\{total_amount\}\}/g, `$${parseFloat(invoiceData.total).toFixed(2)}`)
        .replace(/\{\{company_name\}\}/g, settingsData.company_name)
        .replace(/\{\{company_email\}\}/g, settingsData.company_email || '')
        .replace(/\{\{company_phone\}\}/g, settingsData.company_phone || '')
        .replace(/\{\{company_website\}\}/g, settingsData.company_website || '');
    };

    // Get custom message or use default
    const emailMessage = settingsData.email_default_message 
      ? replaceMergeFields(settingsData.email_default_message)
      : message || `Thank you for your business! Please find attached invoice ${invoiceData.invoice_number} for services rendered.`;

    // Get custom footer or use default
    const emailFooter = settingsData.email_footer 
      ? replaceMergeFields(settingsData.email_footer)
      : `Questions? Reply to this email or contact us at ${settingsData.company_email}\n\n${settingsData.company_name} | ${settingsData.company_website || ''}`;

    // Build line items HTML if enabled
    const lineItemsHtml = emailIncludeLineItems ? `
    <div style="margin: 25px 0;">
      <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 12px;">Invoice Details</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #64748b; font-weight: 600; font-size: 13px;">Date</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #64748b; font-weight: 600; font-size: 13px;">Description</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #64748b; font-weight: 600; font-size: 13px;">Hours</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #64748b; font-weight: 600; font-size: 13px;">Rate</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #64748b; font-weight: 600; font-size: 13px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(lineItems || []).map((item, index) => `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #64748b; font-size: 13px;">${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #1e293b; font-size: 13px;">${item.description}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #64748b; font-size: 13px;">${parseFloat(item.hours).toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #64748b; font-size: 13px;">$${parseFloat(item.rate).toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1e293b; font-weight: 600; font-size: 13px;">$${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : '';

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: ${emailPrimaryColor};
      color: white;
      padding: 40px 30px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      background: #ffffff;
      padding: 40px 30px;
      border-left: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
    }
    .message {
      background: #f0f9ff;
      border-left: 4px solid ${emailPrimaryColor};
      padding: 16px 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .message p {
      margin: 0;
      color: #0c4a6e;
      white-space: pre-wrap;
    }
    .invoice-details {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    .invoice-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .invoice-details td {
      padding: 8px 0;
    }
    .invoice-details td:first-child {
      color: #64748b;
      font-weight: 500;
    }
    .invoice-details td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .total-row {
      border-top: 2px solid #e5e7eb;
      padding-top: 12px !important;
    }
    .total-amount {
      font-size: 24px;
      color: ${emailPrimaryColor};
    }
    .cta-button {
      display: inline-block;
      background: ${emailPrimaryColor};
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 25px 0;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      border-radius: 0 0 12px 12px;
      border: 1px solid #e5e7eb;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .footer p {
      margin: 5px 0;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Invoice ${invoiceData.invoice_number}</h1>
    <p>from ${settingsData.company_name}</p>
  </div>
  
  <div class="content">
    <div class="message">
      <p>${emailMessage}</p>
    </div>
    
    <div class="invoice-details">
      <table>
        <tr>
          <td>Invoice Number:</td>
          <td>${invoiceData.invoice_number}</td>
        </tr>
        <tr>
          <td>Issue Date:</td>
          <td>${new Date(invoiceData.date_issued).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td>Due Date:</td>
          <td>${new Date(invoiceData.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr class="total-row">
          <td>Total Amount:</td>
          <td class="total-amount">$${parseFloat(invoiceData.total).toFixed(2)}</td>
        </tr>
      </table>
    </div>
    
    ${lineItemsHtml}
    
    <div style="text-align: center;">
      <a href="${invoiceUrl}" class="cta-button">View Invoice Online</a>
    </div>
  </div>
  
  <div class="footer">
    <p>${emailFooter}</p>
  </div>
</body>
</html>
    `;

    // Prepare recipients
    const toEmail = clientData.billing_email;
    const ccEmails = clientData.cc_emails || [];

    // Prepare attachments based on settings
    const attachments = emailIncludePdf ? [{
      filename: `${invoiceData.invoice_number}.pdf`,
      content: pdfBase64,
    }] : [];

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${settingsData.company_name} <invoices@notifications.macwillingham.com>`,
        reply_to: settingsData.company_email || undefined,
        to: [toEmail],
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: `Invoice ${invoiceData.invoice_number} from ${settingsData.company_name}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return c.json({ error: resendData.message || 'Failed to send email' }, 500);
    }

    // Update invoice with send info
    const currentSentCount = invoiceData.sent_count || 0;
    await supabase
      .from('invoices')
      .update({
        status: 'sent',
        last_sent_at: new Date().toISOString(),
        sent_count: currentSentCount + 1,
      })
      .eq('id', id);

    return c.json({ 
      success: true, 
      emailId: resendData.id,
      sentTo: toEmail,
      cc: ccEmails,
    });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to send invoice" }, 500);
  }
});

// ============ USER SETTINGS ============

// Get user settings
app.get("/make-server-07ab6163/settings", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const { data, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      console.error("Error fetching user settings:", settingsError);
      return c.json({ error: settingsError.message }, 500);
    }

    const settings = {
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyPhone: data.company_phone,
      companyEmail: data.company_email,
      companyWebsite: data.company_website,
      emailPrimaryColor: data.email_primary_color,
      emailDefaultMessage: data.email_default_message,
      emailFooter: data.email_footer,
      emailIncludePdf: data.email_include_pdf,
      emailIncludeLineItems: data.email_include_line_items,
    };

    return c.json({ settings });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// Update user settings
app.put("/make-server-07ab6163/settings", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const updates = await c.req.json();

    const updateData: any = {};
    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.companyAddress !== undefined) updateData.company_address = updates.companyAddress;
    if (updates.companyPhone !== undefined) updateData.company_phone = updates.companyPhone;
    if (updates.companyEmail !== undefined) updateData.company_email = updates.companyEmail;
    if (updates.companyWebsite !== undefined) updateData.company_website = updates.companyWebsite;
    if (updates.emailPrimaryColor !== undefined) updateData.email_primary_color = updates.emailPrimaryColor;
    if (updates.emailDefaultMessage !== undefined) updateData.email_default_message = updates.emailDefaultMessage;
    if (updates.emailFooter !== undefined) updateData.email_footer = updates.emailFooter;
    if (updates.emailIncludePdf !== undefined) updateData.email_include_pdf = updates.emailIncludePdf;
    if (updates.emailIncludeLineItems !== undefined) updateData.email_include_line_items = updates.emailIncludeLineItems;

    const { data, error: updateError } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user settings:", updateError);
      return c.json({ error: updateError.message }, 500);
    }

    const settings = {
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyPhone: data.company_phone,
      companyEmail: data.company_email,
      companyWebsite: data.company_website,
      emailPrimaryColor: data.email_primary_color,
      emailDefaultMessage: data.email_default_message,
      emailFooter: data.email_footer,
      emailIncludePdf: data.email_include_pdf,
      emailIncludeLineItems: data.email_include_line_items,
    };

    return c.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

Deno.serve(app.fetch);