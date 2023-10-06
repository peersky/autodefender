import {YNotification} from '@openzeppelin/defender-serverless/lib/types';

export function getSlackNotifyChannel(
  url: string,
  name = 'Slack notifications'
): YNotification {
  return {
    type: 'slack',
    paused: false,
    name: name,
    config: {
      url,
    },
  };
}
