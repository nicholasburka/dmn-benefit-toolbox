const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');

/**
 * Parse a DMN XML file and return the parsed document
 * @param {string} filePath - Absolute or relative path to DMN file
 * @returns {Document} Parsed XML document
 * @throws {Error} If file doesn't exist or XML is malformed
 */
function parseDMNFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`DMN file not found: ${filePath}`);
  }

  try {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    // Check for XML parsing errors
    const parseErrors = xpath.select('//parsererror', doc);
    if (parseErrors.length > 0) {
      throw new Error(`Malformed XML in ${filePath}: ${parseErrors[0].textContent}`);
    }

    return doc;
  } catch (error) {
    if (error.message.includes('Malformed XML')) {
      throw error;
    }
    throw new Error(`Failed to parse DMN file ${filePath}: ${error.message}`);
  }
}

/**
 * Find a DMN file by trying multiple resolution strategies
 * @param {string} baseDir - Base directory to resolve from
 * @param {string} locationURI - Location URI from import statement
 * @param {string} resourcesDir - Root resources directory
 * @returns {string|null} Resolved path or null if not found
 */
function findDMNFile(baseDir, locationURI, resourcesDir) {
  // Strategy 1: Standard relative path resolution
  const standardPath = path.resolve(baseDir, locationURI);
  if (fs.existsSync(standardPath)) {
    return standardPath;
  }

  // Strategy 2: Search from resources root (common for Kogito)
  // e.g., if locationURI is "../../Benefits.dmn", try just "Benefits.dmn" from resources root
  const fileName = path.basename(locationURI);

  // Try common locations within resources directory
  const commonPaths = [
    path.join(resourcesDir, fileName),                    // resources/Benefits.dmn
    path.join(resourcesDir, 'benefits', fileName),        // resources/benefits/Benefits.dmn
    path.join(resourcesDir, 'checks', fileName),          // resources/checks/...
  ];

  for (const tryPath of commonPaths) {
    if (fs.existsSync(tryPath)) {
      return tryPath;
    }
  }

  return null;
}

/**
 * Get all imported DMN files recursively, avoiding circular imports
 * @param {string} rootFile - Path to the root DMN file
 * @param {Set<string>} visited - Set of already visited files (for circular detection)
 * @returns {string[]} Array of absolute paths to all DMN files (including root)
 */
function getAllImportedDMN(rootFile, visited = new Set()) {
  const absolutePath = path.resolve(rootFile);

  // Circular import detection
  if (visited.has(absolutePath)) {
    return [];
  }

  visited.add(absolutePath);
  const allFiles = [absolutePath];

  try {
    const doc = parseDMNFile(absolutePath);
    const baseDir = path.dirname(absolutePath);

    // Find resources directory (go up until we find "resources" or hit a limit)
    let resourcesDir = baseDir;
    let depth = 0;
    while (!resourcesDir.endsWith('resources') && depth < 10) {
      const parent = path.dirname(resourcesDir);
      if (parent === resourcesDir) break; // Hit root
      resourcesDir = parent;
      depth++;
    }

    // DMN namespace declaration
    const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });

    // Find all import elements
    const imports = select('//dmn:import', doc);

    for (const importNode of imports) {
      const locationURI = importNode.getAttribute('locationURI');
      if (!locationURI) {
        console.warn(`Import in ${absolutePath} missing locationURI attribute`);
        continue;
      }

      // Try to find the imported file
      const importPath = findDMNFile(baseDir, locationURI, resourcesDir);

      if (!importPath) {
        console.warn(`Could not find imported DMN file: ${locationURI} (referenced from ${absolutePath})`);
        continue;
      }

      // Recursively get imports from this file
      const nestedFiles = getAllImportedDMN(importPath, visited);
      allFiles.push(...nestedFiles);
    }

    return allFiles;
  } catch (error) {
    console.error(`Error processing DMN imports for ${absolutePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Get the model name from a DMN file
 * @param {Document} doc - Parsed DMN document
 * @returns {string|null} Model name or null if not found
 */
function getModelName(doc) {
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });
  const definitions = select('//dmn:definitions', doc);

  if (definitions.length > 0) {
    return definitions[0].getAttribute('name');
  }

  return null;
}

/**
 * Get the namespace from a DMN file
 * @param {Document} doc - Parsed DMN document
 * @returns {string|null} Namespace URI or null if not found
 */
function getNamespace(doc) {
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });
  const definitions = select('//dmn:definitions', doc);

  if (definitions.length > 0) {
    return definitions[0].getAttribute('namespace');
  }

  return null;
}

module.exports = {
  parseDMNFile,
  getAllImportedDMN,
  getModelName,
  getNamespace
};
