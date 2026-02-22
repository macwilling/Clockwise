import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client with service role key for database access
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Create a separate client with ANON_KEY for JWT validation
const supabaseAuth = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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
  return c.json({ status: "ok" });
});

// Environment check endpoint (for debugging)
app.get("/make-server-07ab6163/debug/env", (c) => {
  return c.json({
    hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
    hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseUrl: Deno.env.get('SUPABASE_URL')?.substring(0, 30) + '...',
    anonKeyPrefix: Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 20) + '...',
    serviceRoleKeyPrefix: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20) + '...',
  });
});

// Debug auth endpoint
app.get("/make-server-07ab6163/debug/auth", async (c) => {
  const authHeader = c.req.header('Authorization');
  console.log('Auth debug - full header:', authHeader);
  
  if (!authHeader) {
    return c.json({ error: "No Authorization header" }, 401);
  }
  
  const token = authHeader.replace('Bearer ', '');
  console.log('Auth debug - token length:', token.length);
  console.log('Auth debug - token prefix:', token.substring(0, 50));
  
  try {
    // Test with ANON client (correct way)
    const { data: anonData, error: anonError } = await supabaseAuth.auth.getUser(token);
    console.log('Auth debug - ANON client result:', { user: anonData.user?.id, error: anonError });
    
    // Test with SERVICE_ROLE client (for comparison)
    const { data: serviceData, error: serviceError } = await supabase.auth.getUser(token);
    console.log('Auth debug - SERVICE_ROLE client result:', { user: serviceData.user?.id, error: serviceError });
    
    return c.json({
      success: !!anonData.user,
      anonClient: {
        hasUser: !!anonData.user,
        userId: anonData.user?.id,
        userEmail: anonData.user?.email,
        error: anonError?.message
      },
      serviceRoleClient: {
        hasUser: !!serviceData.user,
        userId: serviceData.user?.id,
        userEmail: serviceData.user?.email,
        error: serviceError?.message
      }
    });
  } catch (e) {
    console.log('Auth debug - exception:', e);
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
  
  console.log('=== JWT VALIDATION START ===');
  console.log('1. Authorization header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid Authorization header format');
    console.log('=== JWT VALIDATION FAILED ===');
    return { user: null, error: 'Invalid JWT' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  console.log('2. Token extracted, length:', token.length);
  console.log('3. Token prefix:', token.substring(0, 50));
  
  if (!token) {
    console.error('No token found in Authorization header');
    console.log('=== JWT VALIDATION FAILED ===');
    return { user: null, error: 'Invalid JWT' };
  }

  try {
    console.log('4. Validating JWT with SERVICE_ROLE client...');
    
    // Use SERVICE_ROLE client to validate the JWT
    // This is the correct server-side pattern for Supabase Edge Functions
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log('5. Validation result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: error?.message,
      errorCode: error?.status,
      errorName: error?.name
    });

    if (error) {
      console.error('Error validating JWT:', {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: JSON.stringify(error)
      });
      console.log('=== JWT VALIDATION FAILED ===');
      return { user: null, error: error.message || 'Invalid JWT' };
    }

    if (!user) {
      console.error('No user found for JWT');
      console.log('=== JWT VALIDATION FAILED ===');
      return { user: null, error: 'Invalid JWT' };
    }

    console.log('6. Successfully validated user:', user.id);
    console.log('=== JWT VALIDATION SUCCESS ===');
    return { user, error: null };
  } catch (error) {
    console.error('Exception validating JWT:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.log('=== JWT VALIDATION EXCEPTION ===');
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

    const { data, error: dbError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (dbError) {
      console.error("Error fetching clients:", dbError);
      return c.json({ error: dbError.message }, 500);
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
      logoUrl: client.logo_url,
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
    
    const { data, error: dbError } = await supabase
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
        logo_url: clientData.logoUrl,
      }])
      .select()
      .single();

    if (dbError) {
      console.error("Error adding client:", dbError);
      return c.json({ error: dbError.message }, 500);
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
      logoUrl: data.logo_url,
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
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;
    
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
      logoUrl: data.logo_url,
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

    const { data, error: dbError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (dbError) {
      console.error("Error fetching time entries:", dbError);
      return c.json({ error: dbError.message }, 500);
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
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const entryData = await c.req.json();
    
    const { data, error: dbError } = await supabase
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

    if (dbError) {
      console.error("Error adding time entry:", dbError);
      return c.json({ error: dbError.message }, 500);
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
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const invoiceData = await c.req.json();
    
    const { data, error: dbError } = await supabase
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

    if (dbError) {
      console.error("Error adding invoice:", dbError);
      return c.json({ error: dbError.message }, 500);
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

// ============ USER SETTINGS ============

// Get user settings
app.get("/make-server-07ab6163/settings", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c);
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const { data, error: dbError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (dbError) {
      console.error("Error fetching user settings:", dbError);
      return c.json({ error: dbError.message }, 500);
    }

    const settings = {
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyPhone: data.company_phone,
      companyEmail: data.company_email,
      companyWebsite: data.company_website,
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
    if (!user || error) {
      return c.json({ code: 401, message: error || 'Invalid JWT' }, 401);
    }

    const updates = await c.req.json();

    const updateData: any = {};
    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.companyAddress !== undefined) updateData.company_address = updates.companyAddress;
    if (updates.companyPhone !== undefined) updateData.company_phone = updates.companyPhone;
    if (updates.companyEmail !== undefined) updateData.company_email = updates.companyEmail;
    if (updates.companyWebsite !== undefined) updateData.company_website = updates.companyWebsite;

    const { data, error: dbError } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (dbError) {
      console.error("Error updating user settings:", dbError);
      return c.json({ error: dbError.message }, 500);
    }

    const settings = {
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyPhone: data.company_phone,
      companyEmail: data.company_email,
      companyWebsite: data.company_website,
    };

    return c.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

Deno.serve(app.fetch);
