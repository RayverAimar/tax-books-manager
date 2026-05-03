import { DatabaseService } from '../database/database.service';
import type { SettingsRepository as SettingsRepositoryContract } from '@/core/domain/repositories';

/**
 * Settings Repository (SQLite Implementation)
 * Handles all database operations for application settings
 *
 * Implements the SettingsRepository contract defined in the domain layer.
 * Manages key-value pairs stored in the app_settings table.
 * This allows switching between different data sources (SQLite, REST API, etc.)
 * without changing the application code.
 */
export class SettingsRepository implements SettingsRepositoryContract {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Gets a setting value by key
   * Returns null if the setting doesn't exist
   */
  async get(key: string): Promise<string | null> {
    const results = await this.db.select<{ value: string }>(`SELECT value FROM app_settings WHERE key = ?`, [key]);

    return results.length > 0 ? results[0].value : null;
  }

  /**
   * Sets a setting value (creates or updates)
   * Uses INSERT OR REPLACE to handle both cases
   */
  async set(key: string, value: string): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [key, value]
    );
  }

  /**
   * Deletes a setting by key
   */
  async delete(key: string): Promise<void> {
    await this.db.execute(`DELETE FROM app_settings WHERE key = ?`, [key]);
  }

  /**
   * Gets all settings as a key-value object
   */
  async getAll(): Promise<Record<string, string>> {
    const results = await this.db.select<{ key: string; value: string }>(`SELECT key, value FROM app_settings`);

    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  // ============================================================================
  // Convenience methods for specific settings
  // ============================================================================

  /**
   * Gets the Peru API key
   * SECURITY: Currently returns plain text - should decrypt in production
   */
  async getApiKey(): Promise<string | null> {
    return this.get('peru_api_key');
  }

  /**
   * Saves the Peru API key
   * SECURITY: Currently stores plain text - should encrypt before production
   */
  async setApiKey(apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API Key no puede estar vacía');
    }
    await this.set('peru_api_key', apiKey.trim());
  }
}
