import { Anthropic } from '@anthropic-ai/sdk';

// Interface for appliance info results
export interface ApplianceInfoResult {
  modelNumber: string;
  specifications: Record<string, string>;
  imageUrl?: string;
  description?: string;
  manufacturer?: string;
  productUrl?: string;
  found: boolean;
}

// Appliance info lookup service using Claude
export class ApplianceInfoService {
  private readonly claude: Anthropic;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.claude = new Anthropic({ apiKey });
  }
  
  async findApplianceInfo(modelNumber: string, manufacturer?: string): Promise<ApplianceInfoResult> {
    try {
      const searchQuery = manufacturer 
        ? `${manufacturer} ${modelNumber} specifications`
        : `${modelNumber} appliance specifications`;
        
      const message = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        system: `You are an appliance information specialist. Your task is to search online for detailed specifications and an image of an appliance using its model number.
        
Search on websites like AJ Madison, Home Depot, Lowe's, the manufacturer's official website, and other appliance retailers.

For your response, extract and structure the following information in JSON format:
- specifications: A key-value object with detailed specifications (dimensions, capacity, features, etc.)
- imageUrl: URL to a clear image of the appliance
- description: Brief description of the appliance
- manufacturer: Brand name
- productUrl: URL to the product page
- found: Boolean indicating if information was found (true/false)

If you cannot find information for the model, set "found" to false.

Your response should contain ONLY the JSON object, no other text.`,
        messages: [
          {
            role: 'user',
            content: `Please find detailed specifications and an image for the following appliance model: ${searchQuery}`
          }
        ]
      });
      
      // Parse the response as JSON
      try {
        // Extract the text content from the message
        const responseText = message.content.find(c => c.type === 'text')?.text || '{}';
        const applianceData = JSON.parse(responseText);
        
        return {
          modelNumber,
          ...applianceData,
        };
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        return {
          modelNumber,
          specifications: {},
          found: false
        };
      }
    } catch (error) {
      console.error('Error querying appliance information:', error);
      return {
        modelNumber,
        specifications: {},
        found: false
      };
    }
  }
}

// Export a singleton instance
export const applianceInfoService = new ApplianceInfoService(); 