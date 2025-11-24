const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const emailjs = require('@emailjs/nodejs');
const app = express();
const port = 3000;

const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

emailjs.init({
  publicKey: '09jja8DopIKMKbCtE', 
  privateKey: 'OqnClaXTcux0WF6CwWyuW', 
});

const EMAILJS_SERVICE_ID = 'service_qj1yc6w'; 
const EMAILJS_APPROVAL_TEMPLATE_ID = 'template_j14xhsp';

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

app.get('/api/pm/dashboard-data', async (req, res) => {
    try {
        const { data: appointments, error: apptError } = await supabase
            .from('appointment_records')
            .select(`
                *,
                facility_owner_records (email, firstName, surname),
                engineer_records (firstName, lastName)
            `);

        if (apptError) throw new Error(apptError.message);

        const { data: accounts, error: acctError } = await supabase
            .from('facility_owner_records')
            .select('*'); 

        if (acctError) throw new Error(acctError.message);

        // *** CHANGED: Only get non-archived engineers ***
        const { data: engineers, error: engError } = await supabase
            .from('engineer_records')
            .select('*')
            .neq('status', 'archived');

        if (engError) throw new Error(engError.message);

        res.status(200).json({
            allAppointments: appointments || [],
            allAccounts: accounts || [], 
            engineers: engineers || []
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/pm/engineer', async (req, res) => {
    const { id, email, password, givenName, middleName, lastName, phone, location } = req.body;

    try {
        if (id) {
            // --- UPDATE LOGIC ---
            const updateData = { // Create dynamic update object
                firstName: givenName,
                middleName: middleName,
                lastName: lastName,
                phone_number: phone,
                email: email,
                location: location
            };

            if (password) { // Only update password in profile table if provided
                updateData.password = password;
            }

            const { data: profile, error: profileError } = await supabase
                .from('engineer_records')
                .update(updateData) // Use dynamic update object
                .eq('user_id', id)
                .select();

            if (profileError) throw new Error(profileError.message);

            const authUpdates = {};
            if (email) authUpdates.email = email;
            if (password) authUpdates.password = password; 

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
                if (authError) throw new Error(authError.message);
            }

            res.status(200).json({ message: 'Engineer updated successfully!', data: profile });
        } else {
            // --- CREATE LOGIC ---
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required for new engineer.' });
            }

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true 
            });

            if (authError) throw new Error(authError.message);
            if (!authData || !authData.user) throw new Error('User creation failed in Supabase Auth.');
            
            const newUserId = authData.user.id;

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
                        location: location,
                        status: 'active',
                        password: password // ADDED PASSWORD HERE
                    }
                ])
                .select();
            
            if (insertError) {
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

app.post('/api/pm/archive-engineer/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Engineer ID is required.' });

    try {
        const { error: apptError } = await supabase
            .from('appointment_records')
            .update({ engineer_user_id: null, status: 'Pending' }) 
            .eq('engineer_user_id', id)
            .in('status', ['Assigned', 'In Progress', 'On Hold', 'Inspected']);
        
        if (apptError) {
             console.error('Error un-assigning appointments:', apptError.message);
             throw new Error(`Database error un-assigning appointments: ${apptError.message}`);
        }

        const { error: profileError } = await supabase
            .from('engineer_records')
            .update({ status: 'archived' }) 
            .eq('user_id', id);

        if (profileError) {
             console.error('Error archiving engineer profile:', profileError.message);
             throw new Error(`Database error archiving profile: ${profileError.message}`);
        }
    
        res.status(200).json({ message: 'Engineer archived successfully. Associated appointments are now unassigned.' });
    } catch (error) {
        console.error('Engineer Archive Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/pm/facility-owner', async (req, res) => {
    const { id, email, password, givenName, middleName, lastName, phone, location, organization } = req.body;

    try {
        if (id) {
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
            if (password && password !== '******') authUpdates.password = password; 

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
                if (authError) throw new Error(authError.message);
            }

            res.status(200).json({ message: 'Facility Owner updated successfully!', data: profile });
        } else {
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required for new facility owner.' });
            }

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true
            });

            if (authError) throw new Error(authError.message);
            if (!authData || !authData.user) throw new Error('User creation failed in Supabase Auth.');
            
            const newUserId = authData.user.id;

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
                        status: 'approved' 
                    }
                ])
                .select();
            
            if (insertError) {
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

app.delete('/api/pm/facility-owner/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Facility Owner ID is required.' });

    try {
        const { error: apptError } = await supabase
            .from('appointment_records')
            .delete()
            .eq('user_id', id);
        
        if (apptError) {
            console.error('Error deleting user appointments:', apptError.message);
            throw new Error(`Database error deleting appointments: ${apptError.message}`);
        }

        const { error: profileError } = await supabase
            .from('facility_owner_records')
            .delete()
            .eq('user_id', id);

        if (profileError) {
            console.error('Error deleting profile record:', profileError.message);
            throw new Error(`Database error deleting profile: ${profileError.message}`);
        }

        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) {
            console.error('Error deleting auth user:', authError.message);
            throw new Error(`Database error deleting user: ${authError.message}`);
        }
        
        res.status(200).json({ message: 'Facility Owner and all associated data deleted successfully.' });
    } catch (error) {
        console.error('Facility Owner Delete Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});


app.post('/api/pm/approve-account', async (req, res) => {
    const { user_id } = req.body; 
    try {
        const { data: userData, error } = await supabase
            .from('facility_owner_records')
            .update({ status: 'approved' })
            .eq('user_id', user_id)
            .select('email, "firstName", company_name') 
            .single(); 

        if (error) throw new Error(error.message);
        if (!userData) throw new Error('User not found or could not be updated.');

        const templateParams = {
            to_email: userData.email,
            to_name: userData.firstName || 'Valued Partner',
            company_name: userData.company_name || 'your company',
        };

        try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_APPROVAL_TEMPLATE_ID, templateParams);
            console.log(`Approval email sent successfully to ${userData.email}`);
        } catch (emailError) {
            
            console.error('Failed to send approval email:', emailError);
        }

        res.status(200).json({ message: 'Account approved successfully! Email notification sent.' });
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
                status: 'In Progress', 
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
            return res.status(41).json({ error: 'No authorization token provided.' });
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

app.post('/api/pm/archive-facility-owner/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Facility Owner ID is required.' });

    try {
        const { error: profileError } = await supabase
            .from('facility_owner_records')
            .update({ status: 'archived' })
            .eq('user_id', id);

        if (profileError) {
            throw new Error(`Database error: ${profileError.message}`);
        }
                
        res.status(200).json({ message: 'Facility Owner archived successfully. They can no longer log in.' });
    } catch (error) {
        console.error('Facility Owner Archive Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/engineer/dashboard-data', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        const { data: assignments, error: assignError } = await supabase
            .from('appointment_records')
            .select('*')
            .eq('engineer_user_id', user.id)
            .order('date', { ascending: true });

        if (assignError) throw assignError;

        const ticketCodes = assignments.map(a => a.ticket_code).filter(Boolean);

        let materials = [];
        let vehicles = [];

        if (ticketCodes.length > 0) {
            const { data: matData } = await supabase
                .from('material_requests')
                .select('*')
                .in('ticket_id', ticketCodes)
                .order('created_at', { ascending: false });
            materials = matData || [];

            // *** UPDATED QUERY WITH JOINS ***
            const { data: vehData } = await supabase
                .from('vehicle_requests')
                .select(`
                    *,
                    fleet_drivers (first_name, last_name, phone_number),
                    fleet_vehicles (plate_number, type, model)
                `)
                .in('ticket_id', ticketCodes)
                .order('created_at', { ascending: false });
            vehicles = vehData || [];
        }

        res.status(200).json({
            assignments,
            notifications: {
                materials,
                vehicles
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/engineer/acknowledge', async (req, res) => {
    const { appointment_id, remarks } = req.body;
    try {
        const { error } = await supabase
            .from('appointment_records')
            .update({ status: 'Acknowledged', engineerStatus: 'accepted' })
            .eq('id', appointment_id);
        if (error) throw error;
        res.status(200).json({ message: 'Success' });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/engineer/complete', async (req, res) => {
    const { appointment_id, remarks } = req.body;
    try {
        const { error } = await supabase
            .from('appointment_records')
            .update({ status: 'Completed' })
            .eq('id', appointment_id);
        if (error) throw error;
        res.status(200).json({ message: 'Success' });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/engineer/request-material', async (req, res) => {
    const { ticket_code, site, materials, remarks } = req.body;
    try {
        const { error } = await supabase
            .from('material_requests')
            .insert([{
                ticket_id: ticket_code,
                site: site,
                task_description: remarks || 'Material Request',
                status: 'Pending',
                request_date: new Date(),
                remarks: `Requested: ${JSON.stringify(materials)}`
            }]);
        if (error) throw error;
        res.status(200).json({ message: 'Request submitted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/engineer/request-vehicle', async (req, res) => {
    const { ticket_code, location, remarks, requested_by } = req.body;
    try {
        const { error } = await supabase
            .from('vehicle_requests')
            .insert([{
                ticket_id: ticket_code,
                location: location,
                requested_by: requested_by || 'Engineer',
                status: 'Pending',
                request_date: new Date(),
                remarks: remarks
            }]);
        if (error) throw error;
        res.status(200).json({ message: 'Vehicle request submitted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from your Node.js backend!' });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});