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

app.get('/api/pm/dashboard-data', async (req, res) => {
    try {
        const { data: appointments, error: apptError } = await supabase
            .from('appointment_records')
            .select('*')
            .eq('status', 'Pending');
        
        if (apptError) throw new Error(apptError.message);

        const { data: accounts, error: acctError } = await supabase
            .from('facility_owner_records')
            .select('*'); 

        if (acctError) throw new Error(acctError.message);

        const { data: engineers, error: engError } = await supabase
            .from('engineer_records')
            .select('*');

        if (engError) throw new Error(engError.message);

        res.status(200).json({
            pendingAppointments: appointments || [],
            allAccounts: accounts || [], 
            engineers: engineers || []
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
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