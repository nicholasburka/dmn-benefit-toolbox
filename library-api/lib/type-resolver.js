const xpath = require('xpath');

/**
 * Resolve the type of a field from BDT.dmn
 * @param {string} fieldName - Name of the field to resolve
 * @param {Document} bdtDoc - Parsed BDT.dmn document
 * @param {string} parentType - Parent type name ('tPerson' or 'tSituation')
 * @returns {Object|null} Type information or null if not found
 */
function resolveType(fieldName, bdtDoc, parentType = 'tPerson') {
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });

  // Find the parent type definition (tPerson or tSituation)
  const parentTypeDef = select(`//dmn:itemDefinition[@name='${parentType}']`, bdtDoc)[0];

  if (!parentTypeDef) {
    console.warn(`Parent type ${parentType} not found in BDT.dmn`);
    return null;
  }

  // Find the field within the parent type
  const fieldComponent = select(`.//dmn:itemComponent[@name='${fieldName}']`, parentTypeDef)[0];

  if (!fieldComponent) {
    // Field not found in this parent type
    return null;
  }

  // Extract type reference
  const typeRefNode = select('./dmn:typeRef/text()', fieldComponent)[0];
  if (!typeRefNode) {
    console.warn(`No typeRef found for field ${fieldName} in ${parentType}`);
    return null;
  }

  const typeRef = typeRefNode.data.trim();
  const isCollection = fieldComponent.getAttribute('isCollection') === 'true';

  // Check if it's a primitive type
  const primitiveTypes = ['date', 'number', 'string', 'boolean'];
  if (primitiveTypes.includes(typeRef)) {
    return {
      type: typeRef,
      isCollection,
      primitive: true
    };
  }

  // It's a complex type - resolve it recursively
  return resolveComplexType(typeRef, bdtDoc, isCollection);
}

/**
 * Resolve a complex type from BDT.dmn
 * @param {string} typeName - Name of the complex type (e.g., 'tIncomeSourceList')
 * @param {Document} bdtDoc - Parsed BDT.dmn document
 * @param {boolean} isCollection - Whether this is a collection type
 * @returns {Object} Complex type information
 */
function resolveComplexType(typeName, bdtDoc, isCollection = false) {
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });

  // Find the type definition
  const typeDef = select(`//dmn:itemDefinition[@name='${typeName}']`, bdtDoc)[0];

  if (!typeDef) {
    console.warn(`Complex type ${typeName} not found in BDT.dmn`);
    return {
      type: typeName,
      isCollection,
      primitive: false,
      fields: {}
    };
  }

  // Check if this type is itself a collection (e.g., tIncomeSourceList)
  const typeIsCollection = typeDef.getAttribute('isCollection') === 'true';

  // If it's a collection type, get the item type
  if (typeIsCollection) {
    const typeRefNode = select('./dmn:typeRef/text()', typeDef)[0];
    if (typeRefNode) {
      const itemTypeName = typeRefNode.data.trim();
      return {
        type: typeName,
        isCollection: true,
        itemType: itemTypeName,
        fields: resolveTypeFields(itemTypeName, bdtDoc)
      };
    }
  }

  // Get all fields of this complex type
  const fields = resolveTypeFields(typeName, bdtDoc);

  return {
    type: typeName,
    isCollection,
    primitive: false,
    fields
  };
}

/**
 * Resolve all fields of a complex type
 * @param {string} typeName - Name of the complex type
 * @param {Document} bdtDoc - Parsed BDT.dmn document
 * @returns {Object} Map of field names to their type information
 */
function resolveTypeFields(typeName, bdtDoc) {
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });

  const typeDef = select(`//dmn:itemDefinition[@name='${typeName}']`, bdtDoc)[0];

  if (!typeDef) {
    return {};
  }

  const fields = {};
  const fieldComponents = select('.//dmn:itemComponent', typeDef);

  for (const fieldComponent of fieldComponents) {
    const fieldName = fieldComponent.getAttribute('name');
    const typeRefNode = select('./dmn:typeRef/text()', fieldComponent)[0];

    if (!typeRefNode) {
      continue;
    }

    const typeRef = typeRefNode.data.trim();
    const isCollection = fieldComponent.getAttribute('isCollection') === 'true';

    // Check if primitive
    const primitiveTypes = ['date', 'number', 'string', 'boolean'];
    if (primitiveTypes.includes(typeRef)) {
      fields[fieldName] = {
        type: typeRef,
        isCollection,
        primitive: true
      };
    } else {
      // Complex type - don't recurse too deeply to avoid circular references
      fields[fieldName] = {
        type: typeRef,
        isCollection,
        primitive: false
      };
    }
  }

  return fields;
}

/**
 * Get all type definitions from BDT.dmn
 * @param {Document} bdtDoc - Parsed BDT.dmn document
 * @returns {Object} Map of type names to their definitions
 */
function getAllTypes(bdtDoc) {
  const select = xpath.useNamespaces({ 'dmn': 'http://www.omg.org/spec/DMN/20180521/MODEL/' });
  const typeDefs = select('//dmn:itemDefinition', bdtDoc);

  const types = {};

  for (const typeDef of typeDefs) {
    const typeName = typeDef.getAttribute('name');
    if (typeName) {
      types[typeName] = typeName;
    }
  }

  return types;
}

module.exports = {
  resolveType,
  resolveComplexType,
  resolveTypeFields,
  getAllTypes
};
