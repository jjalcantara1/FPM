const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

// --- Supabase Setup (THIS IS YOUR BACKEND CLIENT) ---
// You get these from your Supabase Project Settings > API
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY_HERE'; // <-- SECRET KEY!

// Here is the client initialization, right inside your server
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 

// --- Your API Endpoints ---
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from your Node.js backend!' });
});

// ... (your other API endpoints like /api/tasks/assign-engineer) ...

// --- Start the Server ---
app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});