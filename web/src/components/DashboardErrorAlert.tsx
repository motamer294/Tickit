/**
 * Secure Dashboard Error Display Component
 * Uses safe query param validation to prevent XSS
 */

import { Alert, Container, Text } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { getQueryParam } from '@/utils/query-params'

export function DashboardErrorAlert() {
  const errorParam = getQueryParam('error');

  if (!errorParam) return null;

  const errorConfig = {
    forbidden: {
      icon: 'solar:lock-bold-duotone',
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
      color: 'red' as const,
    },
    unauthorized: {
      icon: 'solar:login-2-bold-duotone',
      title: 'Unauthorized',
      message: 'Please log in again to continue.',
      color: 'orange' as const,
    },
    not_found: {
      icon: 'solar:magnifer-bold-duotone',
      title: 'Not Found',
      message: 'The requested resource could not be found.',
      color: 'red' as const,
    },
    server_error: {
      icon: 'solar:bug-bold-duotone',
      title: 'Server Error',
      message: 'An unexpected error occurred. Please try again later.',
      color: 'red' as const,
    },
  };

  const config = errorConfig[errorParam];
  if (!config) return null;

  return (
    <Container size="sm" py="lg">
      <Alert
        icon={<Icon icon={config.icon} width={20} />}
        title={config.title}
        color={config.color}
        variant="light"
      >
        <Text>{config.message}</Text>
      </Alert>
    </Container>
  );
}
