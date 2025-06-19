/*
 * This file is part of BrowserLoop.
 *
 * BrowserLoop is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BrowserLoop is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with BrowserLoop. If not, see <https://www.gnu.org/licenses/>.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PackageInfo {
  version: string;
  homepage: string;
  repository: string;
}

// Dynamic version reading utility
export function getPackageInfo(): PackageInfo {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    // Try multiple paths to find package.json (handles both dev and dist)
    const possiblePaths = [
      join(currentDir, '../../package.json'), // From dist/src/
      join(currentDir, '../package.json'), // From src/
      join(currentDir, 'package.json'), // Same directory
    ];

    for (const path of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(path, 'utf8'));
        return {
          version: packageJson.version || '1.0.0',
          homepage:
            packageJson.homepage ||
            'https://github.com/mattiasw/browserloop#readme',
          repository:
            packageJson.repository?.url
              ?.replace('git+', '')
              .replace('.git', '') || 'https://github.com/mattiasw/browserloop',
        };
      } catch {
        // Silently ignore JSON parsing errors and use fallback
      }
    }

    // Fallback if package.json not found
    return {
      version: '1.0.0',
      homepage: 'https://github.com/mattiasw/browserloop#readme',
      repository: 'https://github.com/mattiasw/browserloop',
    };
  } catch {
    return {
      version: '1.0.0',
      homepage: 'https://github.com/mattiasw/browserloop#readme',
      repository: 'https://github.com/mattiasw/browserloop',
    };
  }
}
