export interface EventClient {
  write(chunk: string): unknown;
}

export class LiveUpdates {
  private readonly clients = new Set<EventClient>();

  connect(client: EventClient): void {
    this.clients.add(client);
    client.write("data: connected\n\n");
  }

  disconnect(client: EventClient): void { this.clients.delete(client); }

  publish(): void {
    for (const client of this.clients) client.write("data: updated\n\n");
  }
}
