const API_BASE_URL = 'http://localhost:3001/api';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface CreateTaskData {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  parentTaskId?: string;
}

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async login(data: LoginData) {
    console.log('ApiService.login: Starting login request for:', data.email);
    console.log('ApiService.login: API URL:', `${API_BASE_URL}/login`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      console.log('ApiService.login: Response status:', response.status);
      console.log('ApiService.login: Response ok:', response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.error('ApiService.login: Server error:', error);
        throw new Error(error.error || 'Login failed');
      }

      const result = await response.json();
      console.log('ApiService.login: Login successful:', { ...result, token: '***' });
      
      localStorage.setItem('authToken', result.token);
      return result;
    } catch (error) {
      console.error('ApiService.login: Network or parsing error:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:3001');
      }
      
      throw error;
    }
  }

  async register(data: RegisterData) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  }

  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async getApprovedUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/users/approved`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approved users');
      }

      return response.json();
    } catch (error) {
      console.error('getApprovedUsers error:', error);
      // Return empty array as fallback to prevent crashes
      return [];
    }
  }

  async updateUserStatus(userId: string, status: 'approved' | 'rejected') {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error('Failed to update user status');
    }

    return response.json();
  }

  async getTasks() {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    return response.json();
  }

  async createTask(data: CreateTaskData) {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create task');
    }

    return response.json();
  }

  async updateTaskStatus(taskId: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error('Failed to update task status');
    }

    return response.json();
  }

  // === GROUP METHODS ===
  async getTaskGroups() {
    try {
      const response = await fetch(`${API_BASE_URL}/task-groups`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task groups');
      }

      return response.json();
    } catch (error) {
      console.error('getTaskGroups error:', error);
      // Return empty array as fallback
      return [];
    }
  }

  async getTaskGroupMembers(groupId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/task-groups/${groupId}/members`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task group members');
      }

      return response.json();
    } catch (error) {
      console.error('getTaskGroupMembers error:', error);
      // Return empty array as fallback
      return [];
    }
  }

  // === MESSAGE METHODS ===
  async getMessages(otherUserId: string) {
    const response = await fetch(`${API_BASE_URL}/messages/${otherUserId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  async sendMessage(receiverId: string, content: string, groupId?: string) {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ receiverId, content, groupId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  }

  async getNotifications() {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return response.json();
    } catch (error) {
      console.error('getNotifications error:', error);
      // Return empty array as fallback
      return [];
    }
  }

  async markMessageAsRead(messageId: string) {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to mark message as read');
    }

    return response.json();
  }

  logout() {
    localStorage.removeItem('authToken');
  }
}

export const apiService = new ApiService();
