/**
 * Input Documentation Generator
 * Auto-generates markdown documentation from input-schema.json
 */

/**
 * Format field name for display
 */
function formatFieldName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get type display string
 */
function getTypeDisplay(fieldInfo) {
  const { type, primitive, isCollection, itemType } = fieldInfo;

  if (isCollection) {
    const baseType = itemType || type;
    return `List of ${baseType}`;
  }

  if (primitive) {
    return type;
  }

  return type || 'object';
}

/**
 * Generate example value for field
 */
function generateExample(fieldName, fieldInfo) {
  const { type, primitive, isCollection, fields } = fieldInfo;

  // Collection examples
  if (isCollection) {
    if (fields) {
      const exampleItem = {};
      for (const [name, info] of Object.entries(fields)) {
        exampleItem[name] = generateExample(name, info);
      }
      return [exampleItem];
    }
    return [];
  }

  // Primitive examples
  if (primitive) {
    switch (type) {
      case 'date':
        return '2024-01-15';
      case 'boolean':
        return false;
      case 'number':
        if (fieldName.toLowerCase().includes('amount') ||
            fieldName.toLowerCase().includes('income')) {
          return 1500;
        }
        return 0;
      case 'string':
        if (fieldName.toLowerCase().includes('id')) {
          return 'person-123';
        }
        if (fieldName.toLowerCase().includes('state')) {
          return 'PA';
        }
        if (fieldName.toLowerCase().includes('status')) {
          return 'US_CITIZEN';
        }
        return '';
    }
  }

  // Complex type examples
  if (fields) {
    const example = {};
    for (const [name, info] of Object.entries(fields)) {
      example[name] = generateExample(name, info);
    }
    return example;
  }

  return null;
}

/**
 * Generate markdown table for fields
 */
function generateFieldsTable(fields, prefix = '') {
  const rows = [];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    const fullName = prefix ? `${prefix}.${fieldName}` : fieldName;
    const displayName = formatFieldName(fieldName);
    const typeDisplay = getTypeDisplay(fieldInfo);
    const required = fieldInfo.required ? 'Yes' : 'No';
    const description = fieldInfo.description || '';

    rows.push(`| ${fullName} | ${displayName} | ${typeDisplay} | ${required} | ${description} |`);

    // Add nested fields for complex types (but not collections - those are shown in example)
    if (fieldInfo.fields && !fieldInfo.isCollection) {
      const nestedRows = generateFieldsTable(fieldInfo.fields, fullName);
      rows.push(...nestedRows);
    }
  }

  return rows;
}

/**
 * Generate documentation sections
 */
function generateDocumentation(inputSchema) {
  const { benefit, requiredInputs, dmnModels = [] } = inputSchema;
  const lines = [];

  // Title and overview
  lines.push(`# ${formatFieldName(benefit)} - Required Inputs`);
  lines.push('');
  lines.push('This document describes all required inputs for the eligibility screener.');
  lines.push('');
  lines.push('> **Auto-generated** from DMN files - do not edit manually.');
  lines.push('> Run `npm run derive-inputs` to regenerate.');
  lines.push('');

  // Summary statistics
  const personFieldCount = requiredInputs.person ? Object.keys(requiredInputs.person).length : 0;
  const situationFieldCount = requiredInputs.situation ? Object.keys(requiredInputs.situation).length : 0;
  const totalFields = personFieldCount + situationFieldCount;

  lines.push('## Overview');
  lines.push('');
  lines.push(`- **Benefit**: ${formatFieldName(benefit)}`);
  lines.push(`- **Total required inputs**: ${totalFields}`);
  lines.push(`- **Person fields**: ${personFieldCount}`);
  lines.push(`- **Situation fields**: ${situationFieldCount}`);
  if (dmnModels.length > 0) {
    lines.push(`- **DMN checks**: ${dmnModels.length}`);
  }
  lines.push('');

  // Person fields
  if (requiredInputs.person && Object.keys(requiredInputs.person).length > 0) {
    lines.push('## Person Fields');
    lines.push('');
    lines.push('Information about the individual being evaluated for eligibility.');
    lines.push('');
    lines.push('| Field ID | Display Name | Type | Required | Description |');
    lines.push('|----------|--------------|------|----------|-------------|');

    const personRows = generateFieldsTable(requiredInputs.person);
    lines.push(...personRows);
    lines.push('');
  }

  // Situation fields
  if (requiredInputs.situation && Object.keys(requiredInputs.situation).length > 0) {
    lines.push('## Situation Fields');
    lines.push('');
    lines.push('Information about the household or circumstances.');
    lines.push('');
    lines.push('| Field ID | Display Name | Type | Required | Description |');
    lines.push('|----------|--------------|------|----------|-------------|');

    const situationRows = generateFieldsTable(requiredInputs.situation);
    lines.push(...situationRows);
    lines.push('');
  }

  // DMN checks (if available)
  if (dmnModels.length > 0) {
    lines.push('## DMN Checks');
    lines.push('');
    lines.push('The following DMN models are used in this eligibility determination:');
    lines.push('');

    for (const model of dmnModels) {
      lines.push(`- **${model.name}** (${model.path})`);
      if (model.inputData && model.inputData.length > 0) {
        lines.push(`  - Inputs: ${model.inputData.join(', ')}`);
      }
    }
    lines.push('');
  }

  // Example JSON
  lines.push('## Example Request');
  lines.push('');
  lines.push('```json');

  const exampleRequest = {
    situation: {}
  };

  // Build person object
  if (requiredInputs.person && Object.keys(requiredInputs.person).length > 0) {
    exampleRequest.situation.people = [{
      id: 'person-1'
    }];

    for (const [fieldName, fieldInfo] of Object.entries(requiredInputs.person)) {
      exampleRequest.situation.people[0][fieldName] = generateExample(fieldName, fieldInfo);
    }

    exampleRequest.situation.primaryPersonId = 'person-1';
  }

  // Build situation fields
  if (requiredInputs.situation && Object.keys(requiredInputs.situation).length > 0) {
    for (const [fieldName, fieldInfo] of Object.entries(requiredInputs.situation)) {
      exampleRequest.situation[fieldName] = generateExample(fieldName, fieldInfo);
    }
  }

  lines.push(JSON.stringify(exampleRequest, null, 2));
  lines.push('```');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString().split('T')[0]}*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Extract benefit name from schema (kebab-case for folder name)
 */
function getBenefitFolderName(benefit) {
  return benefit
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

module.exports = {
  generateDocumentation,
  getBenefitFolderName,
  formatFieldName,
  generateExample
};
