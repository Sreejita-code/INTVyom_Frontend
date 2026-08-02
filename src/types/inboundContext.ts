export interface StrategyConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface StrategyItem {
  strategy_id: string;
  external_strategy_id?: string;
  _id?: string;
  name: string;
  type: string;
  strategy_config: StrategyConfig;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
