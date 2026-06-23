/**
 * Quota Management Configuration
 *
 * Set USE_MOCK_DATA to true to bypass Firestore and use local mock data.
 * This is useful when Firestore quota is exceeded or during development.
 */
export const QUOTA_CONFIG = {
  USE_MOCK_DATA: false, // Default to true as requested since Firestore is locked
};
