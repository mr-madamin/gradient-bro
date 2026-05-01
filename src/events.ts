import type { GradientBroEvent, GradientBroHandler } from "./types";

export class Emitter {
  private listeners = new Map<GradientBroEvent, Set<GradientBroHandler>>();

  on(event: GradientBroEvent, handler: GradientBroHandler): void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  off(event: GradientBroEvent, handler: GradientBroHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: GradientBroEvent, value: string, instance: unknown): void {
    this.listeners.get(event)?.forEach((handler) => handler(value, instance));
  }

  clear(): void {
    this.listeners.clear();
  }
}
