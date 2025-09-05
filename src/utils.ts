/**
 * Utility functions for ObsidianObserver
 */

/**
 * Generates a base32-encoded GUID for unique event identification
 * @returns A base32 string representing a unique identifier
 */
export function generateBase32Guid(): string {
  // Generate a random UUID v4
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  // Convert UUID to base32
  return uuidToBase32(uuid);
}

/**
 * Converts a UUID string to base32 encoding
 * @param uuid The UUID string to convert
 * @returns Base32 encoded string
 */
function uuidToBase32(uuid: string): string {
  // Remove hyphens and convert to lowercase
  const cleanUuid = uuid.replace(/-/g, '').toLowerCase();
  
  // Convert hex to binary
  let binary = '';
  for (let i = 0; i < cleanUuid.length; i++) {
    const hex = parseInt(cleanUuid[i], 16);
    binary += hex.toString(2).padStart(4, '0');
  }
  
  // Base32 alphabet (RFC 4648)
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  
  // Convert binary to base32
  let base32 = '';
  for (let i = 0; i < binary.length; i += 5) {
    const chunk = binary.substr(i, 5).padEnd(5, '0');
    const decimal = parseInt(chunk, 2);
    base32 += base32Chars[decimal];
  }
  
  // Return first 26 characters (standard base32 GUID length)
  return base32.substring(0, 26);
}
