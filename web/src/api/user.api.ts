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
  has_avatar: boolean;
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

/**
 * Upload (or replace) the current user's profile picture.
 * Accepts a JPG, PNG or WebP image up to 2MB.
 */
export async function uploadUserAvatar(file: File): Promise<UserProfile> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await getAxiosInstance().post<UserProfile>(
      "/profile/avatar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to upload avatar");
  }
}

/**
 * Fetch a user's profile picture as a Blob. Works for any user (avatars are
 * visible to any authenticated user, same as usernames), including the
 * current user — just pass their own id.
 */
export async function fetchUserAvatarBlob(userId: number): Promise<Blob> {
  try {
    const response = await getAxiosInstance().get(`/users/${userId}/avatar`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to fetch avatar");
  }
}

/**
 * Remove the current user's profile picture.
 */
export async function deleteUserAvatar(): Promise<UserProfile> {
  try {
    const response = await getAxiosInstance().delete<UserProfile>(
      "/profile/avatar"
    );
    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Failed to remove avatar");
  }
}
