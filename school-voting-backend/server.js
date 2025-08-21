const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_FILE = 'db.json';

// Middleware to parse JSON bodies and enable CORS
app.use(express.json());
app.use(cors());

// Function to read data from our JSON file "database"
const readDb = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return null;
  }
};

// Function to write data to our JSON file "database"
const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to database file:', error);
    return false;
  }
};

// --- API Endpoints ---

// GET /positions - To get the list of positions and candidates
app.get('/positions', (req, res) => {
  const db = readDb();
  if (!db) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  const positionsAndCandidates = {};
  for (const position in db.positions) {
    positionsAndCandidates[position] = Object.keys(db.positions[position]);
  }
  
  res.json({ positions: Object.keys(positionsAndCandidates), candidates: positionsAndCandidates });
});


// POST /vote - To submit a user's vote
app.post('/vote', (req, res) => {
  const { selections } = req.body;
  if (!selections) {
    return res.status(400).json({ error: 'Invalid vote data provided.' });
  }

  const db = readDb();
  if (!db) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Loop through the selections and increment the vote count
  for (const position in selections) {
    const candidate = selections[position];
    if (db.positions[position] && db.positions[position][candidate] !== undefined) {
      db.positions[position][candidate]++;
    } else {
      console.warn(`Invalid vote for position: ${position}, candidate: ${candidate}`);
    }
  }

  if (writeDb(db)) {
    res.status(200).json({ message: 'Votes recorded successfully.' });
  } else {
    res.status(500).json({ error: 'Could not save votes.' });
  }
});

// POST /admin/login - To check the admin PIN
app.post('/admin/login', (req, res) => {
  const { pin } = req.body;
  const db = readDb();

  if (!db) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (pin === db.admin.pin) {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect PIN.' });
  }
});

// GET /results - To get the current vote results (after admin login)
app.get('/results', (req, res) => {
  const db = readDb();
  if (!db) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.json(db.positions);
});

// POST /reset - Resets all vote counts (Admin only)
app.post('/reset', (req, res) => {
  const { pin } = req.body;
  const db = readDb();

  if (!db) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (pin !== db.admin.pin) {
    return res.status(401).json({ error: 'Incorrect PIN. Unauthorized access.' });
  }

  // Reset all vote counts to 0
  for (const position in db.positions) {
    for (const candidate in db.positions[position]) {
      db.positions[position][candidate] = 0;
    }
  }

  if (writeDb(db)) {
    res.status(200).json({ message: 'Votes successfully reset.' });
  } else {
    res.status(500).json({ error: 'Could not reset votes.' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});