/* eslint-disable  @typescript-eslint/no-explicit-any */

export interface PayloadRepository {
  [key: string]: any;

  url: string;
}

export interface Commit {
  [key: string]: any;

  url: string;
  message: string;
}

export interface WebhookPayload {
  [key: string]: any;

  repository: PayloadRepository;
  commits: Array<Commit>;
}

export declare interface Context {
  payload: WebhookPayload;
  eventName: string;
  sha: string;
  ref: string;
  workflow: string;
  actor: string;
}
