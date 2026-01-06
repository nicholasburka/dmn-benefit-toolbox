/**
 * Form.js Schema Generator
 * Transforms input-schema.json to Form.js JSON format
 */

/**
 * Map DMN type to Form.js component type
 */
function mapTypeToFormComponent(fieldName, fieldInfo) {
  const { type, primitive, isCollection, fields, itemType } = fieldInfo;

  // Handle collections
  if (isCollection) {
    return {
      type: 'dynamiclist',
      id: fieldName,
      label: formatLabel(fieldName),
      description: `List of ${formatLabel(itemType || type)}`,
      components: fields ? generateFieldComponents(fields) : []
    };
  }

  // Handle primitive types
  if (primitive) {
    switch (type) {
      case 'date':
        return {
          type: 'date',
          id: fieldName,
          label: formatLabel(fieldName),
          validate: { required: fieldInfo.required || false }
        };
      case 'boolean':
        return {
          type: 'checkbox',
          id: fieldName,
          label: formatLabel(fieldName),
          validate: { required: fieldInfo.required || false }
        };
      case 'number':
        return {
          type: 'number',
          id: fieldName,
          label: formatLabel(fieldName),
          validate: { required: fieldInfo.required || false }
        };
      case 'string':
        return {
          type: 'textfield',
          id: fieldName,
          label: formatLabel(fieldName),
          validate: { required: fieldInfo.required || false }
        };
      default:
        return {
          type: 'textfield',
          id: fieldName,
          label: formatLabel(fieldName),
          validate: { required: fieldInfo.required || false }
        };
    }
  }

  // Handle complex types (groups)
  if (fields) {
    return {
      type: 'group',
      id: fieldName,
      label: formatLabel(fieldName),
      components: generateFieldComponents(fields)
    };
  }

  // Default fallback
  return {
    type: 'textfield',
    id: fieldName,
    label: formatLabel(fieldName),
    validate: { required: fieldInfo.required || false }
  };
}

/**
 * Convert camelCase or PascalCase to human-readable label
 */
function formatLabel(str) {
  // Handle common abbreviations
  const abbreviations = {
    'id': 'ID',
    'ssn': 'SSN',
    'dob': 'Date of Birth',
    'fbr': 'Federal Benefit Rate'
  };

  const lower = str.toLowerCase();
  if (abbreviations[lower]) {
    return abbreviations[lower];
  }

  // Convert camelCase to space-separated words
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/^./, s => s.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Generate form components from field definitions
 */
function generateFieldComponents(fields) {
  const components = [];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    components.push(mapTypeToFormComponent(fieldName, fieldInfo));
  }

  return components;
}

/**
 * Generate complete Form.js schema from input-schema.json
 */
function generateFormSchema(inputSchema) {
  const { benefit, requiredInputs } = inputSchema;

  const components = [];

  // Add person fields section
  if (requiredInputs.person && Object.keys(requiredInputs.person).length > 0) {
    components.push({
      type: 'group',
      id: 'person',
      label: 'Personal Information',
      components: generateFieldComponents(requiredInputs.person)
    });
  }

  // Add situation fields section
  if (requiredInputs.situation && Object.keys(requiredInputs.situation).length > 0) {
    const situationFields = { ...requiredInputs.situation };

    // Remove primaryPersonId and evaluationDate from form (usually auto-populated)
    delete situationFields.primaryPersonId;
    delete situationFields.evaluationDate;

    if (Object.keys(situationFields).length > 0) {
      components.push({
        type: 'group',
        id: 'situation',
        label: 'Additional Information',
        components: generateFieldComponents(situationFields)
      });
    }
  }

  return {
    type: 'default',
    id: `${benefit}Form`,
    title: formatLabel(benefit),
    description: `Eligibility screening form for ${formatLabel(benefit)}`,
    components: components,
    schemaVersion: 9
  };
}

/**
 * Add helpful descriptions based on field names and types
 */
function addFieldDescriptions(schema) {
  const descriptions = {
    'dateOfBirth': 'Your date of birth (MM/DD/YYYY)',
    'isBlindOrDisabled': 'Check if you are blind or have a qualifying disability',
    'citizenshipStatus': 'Your citizenship or immigration status',
    'residenceState': 'The state where you currently reside',
    'countableResources': 'Total value of your countable resources (savings, property, etc.)',
    'incomeSources': 'All sources of income (earned and unearned)',
    'monthlyAmount': 'Monthly income amount in dollars',
    'refugeeAdmissionDate': 'Date you were admitted as a refugee',
    'asylumGrantDate': 'Date you were granted asylum'
  };

  function addDescriptionsRecursive(components) {
    for (const component of components) {
      if (descriptions[component.id]) {
        component.description = descriptions[component.id];
      }
      if (component.components) {
        addDescriptionsRecursive(component.components);
      }
    }
  }

  addDescriptionsRecursive(schema.components);
  return schema;
}

module.exports = {
  generateFormSchema,
  addFieldDescriptions,
  mapTypeToFormComponent,
  formatLabel
};
