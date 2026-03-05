const SUPABASE_URL = 'https://bkobvzbzhxybcugsuvjq.supabase.co';
const SUPABASE_ANON_KEY = '3cda355f332157b983f6e6b7e3841653e5771deaf0683cd24cdf611634a1d282';
const API_BASE = `${SUPABASE_URL}/functions/v1/rapid-task`;

let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// AUTH ENDPOINTS
// ============================================

export const signUp = async (
  email: string,
  password: string,
  name: string
): Promise<ApiResponse<{ user: any; session: any }>> => {
  try {
    const response = await fetch(`${API_BASE}/auth?action=signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    if (data.session) {
      setAuthToken(data.session.access_token);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const signIn = async (
  email: string,
  password: string
): Promise<ApiResponse<{ session: any }>> => {
  try {
    const response = await fetch(`${API_BASE}/auth?action=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    if (data.session) {
      setAuthToken(data.session.access_token);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// ============================================
// TASK ENDPOINTS
// ============================================

export const getTasks = async (): Promise<ApiResponse<any[]>> => {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const createTask = async (
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high',
  category: string,
  due_date: string | null
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title,
        description,
        priority,
        category,
        due_date,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const updateTask = async (
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    category?: string;
    due_date?: string | null;
    completed?: boolean;
  }
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const deleteTask = async (taskId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// ============================================
// SUBTASK ENDPOINTS
// ============================================

export const createSubtask = async (
  taskId: string,
  title: string
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const updateSubtask = async (
  subtaskId: string,
  title?: string,
  completed?: boolean
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title, completed }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const deleteSubtask = async (subtaskId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// ============================================
// FRIENDS ENDPOINTS
// ============================================

export const getFriends = async (): Promise<ApiResponse<any[]>> => {
  try {
    const response = await fetch(`${API_BASE}/friends`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const addFriend = async (
  friend_username: string
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/friends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ friend_username }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const removeFriend = async (friendId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// ============================================
// PROFILE ENDPOINTS
// ============================================

export const getProfile = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const updateProfile = async (
  updates: {
    name?: string;
    bio?: string;
    avatar_url?: string;
  }
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// ============================================
// SETTINGS ENDPOINTS
// ============================================

export const getSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

export const updateSettings = async (
  updates: {
    notifications_enabled?: boolean;
    dark_mode?: boolean;
    private_profile?: boolean;
    show_online_status?: boolean;
  }
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

// ============================================
// LOCATION ENDPOINTS
// ============================================

export const updateLocation = async (
  latitude: number,
  longitude: number,
  address: string | null,
  accuracy: number
): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        address,
        accuracy,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};
