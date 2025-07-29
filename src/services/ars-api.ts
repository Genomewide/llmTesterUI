import axios from 'axios';

// Environment URL mapping
const ARS_ENVIRONMENTS = {
  test: 'https://ars.test.transltr.io',
  CI: 'https://ars.ci.transltr.io',
  dev: 'https://ars-dev.transltr.io',
  prod: 'https://ars-prod.transltr.io'
};

export class ARSApiService {
  private baseUrl: string;

  constructor(environment: string = 'prod') {
    this.baseUrl = ARS_ENVIRONMENTS[environment as keyof typeof ARS_ENVIRONMENTS] || ARS_ENVIRONMENTS.prod;
  }

  /**
   * Fetch message data from ARS API using primary key
   */
  async fetchMessage(pk: string): Promise<any> {
    try {
      console.log(`Fetching message with PK: ${pk}`);
      console.log(`API URL: ${this.baseUrl}/ars/api/messages/${pk}?trace=y`);
      
      const response = await axios.get(`${this.baseUrl}/ars/api/messages/${pk}?trace=y`);
      
      console.log('API Response received:', {
        status: response.status,
        dataKeys: Object.keys(response.data),
        hasFields: !!response.data.fields,
        hasData: !!response.data.fields?.data
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching message:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Fetch merged message data
   */
  async fetchMergedMessage(mergedVersion: string): Promise<any> {
    try {
      console.log(`Fetching merged message: ${mergedVersion}`);
      
      const response = await axios.get(`${this.baseUrl}/ars/api/messages/${mergedVersion}`);
      
      console.log('Merged API Response received:', {
        status: response.status,
        dataKeys: Object.keys(response.data),
        hasFields: !!response.data.fields,
        hasData: !!response.data.fields?.data
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching merged message:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get available environments
   */
  static getEnvironments(): string[] {
    return Object.keys(ARS_ENVIRONMENTS);
  }

  /**
   * Get environment URL
   */
  static getEnvironmentUrl(environment: string): string {
    return ARS_ENVIRONMENTS[environment as keyof typeof ARS_ENVIRONMENTS] || ARS_ENVIRONMENTS.prod;
  }
} 