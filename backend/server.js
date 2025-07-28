import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "taskflow",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Database connection error:", err);
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Simple validation helper
const validate = (rules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      if (
        rule.required &&
        (value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (typeof value !== "string" && value === ""))
      ) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value && rule.email && !/\S+@\S+\.\S+/.test(value)) {
        errors.push(`${field} must be a valid email`);
      }

      if (value && rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }

      if (value && rule.isDate && isNaN(Date.parse(value))) {
        errors.push(`${field} must be a valid date`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// User (non-admin) middleware for task operations
const requireUser = (req, res, next) => {
  if (req.user.role === "admin") {
    return res
      .status(403)
      .json({ error: "This operation is not allowed for admin users" });
  }
  next();
};

// Routes

// User Registration - Only allows 'user' role registration
app.post(
  "/api/register",
  validate({
    name: { required: true },
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
  }),
  async (req, res) => {
    const { name, email, password } = req.body;

    try {
      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user - Force role to 'user' (no admin registration allowed)
      const result = await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, status",
        [name, email, hashedPassword, "user"]
      );

      res.status(201).json({
        message: "User registered successfully. Awaiting admin approval.",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// User Login
app.post(
  "/api/login",
  validate({
    email: { required: true, email: true },
    password: { required: true },
  }),
  async (req, res) => {
    const { email, password } = req.body;

    console.log("Backend: Login attempt for email:", email);
    console.log("Backend: Request body received:", { email, password: "***" });

    try {
      console.log("Backend: Querying database for user...");
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      console.log("Backend: Database query result count:", result.rows.length);

      if (result.rows.length === 0) {
        console.log("Backend: User not found in database");
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const user = result.rows[0];
      console.log("Backend: User found in database (full user info):", user);
      console.log("Backend: User found:", {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
      });

      if (user.status !== "approved") {
        console.log("Backend: User account not approved, status:", user.status);
        return res.status(400).json({ error: "Account not approved yet" });
      }

      console.log("Backend: Verifying password...");
      const validPassword = await bcrypt.compare(password, user.password);
      console.log("Backend: Password verification result:", validPassword);

      if (!validPassword) {
        console.log("Backend: Invalid password provided");
        return res.status(400).json({ error: "Invalid credentials" });
      }

      console.log("Backend: Generating JWT token...");
      const token = jwt.sign(
        { userId: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      console.log("Backend: JWT token generated successfully", token);

      const responseData = {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username || user.name || user.email.split("@")[0],
          role: user.role,
          status: user.status,
        },
      };

      console.log("Backend: Login successful, sending response:", {
        ...responseData,
        token: "***",
      });
      res.json(responseData);
    } catch (error) {
      console.error("Backend: Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get all users (admin only) - Full user management
app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get approved users for task assignment (all authenticated users)
app.get("/api/users/approved", authenticateToken, async (req, res) => {
  try {
    console.log("Getting approved users...");
    const result = await pool.query(
      "SELECT id, name, email, role, status FROM users WHERE status = $1 ORDER BY name ASC",
      ["approved"]
    );
    console.log("Approved users found:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("Get approved users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve/Reject user (admin only)
app.patch(
  "/api/users/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const result = await pool.query(
        "UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, role, status",
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Send email notification
      const user = result.rows[0];
      if (process.env.EMAIL_USER) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `Account ${status}`,
          text: `Hi ${user.name},\n\nYour account has been ${status}.\n\nBest regards,\nTaskFlow Team`,
        };

        transporter.sendMail(mailOptions).catch(console.error);
      }

      res.json({
        message: `User ${status} successfully`,
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get tasks
app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        u1.name as assignee_name,
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query);

    // Build task hierarchy
    const tasks = result.rows.map((row) => ({
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      assigneeId: row.assignee_id?.toString(),
      assigneeName: row.assignee_name,
      createdBy: row.created_by?.toString(),
      createdByName: row.created_by_name,
      status: row.status,
      dueDate: row.due_date?.toISOString().split("T")[0],
      parentTaskId: row.parent_task_id?.toString(),
      subtasks: [],
      createdAt: row.created_at.toISOString(),
    }));

    // Build subtask relationships
    const taskMap = new Map();
    tasks.forEach((task) => taskMap.set(task.id, task));

    tasks.forEach((task) => {
      if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
        taskMap.get(task.parentTaskId).subtasks.push(task);
      }
    });

    // Return only parent tasks (subtasks are nested)
    const parentTasks = tasks.filter((task) => !task.parentTaskId);

    res.json(parentTasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create task - Only for non-admin users
app.post(
  "/api/tasks",
  authenticateToken,
  requireUser,
  validate({
    title: { required: true },
    description: { required: true },
    assigneeId: { required: true },
    dueDate: { required: true, isDate: true },
  }),
  async (req, res) => {
    const { title, description, assigneeId, dueDate, parentTaskId } = req.body;

    try {
      // If creating a subtask, verify that the current user is the assignee of the parent task
      if (parentTaskId) {
        const parentTaskResult = await pool.query(
          "SELECT assignee_id FROM tasks WHERE id = $1",
          [parentTaskId]
        );
        if (parentTaskResult.rows.length === 0) {
          return res.status(404).json({ error: "Parent task not found" });
        }

        const parentTask = parentTaskResult.rows[0];
        if (parentTask.assignee_id !== req.user.userId) {
          return res
            .status(403)
            .json({ error: "Only the assignee of a task can create subtasks" });
        }
      }

      const result = await pool.query(
        "INSERT INTO tasks (title, description, assignee_id, created_by, due_date, parent_task_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          title,
          description,
          assigneeId,
          req.user.userId,
          dueDate,
          parentTaskId || null,
        ]
      );

      // Get assignee email for notification
      const assigneeResult = await pool.query(
        "SELECT name, email FROM users WHERE id = $1",
        [assigneeId]
      );
      const assignee = assigneeResult.rows[0];

      // Send email notification
      if (process.env.EMAIL_USER && assignee) {
        const taskType = parentTaskId ? "subtask" : "task";
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: assignee.email,
          subject: `New ${
            taskType.charAt(0).toUpperCase() + taskType.slice(1)
          } Assigned`,
          text: `Hi ${assignee.name},\n\nYou have been assigned a new ${taskType}: "${title}"\n\nDescription: ${description}\nDue Date: ${dueDate}\n\nBest regards,\nTaskFlow Team`,
        };

        transporter.sendMail(mailOptions).catch(console.error);
      }

      res
        .status(201)
        .json({ message: "Task created successfully", task: result.rows[0] });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Update task status - Only for assigned users (not admin)
app.patch(
  "/api/tasks/:id/status",
  authenticateToken,
  requireUser,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      // Check if user can update this task (only assignee can update)
      const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [
        id,
      ]);
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = taskResult.rows[0];
      if (task.assignee_id !== req.user.userId) {
        return res
          .status(403)
          .json({ error: "Can only update tasks assigned to you" });
      }

      const result = await pool.query(
        "UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );

      res.json({
        message: "Task status updated successfully",
        task: result.rows[0],
      });
    } catch (error) {
      console.error("Update task status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// === TASK GROUP ENDPOINTS ===

// Get task groups for the user (groups created based on parent tasks)
app.get("/api/task-groups", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      WITH parent_tasks AS (
        SELECT DISTINCT 
          CASE 
            WHEN t.parent_task_id IS NULL THEN t.id
            ELSE t.parent_task_id
          END as parent_id
        FROM tasks t
        WHERE t.assignee_id = $1 OR t.created_by = $1
      ),
      task_groups AS (
        SELECT 
          pt.id as task_id,
          pt.title as task_title,
          pt.description as task_description,
          pt.created_by,
          u.name as created_by_name,
          pt.created_at,
          COUNT(DISTINCT CASE 
            WHEN t2.assignee_id IS NOT NULL THEN t2.assignee_id
            WHEN t2.created_by IS NOT NULL THEN t2.created_by
            ELSE pt.assignee_id
          END) as member_count
        FROM parent_tasks pts
        JOIN tasks pt ON pt.id = pts.parent_id
        JOIN users u ON pt.created_by = u.id
        LEFT JOIN tasks t2 ON (t2.parent_task_id = pt.id OR (t2.id = pt.id AND t2.parent_task_id IS NULL))
        GROUP BY pt.id, pt.title, pt.description, pt.created_by, u.name, pt.created_at
      )
      SELECT 
        CONCAT('task_', task_id) as id,
        task_id,
        task_title,
        task_description,
        created_by,
        created_by_name,
        created_at,
        member_count
      FROM task_groups
      ORDER BY created_at DESC
    `,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get task groups error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get task group members (users working on the same parent task)
app.get(
  "/api/task-groups/:groupId/members",
  authenticateToken,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const taskId = groupId.replace("task_", ""); // Remove 'task_' prefix

      const result = await pool.query(
        `
      WITH task_users AS (
        SELECT DISTINCT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          CASE WHEN t.created_by = u.id THEN 'creator' ELSE 'member' END as role,
          CASE WHEN u.id = $2 THEN true ELSE false END as is_current_user
        FROM tasks t
        JOIN users u ON (u.id = t.assignee_id OR u.id = t.created_by)
        WHERE (t.id = $1 OR t.parent_task_id = $1)
        AND u.status = 'approved'
      )
      SELECT 
        ROW_NUMBER() OVER (ORDER BY role DESC, user_name) as id,
        user_id,
        user_name,
        user_email,
        role,
        is_current_user
      FROM task_users
      ORDER BY role DESC, user_name ASC
    `,
        [taskId, req.user.userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Get task group members error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// === MESSAGE ENDPOINTS ===

// Get messages between two users
app.get("/api/messages/:otherUserId", authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    const result = await pool.query(
      `
      SELECT m.*, u.name as sender_name 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.message_type = 'direct' 
      AND ((m.sender_id = $1 AND m.receiver_id = $2) 
           OR (m.sender_id = $2 AND m.receiver_id = $1))
      ORDER BY m.created_at ASC
    `,
      [currentUserId, otherUserId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send a message
app.post(
  "/api/messages",
  authenticateToken,
  validate({
    receiverId: { required: true },
    content: { required: true },
  }),
  async (req, res) => {
    try {
      const { receiverId, content, groupId = null } = req.body;
      const senderId = req.user.userId;
      const messageType = groupId ? "group" : "direct";

      // Validate receiver exists
      const receiverCheck = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [receiverId]
      );
      if (receiverCheck.rows.length === 0) {
        return res.status(404).json({ error: "Receiver not found" });
      }

      const result = await pool.query(
        `
      INSERT INTO messages (sender_id, receiver_id, group_id, content, message_type) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `,
        [senderId, receiverId, groupId, content, messageType]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get notifications for user
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        m.id,
        'message' as type,
        'New Message' as title,
        m.content as message,
        u.name as from_user,
        m.is_read,
        m.created_at
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.receiver_id = $1 AND m.message_type = 'direct'
      ORDER BY m.created_at DESC 
      LIMIT 50
    `,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark message as read
app.patch(
  "/api/messages/:messageId/read",
  authenticateToken,
  async (req, res) => {
    try {
      const { messageId } = req.params;

      const result = await pool.query(
        "UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2 RETURNING *",
        [messageId, req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Message not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});
