import { Modal, Stack, TextInput, Button, Group } from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import type { UpdateProfilePayload } from "../../api/user.api";
import {
  fetchUserProfile,
  updateUserProfile,
} from "../../api/user.api";
import { notifications } from "@/utils/customNotifications";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({
  open,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const initializedRef = useRef(false);

  // Fetch profile to populate form
  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    enabled: open,
  });

  // Update form when profile loads (only once)
  useEffect(() => {
    if (profile && open && !initializedRef.current) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
      });
      initializedRef.current = true;
    }
  }, [profile, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({ first_name: "", last_name: "", email: "" });
      initializedRef.current = false;
    }
  }, [open]);
  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfilePayload) => updateUserProfile(data),
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Profile updated successfully",
        color: "teal",
        icon: <Icon icon="solar:check-circle-bold-duotone" width="16" />,
      });
      onSuccess();
      onClose();
      setFormData({ first_name: "", last_name: "", email: "" });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error?.message || "Failed to update profile",
        color: "red",
        icon: <Icon icon="solar:warning-circle-bold-duotone" width="16" />,
      });
    },
  });

  const handleSubmit = () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      notifications.show({
        title: "Error",
        message: "Invalid email format",
        color: "red",
        icon: <Icon icon="solar:warning-circle-bold-duotone" width="16" />,
      });
      return;
    }

    // Prepare payload with only changed fields
    const payload: UpdateProfilePayload = {};
    if (formData.first_name || formData.first_name === "") {
      payload.first_name = formData.first_name;
    }
    if (formData.last_name || formData.last_name === "") {
      payload.last_name = formData.last_name;
    }
    if (formData.email) {
      payload.email = formData.email;
    }

    updateMutation.mutate(payload);
  };

  return (
    <Modal
      opened={open}
      onClose={() => {
        onClose();
        setFormData({ first_name: "", last_name: "", email: "" });
      }}
      title="Edit Profile"
      centered
    >
      <Stack gap="md">
        <TextInput
          label="First Name"
          placeholder="Your first name"
          value={formData.first_name}
          onChange={(e) =>
            setFormData({ ...formData, first_name: e.currentTarget.value })
          }
          disabled={updateMutation.isPending}
        />

        <TextInput
          label="Last Name"
          placeholder="Your last name"
          value={formData.last_name}
          onChange={(e) =>
            setFormData({ ...formData, last_name: e.currentTarget.value })
          }
          disabled={updateMutation.isPending}
        />

        <TextInput
          label="Email"
          placeholder="Your email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.currentTarget.value })
          }
          disabled={updateMutation.isPending}
        />

        <Group justify="flex-end" mt="xl">
          <Button
            variant="light"
            onClick={() => {
              onClose();
              setFormData({ first_name: "", last_name: "", email: "" });
            }}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
