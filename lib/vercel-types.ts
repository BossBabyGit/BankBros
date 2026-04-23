import type { IncomingMessage, ServerResponse } from 'http';

export type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: any;
};

export type VercelResponse = ServerResponse & {
  status(statusCode: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: unknown): VercelResponse;
};
