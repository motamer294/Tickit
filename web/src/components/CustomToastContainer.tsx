import { useEffect, useRef } from "react";
import { Box, Stack } from "@mantine/core";
import { CustomAlert } from "@/components/CustomAlert";
import { useNotificationStore } from "@/store/notification.store";

//  Constants 

const TOAST_WIDTH = 340;
const TOAST_GAP = 10;
const TOP_OFFSET = 20;
const RIGHT_OFFSET = 20;

//  Component 

export function CustomToastContainer() {
  const notifications = useNotificationStore((s) => s.notifications);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);

  // Only show custom-alert toasts
  const toasts = notifications.filter((n) => n.isCustomAlert);

  // Track mounted toasts so we only start timers once per id
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timers.current[toast.id]) return; // already scheduled
      const duration = toast.autoCloseDuration ?? 4000;
      timers.current[toast.id] = setTimeout(() => {
        deleteNotification(toast.id);
        delete timers.current[toast.id];
      }, duration);
    });

    // Clean up timers for toasts that were already manually dismissed
    Object.keys(timers.current).forEach((id) => {
      if (!toasts.find((t) => t.id === id)) {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
      }
    });
  }, [toasts, deleteNotification]);

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      {/* Global keyframe — injected once */}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(60px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0;    }
        }
      `}</style>

      <Box
        style={{
          position: "fixed",
          top: TOP_OFFSET,
          right: RIGHT_OFFSET,
          zIndex: 9999,
          width: TOAST_WIDTH,
          pointerEvents: "auto",
        }}
      >
        <Stack gap={TOAST_GAP}>
          {/* Newest toast on top — reverse so newest is first */}
          {[...toasts].reverse().map((toast) => (
            <Box
              key={toast.id}
              style={{
                animation: "toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                borderRadius: 12,
                cursor: "pointer",
                transition: "box-shadow .15s, transform .15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = "0 6px 28px rgba(0,0,0,0.12)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                el.style.transform = "translateY(0)";
              }}
              onClick={() => deleteNotification(toast.id)}
            >
              <CustomAlert
                variant={toast.alertVariant ?? "info"}
                title={toast.title}
                duration={toast.autoCloseDuration ?? 4000}
                onDismiss={() => deleteNotification(toast.id)}
              >
                {toast.message || undefined}
              </CustomAlert>
            </Box>
          ))}
        </Stack>
      </Box>
    </>
  );
}
