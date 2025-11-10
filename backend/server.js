const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

// --- Supabase Admin Client ---
// Make sure these are your Supabase URL and SERVICE_ROLE_KEY
const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzAyMDAsImV4cCI6MjA3ODEwNjIwMH0.C-955XMYvpfo-Td60ythehqzv7cVmdKDHFRm-ESZ5AI';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 

// ================================================================
// NEW REGISTRATION ENDPOINT
// ================================================================
app.post('/api/register', async (req, res) => {
    // Get all the data from the frontend
    const { 
        email, password, firstName, middleName, 
        surname, contactNumber, location, companyName 
    } = req.body;

    // First, check if all required data is there
    if (!email || !password || !firstName || !surname) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // 1. Create the user in auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // We trust this email because it was verified by EmailJS
        });

        if (authError) {
            // This will fail if the user already exists
            throw new Error(authError.message);
        }
        
        if (!authData || !authData.user) {
             throw new Error('User creation failed in Supabase Auth.');
        }
        
        const newUserId = authData.user.id;

        // 2. Insert the profile into facility_owner_records
        // This runs as admin, so it bypasses RLS policies
        const { error: insertError } = await supabase
            .from('facility_owner_records')
            .insert([
                {
                    user_id: newUserId,
                    "firstName": firstName,
                    "middleName": middleName,
                    surname: surname,
                    email: email,
                    phone_number: contactNumber,
                    address: location,
                    company_name: companyName,
                    status: 'pending' // New accounts start as 'pending'
                }
            ]);
        
        if (insertError) {
            // If this fails, we should delete the auth user to clean up
            await supabase.auth.admin.deleteUser(newUserId);
            throw new Error(insertError.message);
        }

        // 3. Success!
        res.status(200).json({ message: 'Registration successful!' });

    } catch (error) {
        console.error('Registration Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// This endpoint loads ALL data the PM dashboard needs at once
app.get('/api/pm/dashboard-data', async (req, res) => {
    try {
        // 1. Get all pending appointments
        const { data: appointments, error: apptError } = await supabase
            .from('appointment_records')
            .select('*') // Get all columns
            .eq('status', 'Pending'); // Only where status is 'Pending'
        
        if (apptError) throw new Error(apptError.message);

        // 2. Get all pending facility owner accounts
        const { data: accounts, error: acctError } = await supabase
            .from('facility_owner_records')
            .select('*')
            .eq('status', 'pending'); // Only where status is 'pending'

        if (acctError) throw new Error(acctError.message);

        // 3. Get all engineers
        const { data: engineers, error: engError } = await supabase
            .from('engineer_records')
            .select('*');

        if (engError) throw new Error(engError.message);

        // 4. Send all data back to the frontend
        res.status(200).json({
            pendingAppointments: appointments,
            pendingAccounts: accounts,
            engineers: engineers
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// This endpoint approves a facility owner
app.post('/api/pm/approve-account', async (req, res) => {
    const { user_id } = req.body; // We only need the ID of the user to approve

    try {
        const { data, error } = await supabase
            .from('facility_owner_records')
            .update({ status: 'approved' })
            .eq('user_id', user_id);

        if (error) throw new Error(error.message);

        res.status(200).json({ message: 'Account approved successfully!' });

    } catch (error) {
        console.error('Error approving account:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// This endpoint assigns an engineer to an appointment
app.post('/api/pm/assign-appointment', async (req, res) => {
    const { appointment_id, engineer_id, pm_remarks } = req.body;

    try {
        const { data, error } = await supabase
            .from('appointment_records')
            .update({
                engineer_user_id: engineer_id, // We'll need to add this column
                status: 'Assigned', // Update status from 'Pending'
                pm_remarks: pm_remarks // Add the PM's notes
            })
            .eq('id', appointment_id);

        if (error) throw new Error(error.message);

        res.status(200).json({ message: 'Appointment assigned successfully!' });

    } catch (error) {
        console.error('Error assigning appointment:', error.message);
        res.status(400).json({ error: error.message });
    }
});
//
// PASTE THIS NEW ENDPOINT INTO YOUR backend/server.js
//
app.get('/api/appointments/availability', async (req, res) => {
    // Get the month and year from the query, e.g., /api/availability?month=10&year=2025
    // Note: JavaScript months are 0-11
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required.' });
    }

    // Calculate the first and last day of the given month
    // We must format it as YYYY-MM-DD for Supabase 'date' column
    const startDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;
    
    // Get the last day of the month
    const lastDay = new Date(year, parseInt(month) + 1, 0).getDate();
    const endDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
        // Use the admin client to bypass RLS and count all appointments
        const { data, error } = await supabase
            .from('appointment_records')
            .select('date') // We only need the date
            .gte('date', startDate) // "greater than or equal to" start of month
            .lte('date', endDate);  // "less than or equal to" end of month
        
        if (error) throw new Error(error.message);

        // Now, count the occurrences of each date
        const counts = {};
        data.forEach(appt => {
            const date = appt.date;
            counts[date] = (counts[date] || 0) + 1;
        });

        // 'counts' now looks like: { "2025-11-15": 5, "2025-11-12": 2 }
        res.status(200).json(counts);

    } catch (error) {
        console.error('Error fetching availability:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from your Node.js backend!' });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});