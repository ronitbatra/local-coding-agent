/**
 * EventBus - Emit plan/patch/tool/command events
 * 
 * Event-driven architecture for decoupling engine from UI.
 * Events: plan, tool_call, tool_result, patch_proposed, patch_applied,
 *         command_started, command_output, done, error
 */

export type EventType =
  | 'plan'
  | 'tool_call'
  | 'tool_result'
  | 'patch_proposed'
  | 'patch_applied'
  | 'command_started'
  | 'command_output'
  | 'done'
  | 'error';

export interface AgentEvent {
  type: EventType;
  timestamp: number;
  data: unknown;
}

export class EventBus {
  private listeners: Map<EventType, Array<(event: AgentEvent) => void>> = new Map();

  on(type: EventType, handler: (event: AgentEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
  }

  emit(type: EventType, data: unknown): void {
    const event: AgentEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    const handlers = this.listeners.get(type) || [];
    handlers.forEach((handler) => handler(event));
  }

  off(type: EventType, handler: (event: AgentEvent) => void): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}
