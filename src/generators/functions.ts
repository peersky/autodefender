import {YAutotask, YRelayer} from '@openzeppelin/defender-serverless/lib/types';
import {ActionParam} from '../types';
import _ from 'lodash';

export const generateFunction = (
  functionPath: string,
  props?: ActionParam<any>
): YAutotask => {
  const relayName = props?.relayNetwork
    ? props?.customRelay ?? 'DEFAULT_READER' + '_' + props?.relayNetwork
    : undefined;
  const relayResourcePath =
    '${self:resources.Resources.relayers.' + relayName + '}';
  const action: YAutotask = {
    name: _.last(functionPath.split('/')) as string,
    path: functionPath,
    trigger: {
      type: 'sentinel',
    },
    relayer: relayName ? (relayResourcePath as any as YRelayer) : undefined,
    paused: false,
  };

  if (props?.relayNetwork) {
    action.name += '_' + props.relayNetwork;
    const relativeYrelay =
      '${self:resources.Resources.relayers.' + relayName + '}';

    action.relayer = relativeYrelay as any as YRelayer;
  }

  return action;
};
