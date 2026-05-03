/**
 * Settings Repository Contract
 *
 * Defines the interface for application settings operations.
 * Manages key-value pairs for app configuration.
 */

export interface SettingsRepository {
  /**
   * Gets a setting value by key
   *
   * @param key - Setting key
   * @returns The setting value if found, null otherwise
   */
  get(key: string): Promise<string | null>;

  /**
   * Sets a setting value (creates or updates)
   *
   * @param key - Setting key
   * @param value - Setting value
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Deletes a setting by key
   *
   * @param key - Setting key
   */
  delete(key: string): Promise<void>;

  /**
   * Gets all settings as a key-value object
   *
   * @returns Object with all settings
   */
  getAll(): Promise<Record<string, string>>;

  /**
   * Gets the Peru API key
   *
   * @returns The API key if found, null otherwise
   */
  getApiKey(): Promise<string | null>;

  /**
   * Saves the Peru API key
   *
   * @param apiKey - API key to save
   * @throws Error if API key is empty
   */
  setApiKey(apiKey: string): Promise<void>;
}
