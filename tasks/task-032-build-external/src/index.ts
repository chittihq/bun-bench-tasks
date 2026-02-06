// Library that uses external dependencies
// These should be marked as external to avoid bundling

// BUG: These imports should be marked external in build config
// Without external config, lodash and axios get bundled into output
import { chunk, uniq, flatten } from "lodash";
import axios from "axios";

// Export utilities that use external dependencies
export function processData(items: number[]) {
  const chunks = chunk(items, 3);
  const unique = uniq(items);
  return { chunks, unique };
}

export async function fetchData(endpoint: string) {
  const response = await axios.get(endpoint);
  return response.data;
}

export async function sendData(endpoint: string, payload: object) {
  const response = await axios.post(endpoint, payload);
  return response.data;
}

// Re-export some lodash utilities
export { flatten };
