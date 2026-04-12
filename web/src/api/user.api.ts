import { getAxiosInstance, APIError } from "./config";

export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "MANAGER" | "EMPLOYEE" | "CUSTOMER";
  date_joined: string;
  created_at: string;
}

export interface UserStats {
  total_tickets: number;
  tickets_open: number;
  tickets_in_progress: number;
  tickets_resolved: number;
  avg_resolution_time_hours: number;
  member_since_days: number;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Fetch current user's profile information
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  try {
    const response = await getAxiosInstance().get<UserProfile>("/profile");
    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to fetch user profile");
  }
}

/**
 * Fetch current user's statistics
 */
export async function fetchUserStats(): Promise<UserStats> {
  try {
    const response = await getAxiosInstance().get<UserStats>("/profile/stats");
    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to fetch user stats");
  }
}

/**
 * Update current user's profile
 */
export async function updateUserProfile(
  data: UpdateProfilePayload
): Promise<UserProfile> {
  try {
    const response = await getAxiosInstance().patch<UserProfile>(
      "/profile",
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to update profile");
  }
}

/**
 * Change current user's password
 */
export async function changeUserPassword(
  data: ChangePasswordPayload
): Promise<void> {
  try {
    await getAxiosInstance().post("/profile/change-password", data);
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to change password");
  }
}
