import axios from 'axios';

// Types for HomeSpy API responses
export interface HomeSpyAgeResult {
  age: {
    years: number;
    months: number;
  };
  manufacturer: string;
  model: string;
  type: string;
  manufactureDate: string;
  estimatedLifespan: {
    years: number;
    months: number;
  };
  remainingLifespan: {
    years: number;
    months: number;
  };
}

// HomeSpy API client class
export class HomeSpyClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = process.env.HOMESPY_API_KEY;
    if (!apiKey) {
      throw new Error('HOMESPY_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.homespy.io'; // Replace with actual HomeSpy API base URL
  }

  async getApplianceAge(modelNumber: string, serialNumber: string): Promise<HomeSpyAgeResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/appliance-age`,
        {
          modelNumber,
          serialNumber
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data.message || 'HomeSpy API request failed');
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from HomeSpy API');
      } else {
        // Something happened in setting up the request
        throw new Error('Error setting up HomeSpy API request');
      }
    }
  }
}

// Export a singleton instance
export const homeSpyClient = new HomeSpyClient(); 