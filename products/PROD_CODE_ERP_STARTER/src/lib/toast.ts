/**
 * Toast Notification System
 * Professional notifications for all user feedback
 * Replaces ALL browser alert() calls with beautiful toasts
 */

import { toast } from 'sonner';

// Success toast
export const showSuccess = (message: string, description?: string) => {
  return toast.success(message, {
    description,
    duration: 4000,
  });
};

// Error toast
export const showError = (message: string, description?: string) => {
  return toast.error(message, {
    description,
    duration: 5000,
  });
};

// Info toast
export const showInfo = (message: string, description?: string) => {
  return toast.info(message, {
    description,
    duration: 4000,
  });
};

// Warning toast
export const showWarning = (message: string, description?: string) => {
  return toast.warning(message, {
    description,
    duration: 4000,
  });
};

// Loading toast (returns ID to dismiss later)
export const showLoading = (message: string) => {
  return toast.loading(message);
};

// Dismiss a specific toast
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

// Promise-based toast for async operations
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: (data) => {
      if (typeof messages.success === 'function') {
        return messages.success(data);
      }
      return messages.success;
    },
    error: (error) => {
      if (typeof messages.error === 'function') {
        return messages.error(error);
      }
      return messages.error;
    },
  });
};

// Custom action toast with button
export const showAction = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  onDismiss?: () => void
) => {
  return toast(message, {
    action: {
      label: actionLabel,
      onClick: onAction,
    },
    onDismiss,
    duration: 8000,
  });
};

// Feature not available toast (for "coming soon" features)
export const showFeatureNotAvailable = (featureName?: string) => {
  const message = featureName
    ? `${featureName} is being finalized`
    : 'This feature is being finalized';

  return toast.info(message, {
    description: 'This feature will be available in the next update.',
    duration: 3000,
  });
};

// Network error toast with retry option
export const showNetworkError = (onRetry?: () => void) => {
  return toast.error('Network connection failed', {
    description: 'Please check your internet connection and try again.',
    action: onRetry ? {
      label: 'Retry',
      onClick: onRetry,
    } : undefined,
    duration: 6000,
  });
};

// Form validation error toast
export const showValidationError = (errors: string[]) => {
  const message = 'Please fix the following errors';
  const description = errors.join(', ');

  return toast.error(message, {
    description,
    duration: 6000,
  });
};

// Success with view action
export const showSuccessWithAction = (
  message: string,
  actionLabel: string,
  onAction: () => void
) => {
  return toast.success(message, {
    action: {
      label: actionLabel,
      onClick: onAction,
    },
    duration: 8000,
  });
};

// Delete confirmation with undo
export const showDeleteSuccess = (
  itemName: string,
  onUndo?: () => void
) => {
  return toast.success(`${itemName} deleted successfully`, {
    action: onUndo ? {
      label: 'Undo',
      onClick: onUndo,
    } : undefined,
    duration: 5000,
  });
};

// Copy to clipboard toast
export const showCopySuccess = (text: string = 'Text') => {
  return toast.success(`${text} copied to clipboard`, {
    duration: 2000,
  });
};

// Save success toast
export const showSaveSuccess = (itemName: string = 'Changes') => {
  return toast.success(`${itemName} saved successfully`, {
    duration: 3000,
  });
};

// Update success toast
export const showUpdateSuccess = (itemName: string = 'Item') => {
  return toast.success(`${itemName} updated successfully`, {
    duration: 3000,
  });
};

// Create success toast with view action
export const showCreateSuccess = (
  itemName: string,
  onView?: () => void
) => {
  return toast.success(`${itemName} created successfully`, {
    action: onView ? {
      label: 'View',
      onClick: onView,
    } : undefined,
    duration: 4000,
  });
};

// Permission denied toast
export const showPermissionDenied = (action?: string) => {
  const message = action
    ? `You don't have permission to ${action}`
    : 'Permission denied';

  return toast.error(message, {
    description: 'Please contact your administrator for access.',
    duration: 5000,
  });
};

// Session expired toast
export const showSessionExpired = (onLogin?: () => void) => {
  return toast.error('Your session has expired', {
    description: 'Please log in again to continue.',
    action: onLogin ? {
      label: 'Log In',
      onClick: onLogin,
    } : undefined,
    duration: 10000,
  });
};

// Payment received toast (for invoice payments)
export const showPaymentReceived = (amount: string) => {
  return toast.success(`Payment of ${amount} received`, {
    duration: 4000,
    position: 'bottom-right',
  });
};

// Delete success toast (simpler version)
export const deleteSuccess = (itemName: string = 'Item') => {
  return toast.success(`${itemName} deleted successfully`, {
    duration: 3000,
    position: 'top-center',
  });
};

// AI insight toast (for AI-powered features)
export const showAIInsight = (title: string, message: string) => {
  return toast.message(title, {
    description: message,
    duration: 5000,
    position: 'top-right',
    icon: '🤖',
  });
};

// Legacy named exports for backwards compatibility
export const success = showSuccess;
export const error = showError;
export const info = showInfo;
export const warning = showWarning;

// Export all functions as default object for easy importing
const toastUtils = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  dismiss: dismissToast,
  promise: toastPromise,
  action: showAction,
  featureNotAvailable: showFeatureNotAvailable,
  networkError: showNetworkError,
  validationError: showValidationError,
  successWithAction: showSuccessWithAction,
  deleteSuccess: showDeleteSuccess,
  copySuccess: showCopySuccess,
  saveSuccess: showSaveSuccess,
  updateSuccess: showUpdateSuccess,
  createSuccess: showCreateSuccess,
  permissionDenied: showPermissionDenied,
  sessionExpired: showSessionExpired,
  paymentReceived: showPaymentReceived,
  showAIInsight: showAIInsight,
};

export default toastUtils;
