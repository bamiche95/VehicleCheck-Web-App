import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise'; // Import mysql2/promise for async/await
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import session from 'express-session';

// This loads the .env in the same folder as server.js (backend/)
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cookieParser());
app.use(express.json());
const allowedOrigins = [
  'http://localhost:4173',
  'http://192.168.1.33:4173',
  'http://172.23.128.1:4173',
  'http://192.168.1.34:8081',
  'http://localhost:5173',
  'https://vehcheck.recman.com' // add your production domain here
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(session({
  secret: process.env.JWT_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
  sameSite: 'lax',
  secure: false,
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
}

}));
// Database Connection Pool
let db; // Declare db variable here

function connectToDatabase() {
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('Successfully connected to the database!');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
}


// Connect to the database when the server starts
connectToDatabase();
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

// Example route to test connection
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend server is running!' });
});

export function authRequired(req, res, next) {
  const token = req.cookies?.token; // cookie-parser must be used
  if (!token) {
    return res.status(401).json({ message: 'No authentication token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // attach user info to req for downstream routes
    req.user = { uid: decoded.uid, role: decoded.role };
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

///////////////////////////////////



const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ---------------------------------------------------------------- */

/* serve uploaded files */
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(
  '/uploads',
  express.static(uploadsDir)
);

/* configure multer */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${file.fieldname}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype));
  },
});


//////
//HELP FUNCTIONS
function formatDateToDDMMYYYY_HHMM(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}


//////
//Get List View inpections
// Helper function to convert 1/0 to 'Yes'/'No'
function formatHasDefects(value) {
  return Number(value) === 1 ? 'Yes' : 'No';
}


async function generateUniqueDefectNumber(connection) {
  let defectNumber;
  let exists = true;

  while (exists) {
    // Generate a 6-digit random number as a string, e.g. '123456'
    defectNumber = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if it already exists (only non-null checked)
    const [rows] = await connection.execute(
      'SELECT 1 FROM vehicle_checklists WHERE defect_number = ? LIMIT 1',
      [defectNumber]
    );

    if (rows.length === 0) exists = false; // unique, break loop
  }

  return defectNumber;
}



/////////////////////////////////

// example protected route
app.get('/api/profile', authRequired, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT id, firstname, lastname, role FROM vehicle_users WHERE id = ?',
    [req.user.uid]
  );
  res.json(rows[0]);
});

app.get('/api/user/me', authRequired, async (req, res) => {
  try {
    const userId = req.user.uid;

    const [rows] = await db.execute(
      `SELECT id, firstname, lastname, username, role, created_at, signature 
       FROM vehicle_users 
       WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    res.json({ user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});





// User registration route
app.post('/api/users', async (req, res) => {
    const { firstname, lastname, username, password, role } = req.body;

    if (!firstname || !lastname || !username || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Validate role
    const validRoles = ['admin', 'supervisor', 'driver'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role.' });
    }

    try {
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert into DB
        const query = `
            INSERT INTO vehicle_users (firstname, lastname, username, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        `;

        // Use the initialized db connection pool
        await db.execute(query, [firstname, lastname, username, password_hash, role]);

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        // Check for duplicate entry error code (specific to MySQL)
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Username already exists.' });
        } else {
            console.error('Error registering user:', error);
            res.status(500).json({ message: 'Server error.' });
        }
    }
});


app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username & password required.' });
  }

  try {
    // 1) look up user
    const [rows] = await db.execute(
      'SELECT id, password_hash, role FROM vehicle_users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];

    // 2) compare password
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 3) sign JWT (payload can be minimal)
    const token = jwt.sign(
      { uid: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }        // adjust as needed
    );

    // 4) set as http‑only cookie + send in body (mobile apps can read body)
    res.cookie('token', token, {
      httpOnly: true,
  sameSite: 'lax',   // ✅ safer default for dev
  secure: false,     // ✅ ok for localhost
  maxAge: 24 * 60 * 60 * 1000,
      })
      .json({ message: 'Logged in', token, role: user.role, uid: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie('token').json({ message: 'Logged out.' });
});

// Start the server
// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize socket.io with CORS options matching the frontend
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4173', 'https://vehcheck.recman.com', 'http://192.168.1.34:8081'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});


app.get("/api/me", authRequired, (req, res) => {
  res.json({ user: req.user }); // req.user populated from JWT/session
});


//Create new user from the dashboard

app.post('/api/admin/users', authRequired, async (req, res) => {
    const { firstname, lastname, username, password, role } = req.body;

    // Check required fields
    if (!firstname || !lastname || !username || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const validRoles = ['admin', 'supervisor', 'driver'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role.' });
    }

    // 🚨 Security check — only admin can create admin users
    if (role === 'admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create another admin.' });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO vehicle_users (firstname, lastname, username, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        await db.execute(sql, [firstname, lastname, username, password_hash, role]);

        res.status(201).json({ message: 'User created successfully.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Username already exists.' });
        } else {
            console.error('Error creating user:', error);
            res.status(500).json({ message: 'Server error.' });
        }
    }
});


// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Example listener
  socket.on('message', (data) => {
    console.log('Received message:', data);
    // Broadcast it back to all clients
    io.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

io.on('connection', (socket) => {
  const user = socket.handshake.auth.user; // you can pass full user object on connection if you want
  if (!user) return;

  // Join room only if admin or supervisor
  if (user.role === 'admin' || user.role === 'supervisor') {
    socket.join(`user_${user.uid}`);
  }
});



// Start the HTTP server
server.listen(port, () => {
  console.log(`Backend server + socket listening on http://localhost:${port}`);
});

///////////////////////////////////////////////////////////////////////
/*
API ENDPOINTS
*/
////////////////////////////////////////////////////////////////////////

//Fetch users
// GET /api/users
app.get('/api/users', authRequired, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();

    const sql = `
     SELECT 
  id,
  CONCAT(firstname, ' ', lastname) AS fullname,
  username,
  role,
  created_at
FROM vehicle_users
ORDER BY created_at DESC

    `;

    const [rows] = await connection.execute(sql);
    connection.release();

    // Map over rows to add fullname and format created_at
    const users = rows.map(user => ({
      ...user,
     
      created_at: formatDateToDDMMYYYY_HHMM(user.created_at),
    }));

    res.json({ users });
  } catch (err) {
    if (connection) connection.release();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    const sql = `
      SELECT id, firstname, lastname, username, role, created_at
      FROM vehicle_users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await connection.execute(sql, [id]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format date if needed, or send raw date and format client-side
    const user = {
      ...rows[0],
      fullname: `${rows[0].firstname} ${rows[0].lastname}`,
      // optionally format created_at here
    };

    res.json({ user });
  } catch (err) {
    if (connection) connection.release();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



// GET all checklist templates (grouped and ordered)
app.get('/api/checklist-templates', authRequired, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, section, label, position
      FROM vehicle_checklist_templates
      ORDER BY section, position ASC
    `);

    // Optional: group by section in response
    const grouped = rows.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});

    res.json(grouped);
  } catch (err) {
    console.error('Failed to fetch checklist templates:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

//Insert new Checklist into the template
app.post('/api/checklist-templates', authRequired, async (req, res) => {
  const { section, label } = req.body;
  if (!section || !label) {
    return res.status(400).json({ message: 'Section and label are required.' });
  }

  try {
    // Get max position for this section
    const [[{ maxPosition }]] = await db.execute(
      `SELECT MAX(position) as maxPosition FROM vehicle_checklist_templates WHERE section = ?`,
      [section]
    );

    // Insert new checklist item with position = maxPosition + 1 (or 1 if null)
    const position = (maxPosition || 0) + 1;
    const [result] = await db.execute(
      `INSERT INTO vehicle_checklist_templates (section, label, position) VALUES (?, ?, ?)`,
      [section, label, position]
    );

    res.status(201).json({ id: result.insertId, section, label, position });
  } catch (err) {
    console.error('Failed to add checklist template:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});



//GET all vehicles
app.get('/api/vehicles', authRequired, async (req, res) => {
  try {
    const [vehicles] = await db.execute(`
      SELECT id, reg_number, make, model, year, mot_expiry_date, pmi_date
      FROM vehicle_vehicles
      ORDER BY id ASC
    `);

    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});


//Get all vehicles by reg number
// backend: /api/vehicles
app.get('/api/vehiclesbyreg', authRequired, async (req, res) => {
  try {
    const searchQuery = req.query.q || '';

    if (searchQuery.trim() === '') {
      return res.json([]);
    }

    const [vehicles] = await db.execute(
      `SELECT id, reg_number
       FROM vehicle_vehicles
       WHERE reg_number LIKE ?
       ORDER BY reg_number ASC`,
      [`%${searchQuery}%`]
    );

    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET vehicle by ID
app.get('/api/vehicles/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute('SELECT * FROM vehicle_vehicles WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE vehicle by ID
app.put('/api/vehicles/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const { reg_number, make, model, year, mot_expiry_date, pmi_date } = req.body;

  try {
    await db.execute(
      `UPDATE vehicle_vehicles 
       SET reg_number = ?, make = ?, model = ?, year = ?, mot_expiry_date = ?, pmi_date = ? 
       WHERE id = ?`,
      [reg_number, make, model, year, mot_expiry_date, pmi_date || null, id]
    );
    res.json({ message: 'Vehicle updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



//Submit checklist responese


app.post('/api/inspections', authRequired, upload.array('media', 10),
  async (req, res) => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const userId = req.user.uid;
      const [userRows] = await connection.execute(
        `SELECT firstname, lastname FROM vehicle_users WHERE id = ?`,
        [userId]
      );

      const fullName = userRows.length > 0
        ? `${userRows[0].firstname} ${userRows[0].lastname}`
        : 'Unknown User';

      const { vehicle_id, trailer_id, comment, mileage } = req.body;

      
 // -------- Parse defects (interior/exterior/startup) --------
const defects = [];
const excludedLabels = ['AdBlue level', 'Fuel level', 'Oil level'];

for (const [key, val] of Object.entries(req.body)) {
  if (key.startsWith('interior_') || key.startsWith('exterior_') || key.startsWith('startup_')) {
    if (key.startsWith('startup_level_')) continue; // skip level inputs

    const templateId = key.split('_')[1];
    const valStr = String(val).toLowerCase();

    if (['1', 'true', 'on'].includes(valStr)) {
      // look up label for this templateId
      const [[row]] = await connection.execute(
        `SELECT label FROM vehicle_checklist_templates WHERE id = ?`,
        [templateId]
      );

      if (!row || !excludedLabels.includes(row.label)) {
        defects.push(templateId);
      }
    }
  }
}

const hasDefects = defects.length > 0;


      // -------- Parse levels --------
      const exteriorFuelLevels = {};
      const startupLevels = {};
      for (const [key, val] of Object.entries(req.body)) {
        if (key.startsWith('exterior_fuel_level_')) {
          const templateId = key.replace('exterior_fuel_level_', '');
          exteriorFuelLevels[templateId] = val;
        } else if (key.startsWith('startup_level_')) {
          const templateId = key.replace('startup_level_', '');
          startupLevels[templateId] = val;
        }
      }

      // -------- Insert checklist header --------
      const defectNumber = await generateUniqueDefectNumber(connection);
      const [checklistResult] = await connection.execute(
        `INSERT INTO vehicle_checklists
          (vehicle_id, trailer_id, user_id, submitted_at, has_defects, notes, defect_number, mileage)
          VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [vehicle_id, trailer_id || null, userId, hasDefects ? 1 : 0, comment || null, defectNumber, mileage]
      );
      const checklistId = checklistResult.insertId;

      // -------- Insert checklist responses (defects) and per-defect comments --------
      for (const template_item_id of defects) {
        await connection.execute(
          `INSERT INTO vehicle_checklist_responses 
             (checklist_id, template_item_id, is_defective, notes)
           VALUES (?, ?, 1, NULL)`,
          [checklistId, template_item_id]
        );

        const commentField = req.body[`comment_${template_item_id}`] || null;
        if (commentField) {
          await connection.execute(
            `INSERT INTO vehicle_checklist_comments
               (checklist_id, template_item_id, comment)
             VALUES (?, ?, ?)`,
            [checklistId, template_item_id, commentField]
          );
        }
      }

      // -------- Insert levels --------
      for (const [template_item_id, level] of Object.entries(startupLevels)) {
        await connection.execute(
          `INSERT INTO vehicle_checklist_fuel_levels (checklist_id, template_item_id, fuel_level)
           VALUES (?, ?, ?)`,
          [checklistId, template_item_id, level]
        );
      }

      for (const [template_item_id, level] of Object.entries(exteriorFuelLevels)) {
        await connection.execute(
          `INSERT INTO vehicle_checklist_fuel_levels (checklist_id, template_item_id, fuel_level)
           VALUES (?, ?, ?)`,
          [checklistId, template_item_id, level]
        );
      }

      // -------- MEDIA --------
      const files = req.files || [];
      let mediaLabels = req.body.media_labels || [];
      if (!Array.isArray(mediaLabels)) mediaLabels = [mediaLabels];

      if (files.length !== mediaLabels.length) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          error: `Number of media labels (${mediaLabels.length}) does not match number of uploaded files (${files.length}).`
        });
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const label = mediaLabels[i] || null;
        await connection.execute(
          `INSERT INTO vehicle_media (user_id, file_path, uploaded_at, vehicle_id, checklist_id, label)
           VALUES (?, ?, NOW(), ?, ?, ?)`,
          [userId, `/uploads/${file.filename}`, vehicle_id, checklistId, label]
        );
      }

      // -------- Notifications --------
      const [vehicleRows] = await connection.execute(
        `SELECT reg_number FROM vehicle_vehicles WHERE id = ?`,
        [vehicle_id]
      );
      const reg_number = vehicleRows.length > 0 ? vehicleRows[0].reg_number : '';

      const notificationMessage = `Inspection #${checklistId} for vehicle ${reg_number} submitted.`;

      await connection.execute(
        `INSERT INTO vehicle_notifications (user_id, message, created_at, read_status, related_checklist_id)
         VALUES (?, ?, NOW(), 0, ?)`,
        [userId, notificationMessage, checklistId]
      );

      await connection.commit();
      connection.release();

      const submittedAtFormatted = formatDateToDDMMYYYY_HHMM(new Date());

      io.emit('inspection-created', {
        id: checklistId,
        reg_number,
        submitted_at: submittedAtFormatted,
        has_defects: hasDefects ? 'Yes' : 'No',
        defect_count: defects.length,
        notes: comment || '',
        vehicle_id,
        trailer_id: trailer_id || null,  // <-- included in event
        user_id: userId,
        mileage
      });

      io.emit('notification-created', {
        user_id: userId,
        message: notificationMessage,
        created_at: new Date().toISOString(),
        related_checklist_id: checklistId,
        full_name: fullName,
      });

      res.status(201).json({ message: 'Inspection created', checklist_id: checklistId });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);





app.put('/api/inspections/:id', authRequired, upload.array('media', 10), async (req, res) => {
    let connection;
    try {
        const checklistId = req.params.id;
        if (!checklistId) {
            return res.status(400).json({ error: 'Checklist ID is required.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const userId = req.user.uid;

        // 1. Check the current user's role
        const [userRoleRows] = await connection.execute(
            `SELECT role FROM vehicle_users WHERE id = ?`,
            [userId]
        );

        if (userRoleRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'User not found.' });
        }

        const userRole = userRoleRows[0].role;
        if (userRole !== 'admin' && userRole !== 'supervisor') {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ error: 'Forbidden: Only administrators and supervisors can edit inspections.' });
        }

        const { vehicle_id, trailer_id, comment, mileage } = req.body;

        // -------- Parse new defects and levels from request body --------
        const newDefects = [];
        for (const [key, val] of Object.entries(req.body)) {
            if (key.startsWith('interior_') || key.startsWith('exterior_') || key.startsWith('startup_')) {
                if (key.startsWith('startup_level_')) continue;
                const templateId = key.split('_')[1];
                const valStr = String(val).toLowerCase();
                if (['1', 'true', 'on'].includes(valStr)) {
                    newDefects.push(templateId);
                }
            }
        }
        const hasDefects = newDefects.length > 0;

        const startupLevels = {};
        const exteriorFuelLevels = {};
        for (const [key, val] of Object.entries(req.body)) {
            if (key.startsWith('startup_level_')) {
                const templateId = key.replace('startup_level_', '');
                startupLevels[templateId] = val;
            } else if (key.startsWith('exterior_fuel_level_')) {
                const templateId = key.replace('exterior_fuel_level_', '');
                exteriorFuelLevels[templateId] = val;
            }
        }

        // -------- Fetch old data for auditing --------
        const [oldChecklistRows] = await connection.execute(
            `SELECT vehicle_id, trailer_id, notes, mileage, has_defects FROM vehicle_checklists WHERE id = ?`,
            [checklistId]
        );
        const oldChecklist = oldChecklistRows[0];

        const [oldDefectsRows] = await connection.execute(
            `SELECT template_item_id FROM vehicle_checklist_responses WHERE checklist_id = ?`,
            [checklistId]
        );
        const oldDefectIds = oldDefectsRows.map(r => r.template_item_id.toString());

        const [oldLevelsRows] = await connection.execute(
            `SELECT template_item_id, fuel_level FROM vehicle_checklist_fuel_levels WHERE checklist_id = ?`,
            [checklistId]
        );
        const oldLevels = {};
        oldLevelsRows.forEach(r => { oldLevels[r.template_item_id] = r.fuel_level; });

        // -------- Update checklist header --------
        await connection.execute(
            `UPDATE vehicle_checklists
             SET vehicle_id = ?, trailer_id = ?, has_defects = ?, notes = ?, mileage = ?,
                 modified_at = NOW(),
                 modified_by = ?
             WHERE id = ?`,
            [vehicle_id, trailer_id || null, hasDefects ? 1 : 0, comment || null, mileage, userId, checklistId]
        );

        // -------- Update checklist responses (defects) and comments --------
        await connection.execute(`DELETE FROM vehicle_checklist_responses WHERE checklist_id = ?`, [checklistId]);
        await connection.execute(`DELETE FROM vehicle_checklist_comments WHERE checklist_id = ?`, [checklistId]);

        for (const template_item_id of newDefects) {
            await connection.execute(
                `INSERT INTO vehicle_checklist_responses (checklist_id, template_item_id, is_defective, notes)
                 VALUES (?, ?, 1, NULL)`,
                [checklistId, template_item_id]
            );

            const commentField = req.body[`comment_${template_item_id}`] || null;
            if (commentField) {
                await connection.execute(
                    `INSERT INTO vehicle_checklist_comments (checklist_id, template_item_id, comment)
                     VALUES (?, ?, ?)`,
                    [checklistId, template_item_id, commentField]
                );
            }
        }

        // -------- Update levels into vehicle_checklist_fuel_levels --------
        await connection.execute(`DELETE FROM vehicle_checklist_fuel_levels WHERE checklist_id = ?`, [checklistId]);
        const allLevels = { ...startupLevels, ...exteriorFuelLevels };
        for (const [template_item_id, level] of Object.entries(allLevels)) {
            await connection.execute(
                `INSERT INTO vehicle_checklist_fuel_levels (checklist_id, template_item_id, fuel_level)
                 VALUES (?, ?, ?)`,
                [checklistId, template_item_id, level]
            );
        }

        // -------- Audit logging --------
        const [templateRows] = await connection.execute(
            `SELECT id, label FROM vehicle_checklist_templates`
        );
        const templateMap = {};
        templateRows.forEach(r => { templateMap[r.id] = r.label; });

        const auditEntries = [];

        // Checklist fields
        if (oldChecklist.vehicle_id !== parseInt(vehicle_id)) {
            auditEntries.push(['vehicle_id', oldChecklist.vehicle_id, vehicle_id]);
        }
        if ((oldChecklist.trailer_id || null) !== (trailer_id ? parseInt(trailer_id) : null)) {
            auditEntries.push(['trailer_id', oldChecklist.trailer_id || null, trailer_id || null]);
        }
        if ((oldChecklist.notes || '') !== (comment || '')) {
            auditEntries.push(['notes', oldChecklist.notes || '', comment || '']);
        }
        if (oldChecklist.mileage !== parseInt(mileage)) {
            auditEntries.push(['mileage', oldChecklist.mileage, mileage]);
        }
        if (oldChecklist.has_defects !== (hasDefects ? 1 : 0)) {
            auditEntries.push(['has_defects',
                oldChecklist.has_defects ? 'Yes' : 'No',
                hasDefects ? 'Yes' : 'No'
            ]);
        }

        // Defects
        const addedDefects = newDefects.filter(id => !oldDefectIds.includes(id));
        const removedDefects = oldDefectIds.filter(id => !newDefects.includes(id));

        addedDefects.forEach(id => {
            auditEntries.push(['defect_added', null, templateMap[id] || `Template ${id}`]);
        });
        removedDefects.forEach(id => {
            auditEntries.push(['defect_removed', templateMap[id] || `Template ${id}`, null]);
        });

        // Fuel / startup levels
        for (const [template_item_id, newLevel] of Object.entries(allLevels)) {
            const oldLevel = oldLevels[template_item_id] || null;
            if (oldLevel !== newLevel) {
                const label = templateMap[template_item_id] || `level_${template_item_id}`;
                auditEntries.push([label, oldLevel, newLevel]);
            }
        }

        // Insert audit entries
        for (const [field, oldVal, newVal] of auditEntries) {
            await connection.execute(
                `INSERT INTO vehicle_checklist_audit
                 (checklist_id, field_name, old_value, new_value, changed_by)
                 VALUES (?, ?, ?, ?, ?)`,
                [checklistId, field, oldVal, newVal, userId]
            );
        }

        // -------- MEDIA --------
        const files = req.files || [];
        let mediaLabels = req.body.media_labels || [];
        if (!Array.isArray(mediaLabels)) mediaLabels = [mediaLabels];
        const existingMediaIds = JSON.parse(req.body.existing_media_ids || '[]');

        if (files.length !== mediaLabels.length) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                error: `Number of media labels (${mediaLabels.length}) does not match number of uploaded files (${files.length}).`
            });
        }

        if (existingMediaIds.length > 0) {
            const placeholders = existingMediaIds.map(() => '?').join(',');
            await connection.execute(
                `DELETE FROM vehicle_media WHERE checklist_id = ? AND id NOT IN (${placeholders})`,
                [checklistId, ...existingMediaIds]
            );
        } else {
            await connection.execute(`DELETE FROM vehicle_media WHERE checklist_id = ?`, [checklistId]);
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const label = mediaLabels[i] || null;
            await connection.execute(
                `INSERT INTO vehicle_media (user_id, file_path, uploaded_at, vehicle_id, checklist_id, label)
                 VALUES (?, ?, NOW(), ?, ?, ?)`,
                [userId, `/uploads/${file.filename}`, vehicle_id, checklistId, label]
            );
        }

        // -------- Notifications --------
        const [userRows] = await connection.execute(`SELECT firstname, lastname FROM vehicle_users WHERE id = ?`, [userId]);
        const fullName = userRows.length > 0 ? `${userRows[0].firstname} ${userRows[0].lastname}` : 'Unknown User';

        const [vehicleRows] = await connection.execute(`SELECT reg_number FROM vehicle_vehicles WHERE id = ?`, [vehicle_id]);
        const reg_number = vehicleRows.length > 0 ? vehicleRows[0].reg_number : '';

        const notificationMessage = `Inspection #${checklistId} for vehicle ${reg_number} has been updated.`;
        await connection.execute(
            `INSERT INTO vehicle_notifications (user_id, message, created_at, read_status, related_checklist_id)
             VALUES (?, ?, NOW(), 0, ?)`,
            [userId, notificationMessage, checklistId]
        );

        await connection.commit();
        connection.release();

        const submittedAtFormatted = formatDateToDDMMYYYY_HHMM(new Date());

        // -------- Emit updated inspection including trailer_id --------
        io.emit('inspection-updated', {
            id: checklistId,
            reg_number,
            submitted_at: submittedAtFormatted,
            has_defects: hasDefects ? 'Yes' : 'No',
            defect_count: newDefects.length,
            notes: comment || '',
            vehicle_id,
            trailer_id: trailer_id || null,
            user_id: userId,
            mileage
        });

        io.emit('notification-created', {
            user_id: userId,
            message: notificationMessage,
            created_at: new Date().toISOString(),
            related_checklist_id: checklistId,
            full_name: fullName,
        });

        res.status(200).json({ message: 'Inspection updated', checklist_id: checklistId });

    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});







app.get('/api/inspections', authRequired, async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const sql = `
            SELECT
                vc.id,
                vc.vehicle_id,
                vc.trailer_id,
                vc.user_id,
                vc.submitted_at,
                vc.notes,
                vc.mileage,
                vc.modified_at,
                vc.modified_by,
                CONCAT(vu.firstname, ' ', vu.lastname) AS user_full_name,
                vv.reg_number AS vehicle_reg_number,
                vt.reg_number AS trailer_reg_number,
                CONCAT(vum.firstname, ' ', vum.lastname) AS modified_by_full_name,
                COALESCE(defects_sub.defect_count, 0) AS defect_count,
                defects_sub.defect_labels,
                fuel_levels_sub.fuel_levels
            FROM vehicle_checklists AS vc
            LEFT JOIN vehicle_users AS vu 
                ON vc.user_id = vu.id
            LEFT JOIN vehicle_vehicles AS vv 
                ON vc.vehicle_id = vv.id
            LEFT JOIN vehicle_trailers AS vt 
                ON vc.trailer_id = vt.id
            LEFT JOIN vehicle_users AS vum
                ON vc.modified_by = vum.id
                
            -- Subquery for Defects (exclude startup checks)
            LEFT JOIN (
                SELECT
                    vcr.checklist_id,
                    COUNT(vcr.id) AS defect_count,
                    GROUP_CONCAT(DISTINCT vct.label ORDER BY vct.position SEPARATOR ', ') AS defect_labels
                FROM vehicle_checklist_responses AS vcr
                JOIN vehicle_checklist_templates AS vct 
                    ON vcr.template_item_id = vct.id
                WHERE vcr.is_defective = 1
                  AND vct.section IN ('INTERIOR', 'EXTERIOR')
                GROUP BY vcr.checklist_id
            ) AS defects_sub ON vc.id = defects_sub.checklist_id

            -- Subquery for Fuel Levels (startup checks only)
            LEFT JOIN (
                SELECT
                    vcf.checklist_id,
                    GROUP_CONCAT(
                        DISTINCT CONCAT(vct_fl.label, ': ', vcf.fuel_level)
                        ORDER BY vct_fl.position SEPARATOR ', '
                    ) AS fuel_levels
                FROM vehicle_checklist_fuel_levels AS vcf
                JOIN vehicle_checklist_templates AS vct_fl 
                    ON vcf.template_item_id = vct_fl.id
                WHERE vct_fl.section = 'STARTUP CHECKS'
                GROUP BY vcf.checklist_id
            ) AS fuel_levels_sub ON vc.id = fuel_levels_sub.checklist_id

            GROUP BY vc.id
            ORDER BY vc.submitted_at DESC;
        `;

        const [rows] = await connection.execute(sql);
        connection.release();

        // Format fields and set has_defects based on defect_count
        rows.forEach(row => {
            row.submitted_at = formatDateToDDMMYYYY_HHMM(row.submitted_at);
            row.modified_at = row.modified_at ? formatDateToDDMMYYYY_HHMM(row.modified_at) : 'N/A';
            row.has_defects = row.defect_count > 0 ? 'Yes' : 'No';
             // 👇 Ensure trailer_reg_number always has a value
    row.trailer_reg_number = row.trailer_reg_number || 'N/A';
        });

        res.json({ inspections: rows });
    } catch (err) {
        if (connection) connection.release();
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});






//Delete specfic inspection:

app.delete('/api/inspections/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Delete related responses
    await connection.execute(
      `DELETE FROM vehicle_checklist_responses WHERE checklist_id = ?`,
      [id]
    );

    // Delete related media
    await connection.execute(
      `DELETE FROM vehicle_media WHERE checklist_id = ?`,
      [id]
    );

    // Delete related fuel/startup levels
    await connection.execute(
      `DELETE FROM vehicle_checklist_fuel_levels WHERE checklist_id = ?`,
      [id]
    );

    // Delete checklist header
    const [result] = await connection.execute(
      `DELETE FROM vehicle_checklists WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Inspection not found' });
    }

    await connection.commit();
    connection.release();

    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Error deleting inspection:', error);
    res.status(500).json({ error: 'Server error' });
  }
});





app.get('/api/inspections/vehicle/:vehicleId', authRequired, async (req, res) => {
  let connection;
  try {
    const { vehicleId } = req.params;
    connection = await db.getConnection();

    const sql = `
      SELECT
        vc.id,
        vc.vehicle_id,
        vc.user_id,
        vc.submitted_at,
        vc.has_defects,
        vc.notes,
        CONCAT(vu.firstname, ' ', vu.lastname) AS user_full_name,
        vv.reg_number,
        COUNT(vcr.id) AS defect_count,
        IFNULL(GROUP_CONCAT(vct.label ORDER BY vct.position SEPARATOR ', '), '') AS defect_labels
      FROM vehicle_checklists AS vc
      LEFT JOIN vehicle_users AS vu ON vc.user_id = vu.id
      LEFT JOIN vehicle_vehicles AS vv ON vc.vehicle_id = vv.id
      LEFT JOIN vehicle_checklist_responses AS vcr ON vc.id = vcr.checklist_id AND vcr.is_defective = 1
      LEFT JOIN vehicle_checklist_templates AS vct ON vcr.template_item_id = vct.id
      WHERE vc.vehicle_id = ?
      GROUP BY vc.id
      ORDER BY vc.submitted_at DESC
    `;

    const [rows] = await connection.execute(sql, [vehicleId]);
    connection.release();

    rows.forEach(row => {
      row.submitted_at = formatDateToDDMMYYYY_HHMM(row.submitted_at);
      row.has_defects = formatHasDefects(row.has_defects);
    });

    res.json({ inspections: rows });
  } catch (err) {
    if (connection) connection.release();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


//FETCH INSPECTION PER USER
app.get('/api/inspections/user/:userId', authRequired, async (req, res) => {
  let connection;
  try {
    const { userId } = req.params;
    connection = await db.getConnection();

    const sql = `
      SELECT
        vc.id,
        vc.vehicle_id,
        vc.user_id,
        vc.submitted_at,
        vc.has_defects,
        vc.notes,
        CONCAT(vu.firstname, ' ', vu.lastname) AS user_full_name,
        vv.reg_number,
        COUNT(
          CASE
            WHEN vct.label NOT IN ('AdBlue level', 'Fuel level', 'Oil level')
            THEN vcr.id
          END
        ) AS defect_count,
        IFNULL(
          GROUP_CONCAT(
            CASE
              WHEN vct.label NOT IN ('AdBlue level', 'Fuel level', 'Oil level')
              THEN vct.label
            END
            ORDER BY vct.position SEPARATOR ', '
          ), ''
        ) AS defect_labels
      FROM vehicle_checklists AS vc
      LEFT JOIN vehicle_users AS vu ON vc.user_id = vu.id
      LEFT JOIN vehicle_vehicles AS vv ON vc.vehicle_id = vv.id
      LEFT JOIN vehicle_checklist_responses AS vcr
        ON vc.id = vcr.checklist_id AND vcr.is_defective = 1
      LEFT JOIN vehicle_checklist_templates AS vct
        ON vcr.template_item_id = vct.id
      WHERE vc.user_id = ?
      GROUP BY vc.id
      ORDER BY vc.submitted_at DESC
    `;

    const [rows] = await connection.execute(sql, [userId]);
    connection.release();

    rows.forEach(row => {
      row.submitted_at = formatDateToDDMMYYYY_HHMM(row.submitted_at);
      row.has_defects = formatHasDefects(row.has_defects);
    });

    res.json({ inspections: rows });
  } catch (err) {
    if (connection) connection.release();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});






//Get Detail view by id and history alongside
app.get('/api/inspections/:id', authRequired, async (req, res) => {
    const checklistId = req.params.id;
    let connection;
    try {
        connection = await db.getConnection();

        // 1. Checklist header + vehicle reg_number + user full name
       // 1. Checklist header + vehicle reg_number + trailer reg_number + user full name
const [[checklist]] = await connection.execute(
    `SELECT 
        vc.id, vc.vehicle_id, vc.trailer_id, vc.user_id, vc.submitted_at, vc.has_defects, vc.notes, vc.defect_number, vc.mileage,
        vc.modified_at, vc.modified_by,
        vv.reg_number AS vehicle_reg_number,
        vt.reg_number AS trailer_reg_number,
        CONCAT(vu.firstname, ' ', vu.lastname) AS user_full_name, vu.signature,
        CONCAT(vum.firstname, ' ', vum.lastname) AS modified_by_full_name
    FROM vehicle_checklists AS vc
    LEFT JOIN vehicle_vehicles AS vv ON vc.vehicle_id = vv.id
    LEFT JOIN vehicle_trailers AS vt ON vc.trailer_id = vt.id
    LEFT JOIN vehicle_users AS vu ON vc.user_id = vu.id
    LEFT JOIN vehicle_users AS vum ON vc.modified_by = vum.id
    WHERE vc.id = ?`,
    [checklistId]
);


        if (!checklist) {
            connection.release();
            return res.status(404).json({ error: 'Checklist not found' });
        }

        // 2. Checklist responses + template info
        const [responses] = await connection.execute(
            `SELECT 
                vcr.template_item_id,
                vcr.is_defective,
                vcr.notes AS response_notes,
                vct.section,
                vct.label
            FROM vehicle_checklist_responses AS vcr
            LEFT JOIN vehicle_checklist_templates AS vct
                ON vcr.template_item_id = vct.id
            WHERE vcr.checklist_id = ?`,
            [checklistId]
        );

        // 3. Per-defect comments
        const [comments] = await connection.execute(
            `SELECT template_item_id, comment
            FROM vehicle_checklist_comments
            WHERE checklist_id = ?`,
            [checklistId]
        );

        const commentsMap = {};
        comments.forEach(c => {
            if (!commentsMap[c.template_item_id]) commentsMap[c.template_item_id] = [];
            commentsMap[c.template_item_id].push(c.comment);
        });

        const responsesWithComments = responses.map(r => ({
            ...r,
            comments: commentsMap[r.template_item_id] || []
        }));

        // 4. Media grouped by label
        const [media] = await connection.execute(
            `SELECT id, file_path, uploaded_at, label
            FROM vehicle_media
            WHERE checklist_id = ?`,
            [checklistId]
        );

        const mediaByLabel = media.reduce((acc, item) => {
            if (!acc[item.label]) acc[item.label] = [];
            acc[item.label].push(item);
            return acc;
        }, {});

        // 5. Fuel/adblue/oil levels
        const [fuelLevels] = await connection.execute(
            `SELECT 
                vclf.template_item_id,
                vclf.fuel_level,
                vct.label
            FROM vehicle_checklist_fuel_levels AS vclf
            LEFT JOIN vehicle_checklist_templates AS vct ON vclf.template_item_id = vct.id
            WHERE vclf.checklist_id = ?`,
            [checklistId]
        );

        const normalizedFuelLevels = {};
        fuelLevels.forEach(({ template_item_id, fuel_level, label }) => {
            const labelLower = label.toLowerCase();
            if (template_item_id === 13 || labelLower.includes('adblue')) {
                normalizedFuelLevels.adblueLevel = fuel_level;
            } else if (template_item_id === 27 || labelLower.includes('fuel level')) {
                normalizedFuelLevels.fuelLevel = fuel_level;
            } else if (labelLower.includes('oil')) {
                normalizedFuelLevels.oilLevel = fuel_level;
            }
        });

        // 6. Audit history
  // 6. Audit history
let [history] = await connection.execute(
    `SELECT 
        vca.id AS audit_id,
        vca.field_name,
        vca.old_value,
        vca.new_value,
        vca.changed_at,
        CONCAT(vu.firstname, ' ', vu.lastname) AS changed_by
    FROM vehicle_checklist_audit AS vca
    LEFT JOIN vehicle_users AS vu ON vca.changed_by = vu.id
    WHERE vca.checklist_id = ?
    ORDER BY vca.changed_at ASC`,
    [checklistId]
);

// Map trailer_id values to reg_number
const trailerIdsToFetch = new Set();
history.forEach(h => {
    if (h.field_name === 'trailer_id') {
        if (h.old_value) trailerIdsToFetch.add(h.old_value);
        if (h.new_value) trailerIdsToFetch.add(h.new_value);
    }
});

let trailerMap = {};
if (trailerIdsToFetch.size > 0) {
    const [trailers] = await connection.execute(
        `SELECT id, reg_number FROM vehicle_trailers WHERE id IN (${[...trailerIdsToFetch].map(() => '?').join(',')})`,
        [...trailerIdsToFetch]
    );
    trailers.forEach(t => {
        trailerMap[t.id] = t.reg_number;
    });
}

// Replace trailer_id values with human-readable reg_number
history = history.map(h => {
    if (h.field_name === 'trailer_id') {
        return {
            ...h,
            old_value: h.old_value ? trailerMap[h.old_value] || h.old_value : null,
            new_value: h.new_value ? trailerMap[h.new_value] || h.new_value : null,
            field_name: 'Trailer'
        };
    }
    return h;
});

// 7. Optional: make field names human-readable for other fields
const historyFormatted = history.map(h => ({
    ...h,
    field_name: h.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));


        connection.release();

        res.json({
            checklist,
            responses: responsesWithComments,
            mediaByLabel,
            fuelLevels: normalizedFuelLevels,
            history: historyFormatted
        });

    } catch (err) {
        if (connection) connection.release();
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});








//Drive Dash board 
app.get('/api/driver-inspections', authRequired, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();

    const sql = `
      SELECT
        vc.id,
        vc.vehicle_id,
        vc.user_id,
        vc.submitted_at,
        vc.has_defects,
        vc.notes,
        CONCAT(vu.firstname, ' ', vu.lastname) AS user_full_name,
        vv.reg_number,
        COUNT(vcr.id) AS defect_count,
        IFNULL(GROUP_CONCAT(vct.label ORDER BY vct.position SEPARATOR ', '), '') AS defect_labels
      FROM vehicle_checklists AS vc
      LEFT JOIN vehicle_users AS vu ON vc.user_id = vu.id
      LEFT JOIN vehicle_vehicles AS vv ON vc.vehicle_id = vv.id
      LEFT JOIN vehicle_checklist_responses AS vcr ON vc.id = vcr.checklist_id AND vcr.is_defective = 1
      LEFT JOIN vehicle_checklist_templates AS vct ON vcr.template_item_id = vct.id
      WHERE vc.user_id = ?
      GROUP BY vc.id
      ORDER BY vc.submitted_at DESC
    `;

const [rows] = await connection.execute(sql, [req.user.uid]);
    connection.release();

    rows.forEach(row => {
      row.submitted_at = formatDateToDDMMYYYY_HHMM(row.submitted_at);
      row.has_defects = formatHasDefects(row.has_defects);
    });

    res.json({ inspections: rows });
  } catch (err) {
    if (connection) connection.release();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

//Add new vehicle
app.post('/api/newvehicles', authRequired, async (req, res) => {
  const { reg_number, make, model, year, mot_expiry_date, pmi_date } = req.body;

  // Only admin/supervisor can add vehicles
  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorized to add vehicles.' });
  }

  // Require only reg_number and mot_expiry_date
  if (!reg_number || !mot_expiry_date) {
    return res.status(400).json({ message: 'Registration number and MOT expiry date are required.' });
  }

  try {
    const sql = `
      INSERT INTO vehicle_vehicles (reg_number, make, model, year, mot_expiry_date, pmi_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [
      reg_number,
      make || null,
      model || null,
      year || null,
      mot_expiry_date,
      pmi_date || null, // new PMI field
    ]);

    res.status(201).json({ message: 'Vehicle added successfully.' });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});


app.patch('/api/vehicles/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorized to update vehicles.' });
  }

  try {
    const fields = Object.keys(updates)
      .map(field => `${field} = ?`)
      .join(', ');

    const values = Object.values(updates);

    await db.execute(
      `UPDATE vehicle_vehicles SET ${fields} WHERE id = ?`,
      [...values, id]
    );

    res.json({ message: 'Vehicle updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});


//Fect==tch notifications
app.get('/api/notifications', authRequired, async (req, res) => {
  const userId = req.user.uid;
  try {
    const [rows] = await db.execute(`
      SELECT vn.*, 
             CONCAT(vu.firstname, ' ', vu.lastname) AS full_name,
             CASE WHEN vnr.id IS NOT NULL THEN 1 ELSE 0 END AS read_status
      FROM vehicle_notifications vn
      JOIN vehicle_users vu ON vn.user_id = vu.id
      LEFT JOIN vehicle_notification_reads vnr 
             ON vnr.notification_id = vn.id AND vnr.user_id = ?
      ORDER BY vn.created_at DESC
    `, [userId]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

//Notification count
// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', authRequired, async (req, res) => {
  const userId = req.user.uid;
  const notifId = req.params.id;
  try {
    await db.execute(`
      INSERT IGNORE INTO vehicle_notification_reads (notification_id, user_id)
      VALUES (?, ?)
    `, [notifId, userId]);

    // emit for this user only
    io.to(`user:${userId}`).emit('notification-read');

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


//Fetch  unread count
app.get('/api/notifications/unread-count', authRequired, async (req, res) => {
  const userId = req.user.uid;

  try {
    const [[{ count }]] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM vehicle_notifications vn
       WHERE NOT EXISTS (
         SELECT 1
         FROM vehicle_notification_reads vnr
         WHERE vnr.notification_id = vn.id
         AND vnr.user_id = ?
       )`,
      [userId]
    );
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

////////////////////////////
/*

USER SIGNATURE
*/
///////////////////////
// Save/Update User Signature
app.post('/api/users/signature', authRequired, async (req, res) => {
    const { signature } = req.body;

    if (!signature) {
        return res.status(400).json({ message: 'Signature is required.' });
    }

    try {
        const sql = `
            UPDATE vehicle_users
            SET signature = ?
            WHERE id = ?
        `;
        await db.execute(sql, [signature, req.user.uid]);

        res.status(200).json({ message: 'Signature saved successfully.', signature });
    } catch (error) {
        console.error('Error saving signature:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Get Current User Signature
app.get('/api/signature/:id', authRequired, async (req, res) => {
  const userId = Number(req.params.id);
  
  // Optional: Check if the logged-in user can access this userId signature
  // For example, only allow if req.user.uid === userId or admin/supervisor role
  if (req.user.uid !== userId && !['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorized to view this signature.' });
  }

  try {
    const sql = `
      SELECT signature
      FROM vehicle_users
      WHERE id = ?
    `;
    const [rows] = await db.execute(sql, [userId]);

    if (rows.length > 0) {
      return res.status(200).json({ signature: rows[0].signature });
    } else {
      return res.status(404).json({ message: 'Signature not found for this user.' });
    }
  } catch (error) {
    console.error('Error fetching signature:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});


// Update trailer
app.put('/api/trailers/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const { reg_number, make, model, year, mot_expiry_date, pmi_date } = req.body;

  try {
    await db.execute(
      `UPDATE vehicle_trailers
       SET reg_number = ?, make = ?, model = ?, year = ?, mot_expiry_date = ?, pmi_date = ?
       WHERE id = ?`,
      [reg_number, make, model, year, mot_expiry_date, pmi_date || null, id]
    );
    res.json({ message: 'Trailer updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all trailers
app.get('/api/trailers', authRequired, async (req, res) => {
  try {
    const [trailers] = await db.execute(`
      SELECT id, reg_number, make, model, year, mot_expiry_date, pmi_date
      FROM vehicle_trailers
      ORDER BY id ASC
    `);

    res.json(trailers);
  } catch (error) {
    console.error('Error fetching trailers:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Add new trailer
app.post('/api/newtrailers', authRequired, async (req, res) => {
  const { reg_number, make, model, year, mot_expiry_date, pmi_date } = req.body;

  if (!reg_number || !mot_expiry_date) {
    return res.status(400).json({ message: 'Reg number and MOT expiry date are required.' });
  }

  try {
    await db.execute(
      `INSERT INTO vehicle_trailers (reg_number, make, model, year, mot_expiry_date, pmi_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reg_number, make || null, model || null, year || null, mot_expiry_date, pmi_date || null]
    );
    res.json({ message: 'Trailer added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get single trailer by ID
app.get('/api/trailers/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT id, reg_number, make, model, year, mot_expiry_date, pmi_date 
       FROM vehicle_trailers 
       WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Trailer not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching trailer:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/trailersbyreg?q=<search>
app.get('/api/trailersbyreg', authRequired, async (req, res) => {
    const searchQuery = req.query.q || '';
    if (!searchQuery.trim()) return res.json([]);

    let connection;
    try {
        connection = await db.getConnection();

        // Assuming you have a 'trailers' table or 'vehicle_vehicles' with a 'is_trailer' flag
        const [rows] = await connection.execute(
            `SELECT id, reg_number
             FROM vehicle_trailers 
             WHERE reg_number LIKE ?
             ORDER BY reg_number ASC
             LIMIT 20`,
            [`%${searchQuery}%`]
        );

        connection.release();
        res.json(rows);
    } catch (err) {
        if (connection) connection.release();
        console.error('Failed to fetch trailers:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


