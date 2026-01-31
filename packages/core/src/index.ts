/**
 * @local-agent/core
 * 
 * Core engine for the local coding agent.
 * This package contains the runtime, policy, tools, and model adapters.
 * No UI dependencies.
 */

export * from './runtime/AgentRunner';
export * from './runtime/EventBus';
export * from './runtime/SessionStore';
export * from './policy/Policy';
export * from './policy/validate';
export * from './tools/Tool';
