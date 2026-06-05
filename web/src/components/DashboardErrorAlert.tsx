import { getQueryParam } from "@/utils/query-params";
import { CustomAlert } from "@/components/CustomAlert";

const ERROR_CONFIG = {
  forbidden: {
    title: "Access Denied",
    message: "You do not have permission to access this resource.",
    variant: "error" as const,
  },
  unauthorized: {
    title: "Unauthorized",
    message: "Please log in again to continue.",
    variant: "warning" as const,
  },
  not_found: {
    title: "Not Found",
    message: "The requested resource could not be found.",
    variant: "error" as const,
  },
  server_error: {
    title: "Server Error",
    message: "An unexpected error occurred. Please try again later.",
    variant: "error" as const,
  },
} as const;

export function DashboardErrorAlert() {
  const errorParam = getQueryParam("error");

  if (!errorParam) return null;

  const config = ERROR_CONFIG[errorParam as keyof typeof ERROR_CONFIG];
  if (!config) return null;

  return (
    <CustomAlert
      title={config.title}
      variant={config.variant}
      style={{ maxWidth: 600, margin: "0 auto" }}
    >
      {config.message}
    </CustomAlert>
  );
}
