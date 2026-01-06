/**
 * Form Sync Validation
 * Validates that forms collect all required DMN inputs
 */

/**
 * Extract all field IDs from form components recursively
 */
function extractFormFieldIds(components, parentId = '') {
  const fields = new Set();

  for (const component of components) {
    const componentId = component.id;

    // Skip group components, but process their children
    if (component.type === 'group') {
      if (component.components) {
        const childFields = extractFormFieldIds(component.components, componentId);
        childFields.forEach(field => fields.add(field));
      }
      continue;
    }

    // Add the field ID
    if (componentId) {
      fields.add(componentId);
    }

    // Process nested components (like dynamiclist items)
    if (component.components) {
      const childFields = extractFormFieldIds(component.components, componentId);
      childFields.forEach(field => {
        // For dynamiclist children, prefix with parent
        if (component.type === 'dynamiclist') {
          fields.add(`${componentId}.${field}`);
        } else {
          fields.add(field);
        }
      });
    }
  }

  return fields;
}

/**
 * Extract all required field IDs from input schema
 */
function extractSchemaFieldIds(schema) {
  const fields = new Set();

  function addFieldsRecursive(fieldsObj, prefix = '') {
    for (const [fieldName, fieldInfo] of Object.entries(fieldsObj)) {
      const fullPath = prefix ? `${prefix}.${fieldName}` : fieldName;

      // Add the field itself
      fields.add(fieldName);

      // If it has nested fields (collections or complex types), add those too
      if (fieldInfo.fields) {
        for (const nestedField of Object.keys(fieldInfo.fields)) {
          fields.add(`${fieldName}.${nestedField}`);
        }
      }
    }
  }

  if (schema.requiredInputs.person) {
    addFieldsRecursive(schema.requiredInputs.person, '');
  }

  if (schema.requiredInputs.situation) {
    addFieldsRecursive(schema.requiredInputs.situation, '');
  }

  return fields;
}

/**
 * Validate form against schema
 */
function validateFormSync(formSchema, inputSchema) {
  const formFields = extractFormFieldIds(formSchema.components);
  const schemaFields = extractSchemaFieldIds(inputSchema);

  // Fields that are usually auto-populated (not required in forms)
  const autoPopulatedFields = new Set(['primaryPersonId', 'evaluationDate', 'id']);

  // Find missing fields (in schema but not in form)
  const missingFields = [];
  for (const schemaField of schemaFields) {
    // Skip auto-populated fields
    if (autoPopulatedFields.has(schemaField)) {
      continue;
    }

    // Check if field exists in form (exact match or as part of nested structure)
    const exists = formFields.has(schemaField) ||
                   Array.from(formFields).some(f => f.includes(schemaField));

    if (!exists) {
      missingFields.push(schemaField);
    }
  }

  // Find extra fields (in form but not in schema)
  const extraFields = [];
  for (const formField of formFields) {
    // Skip auto-populated fields
    if (autoPopulatedFields.has(formField)) {
      continue;
    }

    // Check if field exists in schema
    const baseField = formField.split('.')[0];
    const exists = schemaFields.has(formField) ||
                   schemaFields.has(baseField);

    if (!exists) {
      extraFields.push(formField);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    extraFields,
    formFieldCount: formFields.size,
    schemaFieldCount: schemaFields.size
  };
}

/**
 * Generate validation report
 */
function generateValidationReport(validation, formName, schemaName) {
  const lines = [];

  lines.push('Form Sync Validation Report');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Form: ${formName}`);
  lines.push(`Schema: ${schemaName}`);
  lines.push('');

  if (validation.isValid) {
    lines.push('✅ PASS: Form collects all required DMN inputs');
    lines.push('');
    lines.push(`  Form fields: ${validation.formFieldCount}`);
    lines.push(`  Schema fields: ${validation.schemaFieldCount}`);
  } else {
    lines.push('❌ FAIL: Form is missing required DMN inputs');
    lines.push('');
    lines.push(`Missing fields (${validation.missingFields.length}):`);
    for (const field of validation.missingFields) {
      lines.push(`  - ${field}`);
    }
  }

  if (validation.extraFields.length > 0) {
    lines.push('');
    lines.push(`⚠️  Extra fields not in schema (${validation.extraFields.length}):`);
    for (const field of validation.extraFields) {
      lines.push(`  - ${field}`);
    }
    lines.push('');
    lines.push('Note: Extra fields are not necessarily a problem, but may indicate:');
    lines.push('  - Fields collected for UX but not used in DMN logic');
    lines.push('  - Fields that should be added to DMN logic');
    lines.push('  - Outdated form fields that can be removed');
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

module.exports = {
  validateFormSync,
  extractFormFieldIds,
  extractSchemaFieldIds,
  generateValidationReport
};
