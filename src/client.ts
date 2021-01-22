import * as core from '@actions/core';
import * as github from '@actions/github';
import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
import { Context } from './actionContext';

export const Success = 'success';
type SuccessType = 'success';
export const Failure = 'failure';
type FailureType = 'failure';
export const Cancelled = 'cancelled';
type CancelledType = 'cancelled';
export const Custom = 'custom';
export const Always = 'always';
type AlwaysType = 'always';

export interface With {
  status: string;
  mention: string;
  author_name: string;
  if_mention: string;
  username: string;
  icon_emoji: string;
  icon_url: string;
  channel: string;
  fields: string;
}

export interface Field {
  title: string;
  value: string;
  short: boolean;
}

const groupMention = ['here', 'channel'];

export class Client {
  private webhook: IncomingWebhook;
  private github: github.GitHub;
  private context: Context;
  private with: With;

  constructor(props: With, token?: string, webhookUrl?: string) {
    this.with = props;
    if (token === undefined) {
      throw new Error('Specify secrets.GITHUB_TOKEN');
    }
    if (webhookUrl === undefined) {
      throw new Error('Specify secrets.SLACK_WEBHOOK_URL');
    }
    if (this.with.fields === '') {
      this.with.fields = 'repo,commit';
    }

    const githubToken = token ? token : '';
    this.github = new github.GitHub(githubToken);

    const contextJson = JSON.stringify(github.context);
    core.info(`Context:\n${contextJson}`);
    this.context = JSON.parse(contextJson);

    if (this.with.author_name === '') {
      this.with.author_name = this.context.actor;
    }

    this.webhook = new IncomingWebhook(webhookUrl);
  }

  async success(text: string) {
    const template = await this.payloadTemplate();
    template.attachments[0].color = 'good';
    template.text += this.mentionText(this.with.mention, Success);
    template.text += this.insertText(
      ':white_check_mark: Succeeded GitHub Actions\n',
      text,
    );

    return template;
  }

  async fail(text: string) {
    const template = await this.payloadTemplate();
    template.attachments[0].color = 'danger';
    template.text += this.mentionText(this.with.mention, Failure);
    template.text += this.insertText(
      ':no_entry: Failed GitHub Actions\n',
      text,
    );

    return template;
  }

  async cancel(text: string) {
    const template = await this.payloadTemplate();
    template.attachments[0].color = 'warning';
    template.text += this.mentionText(this.with.mention, Cancelled);
    template.text += this.insertText(
      ':warning: Canceled GitHub Actions\n',
      text,
    );

    return template;
  }

  async send(payload: string | IncomingWebhookSendArguments) {
    await this.webhook.send(payload);
    core.info('send message');
  }

  includesField(field: string) {
    const { fields } = this.with;
    const normalized = fields.replace(/ /g, '').split(',');
    return normalized.includes(field);
  }

  filterField<T extends Array<Field | undefined>, U extends undefined>(
    array: T,
    diff: U,
  ) {
    return array.filter(item => item !== diff) as Exclude<
      T extends { [K in keyof T]: infer U } ? U : never,
      U
    >[];
  }

  private async payloadTemplate() {
    const text = '';
    const { username, icon_emoji, icon_url, channel } = this.with;

    return {
      text,
      username,
      icon_emoji,
      icon_url,
      channel,
      attachments: [
        {
          color: '',
          author_name: this.with.author_name,
          author_link: `http://github.com/${this.with.author_name}`,
          author_icon: `http://github.com/${this.with.author_name}.png?size=32`,
          fields: await this.fields(),
        },
      ],
    };
  }

  private async fields(): Promise<Field[]> {
    return this.filterField(
      [
        this.repo,
        this.ref,
        this.workflow,
        this.eventName,
        this.commit,
        this.diff,
      ],
      undefined,
    );
  }

  private get diff(): Field | undefined {
    if (!this.includesField('commit')) return undefined;

    const url = this.context.payload.compare;
    const commits = url.substring(url.lastIndexOf('/') + 1);

    return {
      title: 'Diff',
      value: `<${url}|${commits}>`,
      short: true,
    };
  }

  private get commit(): Field | undefined {
    if (!this.includesField('commit')) return undefined;

    const sha = this.context.sha.slice(0, 8);
    const commit = this.context.payload.head_commit;
    const url = commit?.url;
    const comment = commit?.message
      ?.replace(/[\r\n]+/g, ' ')
      ?.replace(/\s\s+/g, ' ')
      ?.trim();

    return {
      title: 'Commit',
      value: `<${url}|${sha}... ${comment}>`,
      short: true,
    };
  }

  private get repo(): Field | undefined {
    if (!this.includesField('repo')) return undefined;

    const url = this.context.payload.repository.url;
    const name = this.context.payload.repository.full_name;

    return {
      title: 'Repo',
      value: `<${url}|${name}>`,
      short: true,
    };
  }

  private get eventName(): Field | undefined {
    if (!this.includesField('eventName')) return undefined;

    const eventType = this.context.eventName;

    return {
      title: 'Event',
      value: eventType,
      short: true,
    };
  }

  private get ref(): Field | undefined {
    if (!this.includesField('ref')) return undefined;

    const repoRef = this.context.ref;

    return { title: 'Ref', value: repoRef, short: true };
  }

  private get workflow(): Field | undefined {
    if (!this.includesField('action')) return undefined;

    const commit = this.context.payload.head_commit;
    const url = commit?.url;
    const workflow = this.context.workflow;

    return {
      title: 'Workflow',
      value: `<${url}/checks|${workflow}>`,
      short: true,
    };
  }

  private mentionText(
    mention: string,
    status: SuccessType | FailureType | CancelledType | AlwaysType,
  ) {
    if (
      !this.with.if_mention.includes(status) &&
      this.with.if_mention !== Always
    ) {
      return '';
    }

    const normalized = mention.replace(/ /g, '');
    if (groupMention.includes(normalized)) {
      return `<!${normalized}> `;
    } else if (normalized !== '') {
      const text = normalized
        .split(',')
        .map(userId => `<@${userId}>`)
        .join(' ');
      return `${text} `;
    }
    return '';
  }

  private insertText(defaultText: string, text: string) {
    return text === '' ? defaultText : text;
  }
}
