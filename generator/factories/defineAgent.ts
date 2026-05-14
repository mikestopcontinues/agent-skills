import * as v from 'valibot';
import { type AgentDef, AgentDefSchema } from './types/agentTypes.ts';

/** A validated persona-agent definition. */
export class Agent {
  readonly def: AgentDef;
  constructor(def: AgentDef) {
    this.def = def;
  }
}

/** Validate a persona-agent definition (throws on invalid) and wrap it. */
export function defineAgent(def: AgentDef): Agent {
  v.parse(AgentDefSchema, def);
  return new Agent(def);
}
