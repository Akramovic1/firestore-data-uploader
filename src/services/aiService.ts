import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { DocumentSchema, DocumentData, AIProvider, SchemaField } from '../types';
import { validateSchema, generateSchemaFromExample } from '../utils/schemaValidation';

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor(providers: AIProvider[]) {
    providers.forEach(provider => {
      if (provider.id === 'openai' && provider.apiKey) {
        this.openai = new OpenAI({ apiKey: provider.apiKey, dangerouslyAllowBrowser: true });
      } else if (provider.id === 'claude' && provider.apiKey) {
        this.anthropic = new Anthropic({ apiKey: provider.apiKey, dangerouslyAllowBrowser: true });
      }
    });
  }

  async generateDocuments(
    schema: DocumentSchema,
    count: number,
    provider: 'openai' | 'claude',
    customPrompt?: string,
    customInstruction?: string
  ): Promise<DocumentData[]> {
    const prompt = this.buildPrompt(schema, count, customPrompt, customInstruction);
    
    if (provider === 'openai' && this.openai) {
      return this.generateWithOpenAI(prompt);
    } else if (provider === 'claude' && this.anthropic) {
      return this.generateWithClaude(prompt);
    } else {
      throw new Error(`${provider} is not configured or available`);
    }
  }

  async generateSchemaFields(
    baseSchema: DocumentSchema,
    userPrompt: string,
    provider: 'openai' | 'claude' = 'openai'
  ): Promise<SchemaField[]> {
    const prompt = this.buildFieldGenerationPrompt(baseSchema, userPrompt);
    
    let response: string;
    if (provider === 'openai' && this.openai) {
      response = await this.generateFieldsWithOpenAI(prompt);
    } else if (provider === 'claude' && this.anthropic) {
      response = await this.generateFieldsWithClaude(prompt);
    } else {
      throw new Error(`${provider} is not configured or available`);
    }

    return this.parseGeneratedFields(response, baseSchema);
  }

  async enhanceSchemaFromExample(
    baseSchema: DocumentSchema,
    exampleData: any,
    provider: 'openai' | 'claude' = 'openai'
  ): Promise<DocumentSchema> {
    // Generate schema from example
    const exampleSchema = generateSchemaFromExample(exampleData, `${baseSchema.name} Enhanced`);
    
    // Find new fields not in base schema
    const existingFieldNames = new Set(baseSchema.fields.map(f => f.name.toLowerCase()));
    const newFields = exampleSchema.fields.filter(f => 
      !existingFieldNames.has(f.name.toLowerCase())
    );

    if (newFields.length === 0) {
      return baseSchema; // No new fields to add
    }

    // Use AI to improve field descriptions and validation
    const enhancePrompt = this.buildFieldEnhancementPrompt(baseSchema, newFields, exampleData);
    
    let response: string;
    if (provider === 'openai' && this.openai) {
      response = await this.generateFieldsWithOpenAI(enhancePrompt);
    } else if (provider === 'claude' && this.anthropic) {
      response = await this.generateFieldsWithClaude(enhancePrompt);
    } else {
      throw new Error(`${provider} is not configured or available`);
    }

    const enhancedFields = this.parseGeneratedFields(response, baseSchema);
    
    return {
      ...baseSchema,
      fields: [...baseSchema.fields, ...enhancedFields],
      examples: [...baseSchema.examples, exampleData]
    };
  }

  private buildPrompt(schema: DocumentSchema, count: number, customPrompt?: string, customInstruction?: string): string {
    const schemaDescription = `
Schema: ${schema.name}
Description: ${schema.description}

Fields:
${schema.fields.map(field => {
  let fieldDesc = `- ${field.name} (${field.type}${field.required ? ', required' : ', optional'}): ${field.description}`;
  if (field.example !== undefined) {
    fieldDesc += `\n  Example: ${JSON.stringify(field.example)}`;
  }
  if (field.validation) {
    fieldDesc += `\n  Validation: ${JSON.stringify(field.validation)}`;
  }
  return fieldDesc;
}).join('\n')}

Example documents:
${schema.examples.map(example => JSON.stringify(example, null, 2)).join('\n\n')}
`;

    const basePrompt = `Generate ${count} realistic documents that follow this exact schema structure. Each document must include all required fields and follow the specified data types and validation rules.

${schemaDescription}

${customInstruction ? `Custom Generation Instructions: ${customInstruction}\n` : ''}
${customPrompt ? `Additional requirements: ${customPrompt}\n` : ''}

IMPORTANT INSTRUCTIONS:
1. Return ONLY a valid JSON array containing ${count} documents
2. Each document must follow the schema exactly
3. Use realistic, varied data that makes sense for the schema
4. Ensure all required fields are present
5. Follow validation rules (min/max values, enums, etc.)
6. Generate diverse, realistic content
7. Do not include any explanatory text, only the JSON array

Return format: [{"field1": "value1", "field2": "value2"}, ...]`;

    return basePrompt;
  }

  private async generateWithOpenAI(prompt: string): Promise<DocumentData[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a data generation assistant. Generate realistic, structured data that follows the provided schema exactly. Return only valid JSON arrays without any additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return this.parseGeneratedContent(content);
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateWithClaude(prompt: string): Promise<DocumentData[]> {
    if (!this.anthropic) {
      throw new Error('Claude not configured');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-4-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseGeneratedContent(content.text);
    } catch (error) {
      throw new Error(`Claude generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseGeneratedContent(content: string): DocumentData[] {
    try {
      // Clean the content to extract JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const documents = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(documents)) {
        throw new Error('Response is not an array');
      }

      if (documents.length === 0) {
        throw new Error('No documents generated');
      }

      return documents;
    } catch (error) {
      throw new Error(`Failed to parse generated content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildFieldGenerationPrompt(baseSchema: DocumentSchema, userPrompt: string): string {
    const existingFields = baseSchema.fields.map(field => 
      `- ${field.name} (${field.type}): ${field.description}`
    ).join('\n');

    return `Generate additional schema fields for a "${baseSchema.name}" schema based on this request: "${userPrompt}"

Existing schema fields:
${existingFields}

Context: ${baseSchema.description}

Generate 1-5 relevant fields that complement the existing schema. Ensure field names don't conflict with existing ones.

Return ONLY a JSON array of field objects with this exact structure:
[
  {
    "name": "fieldName",
    "type": "string|number|boolean|array|object|timestamp|email|url",
    "required": true/false,
    "description": "Detailed field description",
    "example": "example value",
    "validation": { "optional validation rules like min, max, pattern, enum" }
  }
]

Ensure:
1. Field names use camelCase
2. Types are from the allowed list
3. Descriptions are clear and specific
4. Examples are realistic
5. Validation rules are appropriate for the field type
6. No duplicate field names from existing schema`;
  }

  private buildFieldEnhancementPrompt(baseSchema: DocumentSchema, newFields: SchemaField[], exampleData: any): string {
    const existingFields = baseSchema.fields.map(field => 
      `- ${field.name} (${field.type}): ${field.description}`
    ).join('\n');

    const detectedFields = newFields.map(field => 
      `- ${field.name} (${field.type}): ${field.description} [Example: ${JSON.stringify(field.example)}]`
    ).join('\n');

    return `Enhance these automatically detected fields for a "${baseSchema.name}" schema:

Existing schema fields:
${existingFields}

Detected new fields from example data:
${detectedFields}

Example data context:
${JSON.stringify(exampleData, null, 2)}

Enhance the detected fields with:
1. Better, more descriptive field descriptions
2. Appropriate validation rules based on the data patterns
3. Correct field types if needed
4. Better examples

Return ONLY a JSON array of enhanced field objects:
[
  {
    "name": "fieldName",
    "type": "string|number|boolean|array|object|timestamp|email|url",
    "required": true/false,
    "description": "Enhanced detailed description",
    "example": "realistic example",
    "validation": { "enhanced validation rules" }
  }
]`;
  }

  private async generateFieldsWithOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a data schema expert. Generate realistic, well-structured schema fields based on requirements. Return only valid JSON arrays without any additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent field generation
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return content;
    } catch (error) {
      throw new Error(`OpenAI field generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateFieldsWithClaude(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude not configured');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-4-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text;
    } catch (error) {
      throw new Error(`Claude field generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseGeneratedFields(content: string, baseSchema: DocumentSchema): SchemaField[] {
    try {
      // Clean the content to extract JSON
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const fields = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(fields)) {
        throw new Error('Response is not an array');
      }

      if (fields.length === 0) {
        throw new Error('No fields generated');
      }

      // Validate and filter fields
      const existingFieldNames = new Set(baseSchema.fields.map(f => f.name.toLowerCase()));
      const validFields: SchemaField[] = [];

      fields.forEach((field: any, index: number) => {
        // Basic validation
        if (!field || typeof field !== 'object') {
          console.warn(`Field ${index + 1}: Invalid field object`);
          return;
        }

        if (!field.name || typeof field.name !== 'string') {
          console.warn(`Field ${index + 1}: Invalid or missing field name`);
          return;
        }

        // Check for duplicates
        if (existingFieldNames.has(field.name.toLowerCase())) {
          console.warn(`Field ${index + 1}: Duplicate field name '${field.name}'`);
          return;
        }

        // Validate field structure
        const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'timestamp', 'email', 'url'];
        if (!field.type || !validTypes.includes(field.type)) {
          console.warn(`Field ${index + 1}: Invalid field type '${field.type}'`);
          return;
        }

        if (!field.description || typeof field.description !== 'string') {
          console.warn(`Field ${index + 1}: Invalid or missing description`);
          return;
        }

        // Create valid field
        const validField: SchemaField = {
          name: field.name,
          type: field.type,
          required: Boolean(field.required),
          description: field.description,
          example: field.example,
          validation: field.validation && typeof field.validation === 'object' ? field.validation : undefined
        };

        validFields.push(validField);
        existingFieldNames.add(field.name.toLowerCase());
      });

      if (validFields.length === 0) {
        throw new Error('No valid fields could be generated');
      }

      return validFields;
    } catch (error) {
      throw new Error(`Failed to parse generated fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isProviderAvailable(provider: 'openai' | 'claude'): boolean {
    return provider === 'openai' ? !!this.openai : !!this.anthropic;
  }
}