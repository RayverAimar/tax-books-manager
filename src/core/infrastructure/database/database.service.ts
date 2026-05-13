import Database from '@tauri-apps/plugin-sql';
import type { QueryResult } from '@tauri-apps/plugin-sql';
import { getMigrations } from './migrations';

/**
 * Database Service
 * Singleton service for database operations with connection pooling and caching
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Database | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private transactionDepth = 0;

  private constructor() {}

  /**
   * Gets the singleton instance
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initializes the database connection and runs migrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // If already initializing, wait for the existing initialization
    if (this.isInitializing && this.initPromise) {
      return await this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Actually performs the initialization
   */
  private async doInitialize(): Promise<void> {
    try {
      // DB separada para dev vs prod. Ambas viven en el mismo app data dir
      // (Tauri usa el bundle identifier para resolver la ruta), pero con nombres
      // distintos para que `pnpm tauri dev` no toque la base de tu app instalada
      // de production. Cero impacto sobre updates: el binario se reemplaza pero
      // el archivo .db queda intacto en su lugar.
      const dbName = import.meta.env.DEV ? 'registro_libros_dev.db' : 'registro_libros.db';
      this.db = await Database.load(`sqlite:${dbName}`);

      // Enable foreign keys and optimize for performance
      await this.execute('PRAGMA foreign_keys = ON');
      await this.execute('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      await this.execute('PRAGMA synchronous = NORMAL'); // Balance between safety and speed
      await this.execute('PRAGMA cache_size = -64000'); // 64MB cache
      await this.execute('PRAGMA temp_store = MEMORY'); // Use memory for temp tables

      // Add busy timeout to prevent "database is locked" errors
      await this.execute('PRAGMA busy_timeout = 30000'); // Wait up to 30 seconds

      // Run migrations
      await this.runMigrations();

      this.isInitialized = true;
    } catch {
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Runs database migrations
   */
  private async runMigrations(): Promise<void> {
    // Check current schema version
    const currentVersion = await this.getSchemaVersion();

    // Import and run migrations
    const migrations = await this.loadMigrations();

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        await this.transaction(async () => {
          // Split SQL intelligently, considering BEGIN...END blocks
          const statements = this.splitSQLStatements(migration.sql);
          for (const statement of statements) {
            await this.execute(statement);
          }

          // Update schema version (already in migration SQL, but ensure it's set)
          await this.execute('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
            'schema_version',
            migration.version.toString().padStart(3, '0')
          ]);
        });
      }
    }
  }

  /**
   * Loads migration files
   */
  private async loadMigrations(): Promise<Array<{ version: number; name: string; sql: string }>> {
    // Load migrations from the migrations module
    return getMigrations();
  }

  /**
   * Gets the current schema version
   */
  private async getSchemaVersion(): Promise<number> {
    try {
      const result = await this.select<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
        'schema_version'
      ]);
      return result.length > 0 ? parseInt(result[0].value) : 0;
    } catch {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Splits SQL into statements, respecting BEGIN...END blocks (for triggers, etc.)
   * Also handles SQL comments (--) and string literals properly
   */
  private splitSQLStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inBeginEnd = 0;
    let inString = false;
    let stringChar = '';
    let inLineComment = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      // Handle line comments (--) - they end at newline
      if (!inString && char === '-' && nextChar === '-') {
        inLineComment = true;
        current += char;
        continue;
      }

      // End line comment at newline
      if (inLineComment && (char === '\n' || char === '\r')) {
        inLineComment = false;
        current += char;
        continue;
      }

      // Handle string literals (only if not in comment)
      if (!inLineComment && (char === "'" || char === '"') && (i === 0 || sql[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      // Only process keywords if not in string and not in comment
      if (!inString && !inLineComment) {
        // Check for BEGIN keyword (must be at word boundary, not part of another word)
        const restOfString = sql.substring(i);
        const prevChar = i > 0 ? sql[i - 1] : ' ';
        const isWordBoundary = /\s|;|,|\(|\)/.test(prevChar);

        if (isWordBoundary && /^BEGIN\b/i.test(restOfString)) {
          inBeginEnd++;
        }
        // Check for END keyword (must be at word boundary, not part of another word)
        else if (isWordBoundary && /^END\b/i.test(restOfString)) {
          inBeginEnd--;
        }
      }

      current += char;

      // Split on semicolon only if not in BEGIN...END, not in string, and not in comment
      if (char === ';' && inBeginEnd === 0 && !inString && !inLineComment) {
        const trimmed = current.trim();
        if (trimmed && trimmed !== '--') {
          statements.push(trimmed);
        }
        current = '';
      }
    }

    // Add any remaining SQL
    const trimmed = current.trim();
    if (trimmed && trimmed !== '--') {
      statements.push(trimmed);
    }

    return statements;
  }

  /**
   * Executes a SQL query
   */
  async execute(query: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.execute(query, params);
  }

  /**
   * Selects data from the database
   */
  async select<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.select(query, params);
  }

  /**
   * Executes a transaction with automatic rollback on error
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // Wait if database is busy
    const maxRetries = 5;
    let retries = 0;
    let lastError: unknown;

    while (retries < maxRetries) {
      this.transactionDepth++;

      try {
        if (this.transactionDepth === 1) {
          await this.execute('BEGIN IMMEDIATE');
        } else {
          await this.execute(`SAVEPOINT sp_${this.transactionDepth}`);
        }

        const result = await callback();

        if (this.transactionDepth === 1) {
          await this.execute('COMMIT');
        } else {
          await this.execute(`RELEASE SAVEPOINT sp_${this.transactionDepth}`);
        }

        this.transactionDepth--;
        return result;
      } catch (error: unknown) {
        await this.attemptRollback();
        this.transactionDepth = Math.max(0, this.transactionDepth - 1);

        // Only retry on database-is-locked errors. Any other error propagates.
        if (errorMessage(error).includes('database is locked')) {
          lastError = error;
          retries++;
          const delay = Math.min(100 * Math.pow(2, retries), 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${errorMessage(lastError)}`);
  }

  /**
   * Best-effort rollback. Swallows errors that simply mean the transaction is
   * already gone (rolled back automatically, never started, etc.).
   */
  private async attemptRollback(): Promise<void> {
    if (this.transactionDepth <= 0) return;
    try {
      if (this.transactionDepth === 1) {
        await this.execute('ROLLBACK');
      } else {
        await this.execute(`ROLLBACK TO SAVEPOINT sp_${this.transactionDepth}`);
      }
    } catch (rbErr) {
      const msg = errorMessage(rbErr);
      if (!msg.includes('cannot rollback') && !msg.includes('no transaction is active')) {
        // Log unexpected rollback failures but do not throw — the original
        // error is more useful to surface.
         
        console.warn('[DB] Rollback failed:', msg);
      }
      this.transactionDepth = 0;
    }
  }

  /**
   * Closes the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Performs database optimization (vacuum, analyze)
   */
  async optimize(): Promise<void> {
    await this.execute('VACUUM');
    await this.execute('ANALYZE');
  }
}

/**
 * Safely extracts an error message from an unknown thrown value.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    return typeof msg === 'string' ? msg : String(msg);
  }
  return String(error ?? '');
}
