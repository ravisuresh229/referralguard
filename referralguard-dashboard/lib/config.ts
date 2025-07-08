export interface Config {
  ENV: string;
  IS_PRODUCTION: boolean;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION: string;
  S3_BUCKET_NAME: string;
  LOCAL_OUTPUTS_DIR: string;
  LOCAL_MODELS_DIR: string;
  LOCAL_RAW_DATA_DIR: string;
  S3_OUTPUTS_PREFIX: string;
  S3_MODELS_PREFIX: string;
  S3_RAW_DATA_PREFIX: string;
  INSIGHTS_FILE: string;
  MODEL_FILE: string;
}

class ConfigManager {
  private config: Config;

  constructor() {
    this.config = {
      ENV: process.env.ENV || 'development',
      IS_PRODUCTION: process.env.ENV === 'production',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'referralguard-data',
      LOCAL_OUTPUTS_DIR: 'outputs',
      LOCAL_MODELS_DIR: 'models',
      LOCAL_RAW_DATA_DIR: 'raw-data',
      S3_OUTPUTS_PREFIX: 'outputs/',
      S3_MODELS_PREFIX: 'models/',
      S3_RAW_DATA_PREFIX: 'raw-data/',
      INSIGHTS_FILE: 'real_insights.json',
      MODEL_FILE: 'referral_risk_model.pkl'
    };
  }

  get insightsPath(): string {
    if (this.config.IS_PRODUCTION && this.config.AWS_ACCESS_KEY_ID) {
      return `s3://${this.config.S3_BUCKET_NAME}/${this.config.S3_OUTPUTS_PREFIX}${this.config.INSIGHTS_FILE}`;
    } else {
      return `${this.config.LOCAL_OUTPUTS_DIR}/${this.config.INSIGHTS_FILE}`;
    }
  }

  get modelPath(): string {
    if (this.config.IS_PRODUCTION && this.config.AWS_ACCESS_KEY_ID) {
      return `s3://${this.config.S3_BUCKET_NAME}/${this.config.S3_MODELS_PREFIX}${this.config.MODEL_FILE}`;
    } else {
      return `${this.config.LOCAL_MODELS_DIR}/${this.config.MODEL_FILE}`;
    }
  }

  get outputsDir(): string {
    if (this.config.IS_PRODUCTION && this.config.AWS_ACCESS_KEY_ID) {
      return `s3://${this.config.S3_BUCKET_NAME}/${this.config.S3_OUTPUTS_PREFIX}`;
    } else {
      return this.config.LOCAL_OUTPUTS_DIR;
    }
  }

  get modelsDir(): string {
    if (this.config.IS_PRODUCTION && this.config.AWS_ACCESS_KEY_ID) {
      return `s3://${this.config.S3_BUCKET_NAME}/${this.config.S3_MODELS_PREFIX}`;
    } else {
      return this.config.LOCAL_MODELS_DIR;
    }
  }

  get isProduction(): boolean {
    return this.config.IS_PRODUCTION;
  }

  get awsCredentials(): { accessKeyId?: string; secretAccessKey?: string; region: string } {
    return {
      accessKeyId: this.config.AWS_ACCESS_KEY_ID,
      secretAccessKey: this.config.AWS_SECRET_ACCESS_KEY,
      region: this.config.AWS_REGION
    };
  }
}

export const config = new ConfigManager(); 