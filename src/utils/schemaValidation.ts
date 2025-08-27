import { DocumentSchema, SchemaField } from '../types';

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateSchema = (schema: any): SchemaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic schema structure validation
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be a valid object');
    return { isValid: false, errors, warnings };
  }

  // Required fields
  if (!schema.name || typeof schema.name !== 'string' || schema.name.trim() === '') {
    errors.push('Schema name is required and must be a non-empty string');
  }

  if (!schema.description || typeof schema.description !== 'string' || schema.description.trim() === '') {
    errors.push('Schema description is required and must be a non-empty string');
  }

  if (!schema.category || typeof schema.category !== 'string' || schema.category.trim() === '') {
    errors.push('Schema category is required and must be a non-empty string');
  }

  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push('Schema fields must be an array');
  } else if (schema.fields.length === 0) {
    errors.push('Schema must have at least one field');
  } else {
    // Validate each field
    const fieldNames = new Set<string>();
    
    schema.fields.forEach((field: any, index: number) => {
      const fieldErrors = validateSchemaField(field, index);
      errors.push(...fieldErrors);

      // Check for duplicate field names
      if (field.name) {
        if (fieldNames.has(field.name)) {
          errors.push(`Duplicate field name: ${field.name}`);
        } else {
          fieldNames.add(field.name);
        }
      }
    });

    // Check if at least one field is required
    const hasRequiredField = schema.fields.some((field: any) => field.required === true);
    if (!hasRequiredField) {
      warnings.push('Consider having at least one required field for better data integrity');
    }
  }

  // Validate examples if provided
  if (schema.examples && Array.isArray(schema.examples)) {
    schema.examples.forEach((example: any, index: number) => {
      const exampleErrors = validateExample(example, schema.fields, index);
      errors.push(...exampleErrors);
    });
  }

  // ID validation (optional but recommended)
  if (schema.id && (typeof schema.id !== 'string' || !/^[a-z0-9-]+$/.test(schema.id))) {
    errors.push('Schema ID must contain only lowercase letters, numbers, and hyphens');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateSchemaField = (field: any, index?: number): string[] => {
  const errors: string[] = [];
  const prefix = index !== undefined ? `Field ${index + 1}: ` : 'Field: ';

  if (!field || typeof field !== 'object') {
    errors.push(`${prefix}Must be a valid object`);
    return errors;
  }

  // Required properties
  if (!field.name || typeof field.name !== 'string' || field.name.trim() === '') {
    errors.push(`${prefix}Name is required and must be a non-empty string`);
  } else {
    // Field name format validation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
      errors.push(`${prefix}Name must start with a letter or underscore and contain only letters, numbers, and underscores`);
    }
  }

  if (!field.description || typeof field.description !== 'string' || field.description.trim() === '') {
    errors.push(`${prefix}Description is required and must be a non-empty string`);
  }

  // Type validation
  const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'timestamp', 'email', 'url'];
  if (!field.type || !validTypes.includes(field.type)) {
    errors.push(`${prefix}Type must be one of: ${validTypes.join(', ')}`);
  }

  // Required field validation
  if (field.required !== undefined && typeof field.required !== 'boolean') {
    errors.push(`${prefix}Required must be a boolean value`);
  }

  // Validation rules
  if (field.validation && typeof field.validation === 'object') {
    const validation = field.validation;

    // Min/Max validation (for numbers and strings)
    if (validation.min !== undefined) {
      if (typeof validation.min !== 'number' || validation.min < 0) {
        errors.push(`${prefix}Validation min must be a non-negative number`);
      }
    }

    if (validation.max !== undefined) {
      if (typeof validation.max !== 'number' || validation.max < 0) {
        errors.push(`${prefix}Validation max must be a non-negative number`);
      }
      
      if (validation.min !== undefined && validation.max < validation.min) {
        errors.push(`${prefix}Validation max must be greater than or equal to min`);
      }
    }

    // Pattern validation (for strings)
    if (validation.pattern !== undefined) {
      if (typeof validation.pattern !== 'string') {
        errors.push(`${prefix}Validation pattern must be a string`);
      } else {
        try {
          new RegExp(validation.pattern);
        } catch (e) {
          errors.push(`${prefix}Validation pattern is not a valid regular expression`);
        }
      }
    }

    // Enum validation
    if (validation.enum !== undefined) {
      if (!Array.isArray(validation.enum) || validation.enum.length === 0) {
        errors.push(`${prefix}Validation enum must be a non-empty array`);
      }
    }
  }

  return errors;
};

export const validateExample = (example: any, fields: SchemaField[], index?: number): string[] => {
  const errors: string[] = [];
  const prefix = index !== undefined ? `Example ${index + 1}: ` : 'Example: ';

  if (!example || typeof example !== 'object') {
    errors.push(`${prefix}Must be a valid object`);
    return errors;
  }

  // Check required fields are present
  const requiredFields = fields.filter(field => field.required);
  requiredFields.forEach(field => {
    if (!(field.name in example)) {
      errors.push(`${prefix}Missing required field: ${field.name}`);
    }
  });

  // Validate field types in example
  Object.keys(example).forEach(key => {
    const field = fields.find(f => f.name === key);
    if (!field) {
      // Field not defined in schema - this is a warning, not an error
      return;
    }

    const value = example[key];
    const typeError = validateFieldValue(value, field, `${prefix}Field ${key}`);
    if (typeError) {
      errors.push(typeError);
    }
  });

  return errors;
};

export const validateFieldValue = (value: any, field: SchemaField, prefix: string = ''): string | null => {
  if (value === null || value === undefined) {
    if (field.required) {
      return `${prefix}: Required field cannot be null or undefined`;
    }
    return null;
  }

  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${prefix}: Expected string, got ${typeof value}`;
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `${prefix}: Expected number, got ${typeof value}`;
      }
      
      if (field.validation?.min !== undefined && value < field.validation.min) {
        return `${prefix}: Value ${value} is less than minimum ${field.validation.min}`;
      }
      
      if (field.validation?.max !== undefined && value > field.validation.max) {
        return `${prefix}: Value ${value} is greater than maximum ${field.validation.max}`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${prefix}: Expected boolean, got ${typeof value}`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `${prefix}: Expected array, got ${typeof value}`;
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${prefix}: Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`;
      }
      break;

    case 'timestamp':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return `${prefix}: Expected valid timestamp/date, got invalid date`;
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `${prefix}: Expected valid email address`;
      }
      break;

    case 'url':
      if (typeof value !== 'string') {
        return `${prefix}: Expected string for URL, got ${typeof value}`;
      }
      try {
        new URL(value);
      } catch {
        return `${prefix}: Expected valid URL`;
      }
      break;
  }

  // Additional validation rules
  if (field.validation) {
    if (field.type === 'string' && field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value as string)) {
        return `${prefix}: Value does not match required pattern ${field.validation.pattern}`;
      }
    }

    if (field.validation.enum && !field.validation.enum.includes(value)) {
      return `${prefix}: Value must be one of: ${field.validation.enum.join(', ')}`;
    }
  }

  return null;
};

export const generateSchemaFromExample = (example: any, schemaName: string = 'Generated Schema'): DocumentSchema => {
  if (!example || typeof example !== 'object' || Array.isArray(example)) {
    throw new Error('Example must be a valid object');
  }

  const fields: SchemaField[] = Object.entries(example).map(([key, value]) => {
    const type = inferFieldType(value);
    return {
      name: key,
      type,
      required: value !== null && value !== undefined,
      description: `Generated field for ${key}`,
      example: value
    };
  });

  return {
    id: schemaName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
    name: schemaName,
    description: `Generated schema from example data`,
    category: 'Generated',
    fields,
    examples: [example]
  };
};

const inferFieldType = (value: any): SchemaField['type'] => {
  if (value === null || value === undefined) {
    return 'string'; // Default type
  }

  if (typeof value === 'string') {
    // Check if it looks like an email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'email';
    }
    
    // Check if it looks like a URL
    try {
      new URL(value);
      return 'url';
    } catch {
      // Not a URL
    }

    // Check if it looks like a timestamp
    const date = new Date(value);
    if (!isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'timestamp';
    }

    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'string';
};