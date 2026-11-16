export type SystemName = "yjs" | "sharedb";

export interface TrafficCounters {
  bytesIn: number;
  bytesOut: number;
}

export interface Shape {
  x: number;
  y: number;
}

export interface SyncClient {
  readonly id: string;
  ready(): Promise<void>;
  text(): string;
  insert(position: number, text: string): void;
  deleteRange(position: number, length: number): void;
  onRemoteInsert(handler: (inserted: string) => void): void;

  shapes(): Record<string, Shape>;
  moveShape(shapeId: string, shape: Shape): void;
  onRemoteShape(handler: (shapeId: string) => void): void;

  goOffline(): Promise<void>;
  goOnline(): Promise<void>;
  close(): Promise<void>;
}

export interface ServerMetrics {
  cpuUserMicros: number;
  cpuSystemMicros: number;
  rssBytes: number;
}

export interface DocSize {
  snapshotBytes: number;
  historyBytes: number;
}

export interface SystemDefinition {
  name: SystemName;
  label: string;
  serverEntry: string;
  connect(url: string, id: string, traffic: TrafficCounters): SyncClient;
  docSize(ask: <T>(message: string) => Promise<T>): Promise<DocSize>;
}
