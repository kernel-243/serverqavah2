/**
 * Development-only logging utility
 * Logs are only displayed in development mode to keep production clean
 */
export const devLog = {
  /**
   * Log general information (only in development)
   */
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },

  /**
   * Log error information (only in development)
   */
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(...args)
    }
  },

  /**
   * Log warning information (only in development)
   */
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args)
    }
  },

  /**
   * Log info information (only in development)
   */
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args)
    }
  },

  /**
   * Log debug information (only in development and when DEBUG is enabled)
   */
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG === 'true') {
      console.debug(...args)
    }
  },

  /**
   * Log API requests (only in development)
   */
  api: (method: string, url: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API ${method.toUpperCase()}: ${url}`, data ? data : '')
    }
  },

  /**
   * Log API responses (only in development)
   */
  response: (url: string, response: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response from ${url}:`, response)
    }
  }
}

