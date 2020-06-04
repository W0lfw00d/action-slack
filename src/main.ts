import * as core from '@actions/core';
import { Client, Success, Failure, Cancelled, Custom } from './client';
import { IncomingWebhookSendArguments } from '@slack/webhook';

async function run(): Promise<void> {
  try {
    const status = core.getInput('status', { required: true }).toLowerCase();
    const mention = core.getInput('mention');
    const author_name = core.getInput('author_name');
    const if_mention = core.getInput('if_mention').toLowerCase();
    const text = core.getInput('text');
    const username = core.getInput('username');
    const icon_emoji = core.getInput('icon_emoji');
    const icon_url = core.getInput('icon_url');
    const channel = core.getInput('channel');
    const custom_payload = core.getInput('custom_payload');
    const payload = core.getInput('payload');
    const fields = core.getInput('fields');
    const actorName = process.env.GITHUB_ACTOR;

    core.info(`status: ${status}`);
    core.info(`mention: ${mention}`);
    core.info(`author_name: ${author_name}`);
    core.info(`if_mention: ${if_mention}`);
    core.info(`text: ${text}`);
    core.info(`username: ${username}`);
    core.info(`icon_emoji: ${icon_emoji}`);
    core.info(`icon_url: ${icon_url}`);
    core.info(`channel: ${channel}`);
    core.info(`custom_payload: ${custom_payload}`);
    core.info(`payload: ${payload}`);
    core.info(`fields: ${fields}`);
    core.info(`actorName: ${actorName}`);

    const client = new Client(
      {
        status,
        mention,
        author_name,
        if_mention,
        username,
        icon_emoji,
        icon_url,
        channel,
        fields,
      },
      process.env.GITHUB_TOKEN,
      process.env.SLACK_WEBHOOK_URL,
    );

    switch (status) {
      case Success:
        await client.send(await client.success(text));
        break;
      case Failure:
        await client.send(await client.fail(text));
        break;
      case Cancelled:
        await client.send(await client.cancel(text));
        break;
      case Custom:
        /* eslint-disable no-var */
        var evalPayload: IncomingWebhookSendArguments = eval(
          `evalPayload = ${custom_payload}`,
        );
        /* eslint-enable */
        await client.send(evalPayload);
        break;
      default:
        throw new Error(
          'You can specify success or failure or cancelled or custom',
        );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
