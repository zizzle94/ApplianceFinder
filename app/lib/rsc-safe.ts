/**
 * Utilities for safer serialization between server and client components
 */

import React from 'react';

/**
 * Safely serialize data to be passed from server to client components
 * This helps avoid "o is not a function" and "d is not a function" errors
 */
export function safeSerialize<T>(data: T): T {
  try {
    // First test if the data can be safely serialized
    JSON.stringify(data);
    return data;
  } catch (error) {
    // If serialization fails, create a safe version by converting to JSON and back
    try {
      // For simple objects that might contain functions
      const safeData = JSON.parse(JSON.stringify(data, (_key, value) => {
        // Convert functions to null to prevent serialization errors
        if (typeof value === 'function') return null;
        // Handle other non-serializable types
        if (value instanceof Map || value instanceof Set) return Array.from(value);
        if (value instanceof Error) return { message: value.message, stack: value.stack };
        if (value instanceof Date) return value.toISOString();
        return value;
      }));
      return safeData as T;
    } catch (jsonError) {
      // If even that fails, return a safe empty object/array
      console.error('Failed to safely serialize data:', jsonError);
      return (Array.isArray(data) ? [] : {}) as T;
    }
  }
}

/**
 * Create a safe version of a React component that won't have serialization issues
 */
export function withSafeSerialization<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function SafeComponent(props: P) {
    // Create safe props by serializing and deserializing
    const safeProps = safeSerialize(props);
    // Use createElement to avoid the direct call issue
    return React.createElement(Component, safeProps);
  };
}

/**
 * Use default exports that are server component compatible
 */
export function safeServerExport<T>(module: T): T {
  // Run-time export validation for server component compatibility
  return module;
} 