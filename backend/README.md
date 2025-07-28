
# TaskFlow Backend

Express.js backend with PostgreSQL for the TaskFlow application.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL:**
   - Install PostgreSQL on your system
   - Create a database named `taskflow`
   - Create `.env` and add your database credentials

3. **Set up database schema:**
   ```bash
   npm run setup-db
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Environment Variables

Create a `.env` file with:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=taskflow
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your-very-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=3001
```

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Users (Admin only)
- `GET /api/users` - Get all users
- `PATCH /api/users/:id/status` - Approve/reject user

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id/status` - Update task status

### Health
- `GET /api/health` - Health check

## Database Schema

- **users**: User accounts with authentication
- **tasks**: Tasks with assignee, creator, and status tracking
- **Hierarchical structure**: Tasks can have subtasks via parent_task_id

## Features

- JWT authentication
- Role-based access control (admin/user)
- Email notifications for task assignments
- Task hierarchy (parent/child tasks)
- Input validation
- Password hashing
- CORS support
