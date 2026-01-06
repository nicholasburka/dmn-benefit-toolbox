const xpath = require('xpath');

/**
 * Extract all person.* and situation.* field references from FEEL expressions in a DMN document
 * @param {Document} dmnDoc - Parsed DMN XML document
 * @returns {{person: Set<string>, situation: Set<string>}} Field references organized by type
 */
function extractFieldReferences(dmnDoc) {
  const personFields = new Set();
  const situationFields = new Set();

  // DMN namespace declaration
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });

  // Get all FEEL expressions from <dmn:text> elements
  const textNodes = select('//dmn:text/text()', dmnDoc);

  for (const textNode of textNodes) {
    const feelExpression = textNode.data;

    // Pattern 1: person.fieldName (direct person object references)
    // Matches: person.fieldName, person.field.nestedField, person.incomeSources[], etc.
    const personMatches = feelExpression.matchAll(/person\.(\w+(?:\[\])?(?:\.\w+)*)/g);
    for (const match of personMatches) {
      const fieldPath = match[1];
      personFields.add(fieldPath);

      // Also store just the first-level field (e.g., "incomeSources" from "incomeSources[].type")
      const firstLevelField = fieldPath.split(/[\.\[]/)[0];
      personFields.add(firstLevelField);
    }

    // Pattern 2: situation.people[...].fieldName (accessing person fields through situation.people list)
    // Matches: situation.people[id = parameters.personId].dateOfBirth
    const peopleFieldMatches = feelExpression.matchAll(/situation\.people\[.*?\]\.(\w+(?:\[\])?(?:\.\w+)*)/g);
    for (const match of peopleFieldMatches) {
      const fieldPath = match[1];
      personFields.add(fieldPath);

      const firstLevelField = fieldPath.split(/[\.\[]/)[0];
      personFields.add(firstLevelField);
    }

    // Pattern 3: situation.fieldName (direct situation field references)
    // BUT exclude situation.people since that's the people list, not a situation-level field
    const situationMatches = feelExpression.matchAll(/situation\.(\w+(?:\[\])?(?:\.\w+)*)/g);
    for (const match of situationMatches) {
      const fieldPath = match[1];

      // Skip "people[...]" patterns as these are person fields
      if (fieldPath.startsWith('people[') || fieldPath === 'people') {
        continue;
      }

      situationFields.add(fieldPath);

      const firstLevelField = fieldPath.split(/[\.\[]/)[0];
      situationFields.add(firstLevelField);
    }
  }

  return {
    person: personFields,
    situation: situationFields
  };
}

/**
 * Extract field references from multiple DMN files and merge results
 * @param {Document[]} dmnDocs - Array of parsed DMN documents
 * @returns {{person: Set<string>, situation: Set<string>}} Merged field references
 */
function extractFieldReferencesFromMultiple(dmnDocs) {
  const mergedPerson = new Set();
  const mergedSituation = new Set();

  for (const doc of dmnDocs) {
    const { person, situation } = extractFieldReferences(doc);

    person.forEach(field => mergedPerson.add(field));
    situation.forEach(field => mergedSituation.add(field));
  }

  return {
    person: mergedPerson,
    situation: mergedSituation
  };
}

/**
 * Organize field references into a hierarchical structure
 * @param {Set<string>} fields - Set of field paths
 * @returns {Object} Hierarchical structure of fields
 */
function organizeFields(fields) {
  const organized = {};

  for (const field of fields) {
    // Skip collection accessors and nested paths for now
    if (field.includes('[') || field.includes('.')) {
      continue;
    }

    organized[field] = {
      name: field,
      // We'll add type info in the type resolver phase
    };
  }

  return organized;
}

module.exports = {
  extractFieldReferences,
  extractFieldReferencesFromMultiple,
  organizeFields
};
