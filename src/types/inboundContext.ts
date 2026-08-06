export interface StrategyConfig {
  url: string;
  // Secret-looking values come back from the API masked as "****".
  headers?: Record<string, string>;
  timeout_seconds?: number;
}

export interface StrategyItem {
  strategy_id: string;
  external_strategy_id?: string;
  _id?: string;
  name: string;
  type: string;
  strategy_config: StrategyConfig;
  created_at?: string;
  updated_at?: string;
}

export interface InboundStrategyOption {
  strategy_id: string;
  name: string;
}
