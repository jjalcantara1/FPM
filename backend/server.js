const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
    const { 
        email, password, firstName, middleName, 
        surname, contactNumber, location, companyName 
    } = req.body;

    if (!email || !password || !firstName || !surname) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });

        if (authError) throw new Error(authError.message);
        if (!authData || !authData.user) throw new Error('User creation failed in Supabase Auth.');
        
        const newUserId = authData.user.id;

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
                    status: 'pending' 
                }
            ]);
        
        if (insertError) {
            await supabase.auth.admin.deleteUser(newUserId);
            throw new Error(insertError.message);
        }

        res.status(200).json({ message: 'Registration successful!' });

    } catch (error) {
        console.error('Registration Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// UPDATED DASHBOARD ENDPOINT
app.get('/api/pm/dashboard-data', async (req, res) => {
    try {
        // 1. Get ALL appointments and join owner/engineer info
        const { data: appointments, error: apptError } = await supabase
            .from('appointment_records')
            .select(`
                *,
                facility_owner_records (email, firstName, surname),
                engineer_records (firstName, lastName)
            `); // No filter!

        if (apptError) throw new Error(apptError.message);

        // 2. Get ALL facility owner accounts
        const { data: accounts, error: acctError } = await supabase
            .from('facility_owner_records')
            .select('*'); 

        if (acctError) throw new Error(acctError.message);

        // 3. Get all engineers
        const { data: engineers, error: engError } = await supabase
            .from('engineer_records')
            .select('*');

        if (engError) throw new Error(engError.message);

        // 4. Send all data back to the frontend
        res.status(200).json({
            allAppointments: appointments || [], // RENAMED
            allAccounts: accounts || [], 
            engineers: engineers || []
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// --- NEW ENDPOINT TO CREATE/UPDATE ENGINEER ---
app.post('/api/pm/engineer', async (req, res) => {
    const { id, email, password, givenName, middleName, lastName, phone, location } = req.body;

    try {
        if (id) {
            // --- UPDATE ---
            const { data: profile, error: profileError } = await supabase
                .from('engineer_records')
                .update({
                    firstName: givenName,
                    middleName: middleName,
                    lastName: lastName,
                    phone_number: phone,
                    email: email, // Also update email in profile
                    location: location
                })
                .eq('user_id', id)
                .select();

            if (profileError) throw new Error(profileError.message);

            // Also update auth user if email/password changed
            const authUpdates = {};
            if (email) authUpdates.email = email;
            if (password) authUpdates.password = password; // Only provide if it's a new password

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
                if (authError) throw new Error(authError.message);
            }

            res.status(200).json({ message: 'Engineer updated successfully!', data: profile });
        } else {
            // --- CREATE ---
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required for new engineer.' });
            }

            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true // Auto-confirm them
            });

            if (authError) throw new Error(authError.message);
            if (!authData || !authData.user) throw new Error('User creation failed in Supabase Auth.');
            
            const newUserId = authData.user.id;

            // 2. Create profile record
            const { data: profile, error: insertError } = await supabase
                .from('engineer_records')
                .insert([
                    {
                        user_id: newUserId,
                        firstName: givenName,
                        middleName: middleName,
                        lastName: lastName,
                        email: email,
                        phone_number: phone,
                        location: location
                    }
                ])
                .select();
            
            if (insertError) {
                // Rollback auth user creation
                await supabase.auth.admin.deleteUser(newUserId);
                throw new Error(insertError.message);
            }

            res.status(201).json({ message: 'Engineer created successfully!', data: profile });
        }
    } catch (error) {
        console.error('Engineer Save Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// --- ++ EDITED ENGINEER DELETE ENDPOINT ++ ---
app.delete('/api/pm/engineer/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Engineer ID is required.' });

    try {
        // STEP 1: Un-assign all appointments from this engineer
        const { error: apptError } = await supabase
            .from('appointment_records')
            .update({ engineer_user_id: null, status: 'Pending' }) // Set them back to Pending
            .eq('engineer_user_id', id);
        
        if (apptError) {
             console.error('Error un-assigning appointments:', apptError.message);
             throw new Error(`Database error un-assigning appointments: ${apptError.message}`);
        }

        // STEP 2: Delete the engineer's profile record
        const { error: profileError } = await supabase
            .from('engineer_records')
            .delete()
            .eq('user_id', id);

        if (profileError) {
             console.error('Error deleting engineer profile:', profileError.message);
             throw new Error(`Database error deleting profile: ${profileError.message}`);
        }
        
        // STEP 3: Delete the auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw new Error(authError.message);

        res.status(200).json({ message: 'Engineer deleted successfully. Associated appointments are now unassigned.' });
    } catch (error) {
        console.error('Engineer Delete Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// --- ENDPOINT TO CREATE/UPDATE FACILITY OWNER ---
app.post('/api/pm/facility-owner', async (req, res) => {
    // Note: 'organization' from form maps to 'company_name'
    // 'givenName' -> 'firstName', 'lastName' -> 'surname', 'location' -> 'address'
    const { id, email, password, givenName, middleName, lastName, phone, location, organization } = req.body;

    try {
        if (id) {
            // --- UPDATE ---
            const { data: profile, error: profileError } = await supabase
                .from('facility_owner_records')
                .update({
                    firstName: givenName,
                    middleName: middleName,
                    surname: lastName,
                    phone_number: phone,
                    email: email,
                    address: location,
                    company_name: organization
                })
                .eq('user_id', id)
                .select();

            if (profileError) throw new Error(profileError.message);

            const authUpdates = {};
            if (email) authUpdates.email = email;
            if (password && password !== '******') authUpdates.password = password; // Only update if new pass is provided

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
                if (authError) throw new Error(authError.message);
            }

            res.status(200).json({ message: 'Facility Owner updated successfully!', data: profile });
        } else {
            // --- CREATE ---
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required for new facility owner.' });
            }

            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true // Auto-confirm them
            });

            if (authError) throw new Error(authError.message);
            if (!authData || !authData.user) throw new Error('User creation failed in Supabase Auth.');
            
            const newUserId = authData.user.id;

            // 2. Create profile record
            const { data: profile, error: insertError } = await supabase
                .from('facility_owner_records')
                .insert([
                    {
                        user_id: newUserId,
                        firstName: givenName,
                        middleName: middleName,
                        surname: lastName,
                        email: email,
                        phone_number: phone,
                        address: location,
                        company_name: organization,
                        status: 'approved' // PM-created accounts are auto-approved
                    }
                ])
                .select();
            
            if (insertError) {
                // Rollback auth user creation
                await supabase.auth.admin.deleteUser(newUserId);
                throw new Error(insertError.message);
            }

            res.status(201).json({ message: 'Facility Owner created successfully!', data: profile });
        }
    } catch (error) {
        console.error('Facility Owner Save Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// --- ++ EDITED FACILITY OWNER DELETE ENDPOINT ++ ---
app.delete('/api/pm/facility-owner/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Facility Owner ID is required.' });

    try {
        // STEP 1: Delete all appointments associated with this user.
        const { error: apptError } = await supabase
            .from('appointment_records')
            .delete()
            .eq('user_id', id);
        
        if (apptError) {
            console.error('Error deleting user appointments:', apptError.message);
            throw new Error(`Database error deleting appointments: ${apptError.message}`);
        }

        // STEP 2: Delete the profile record from facility_owner_records.
        const { error: profileError } = await supabase
            .from('facility_owner_records')
            .delete()
            .eq('user_id', id);

        if (profileError) {
            console.error('Error deleting profile record:', profileError.message);
            throw new Error(`Database error deleting profile: ${profileError.message}`);
        }

        // STEP 3: Now that no records reference the user, delete the auth user.
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) {
            console.error('Error deleting auth user:', authError.message);
            throw new Error(`Database error deleting user: ${authError.message}`);
        }
        
        res.status(200).json({ message: 'Facility Owner and all associated data deleted successfully.' });
    } catch (error) {
        console.error('Facility Owner Delete Error:', error.message);
        // Send the more specific error message to the frontend
        res.status(400).json({ error: error.message });
    }
});


app.post('/api/pm/approve-account', async (req, res) => {
    const { user_id } = req.body; 
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

app.post('/api/pm/assign-appointment', async (req, res) => {
    const { appointment_id, engineer_user_id, pm_remarks } = req.body;

    try {
        const { data, error } = await supabase
            .from('appointment_records')
            .update({
                engineer_user_id: engineer_user_id,
                status: 'Assigned',
                pm_remarks: pm_remarks
            })
            .eq('id', appointment_id);

        if (error) throw new Error(error.message);
        res.status(200).json({ message: 'Appointment assigned successfully!' });
    } catch (error) {
        console.error('Error assigning appointment:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/pm/complete-appointment', async (req, res) => {
    const { appointment_id, remarks } = req.body;
    if (!appointment_id || !remarks) {
        return res.status(400).json({ error: 'Appointment ID and remarks are required.' });
    }
    try {
        const { data, error } = await supabase
            .from('appointment_records')
            .update({ 
                status: 'Completed',
                pm_remarks: remarks
            })
            .eq('id', appointment_id)
            .select(); 
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error('Appointment not found.');
        res.status(200).json({ message: 'Appointment marked as completed!' });
    } catch (error) {
        console.error('Error completing appointment:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/pm/hold-appointment', async (req, res) => {
    const { appointment_id, remarks } = req.body;
    if (!appointment_id || !remarks) {
        return res.status(400).json({ error: 'Appointment ID and remarks (reason) are required.' });
    }
    try {
        const { data, error } = await supabase
            .from('appointment_records')
            .update({ 
                status: 'On Hold',
                pm_remarks: remarks
            })
            .eq('id', appointment_id)
            .select(); 
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error('Appointment not found.');
        res.status(200).json({ message: 'Appointment status set to On Hold.' });
    } catch (error) {
        console.error('Error setting appointment to on hold:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/appointments/availability', async (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required.' });
    }
    const startDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, parseInt(month) + 1, 0).getDate();
    const endDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
        const { data, error } = await supabase
            .from('appointment_records')
            .select('date')
            .gte('date', startDate)
            .lte('date', endDate); 
        
        if (error) throw new Error(error.message);
        const counts = {};
        data.forEach(appt => {
            const date = appt.date;
            counts[date] = (counts[date] || 0) + 1;
        });
        res.status(200).json(counts);
    } catch (error) {
        console.error('Error fetching availability:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/my-appointments', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided.' });
        }
        const token = authHeader.split(' ')[1]; 
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        const { data, error } = await supabase
            .from('appointment_records')
            .select(`
                *,
                engineer_records (
                    firstName,
                    lastName
                )
            `)
            .eq('user_id', user.id) 
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching user appointments:', error.message);
        res.status(400).json({ error: error.message });
    }
});


app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from your Node.js backend!' });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});