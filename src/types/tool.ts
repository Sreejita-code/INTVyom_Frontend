export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  _enumString?: string;
}

export interface ToolDetail {
  tool_id?: string;
  tool_name: string;
  tool_description: string;
  tool_execution_type: "webhook" | "static_return";
  tool_execution_config: any;
  tool_parameters: ToolParameter[];
}

export interface ToolSummary {
  tool_id?: string;
  tool_name: string;
  tool_description: string;
  tool_execution_type: "webhook" | "static_return";
}
