// used to get the most specific value available for the provided secret name
// Autotask specific: Service_Stage_Task_Secret
// Stage specific: Service_Stage_Secret
// Service specific: Service_Secret
// Global: Secret
export const ScopedSecretsProvider = function (event: any) {
  const STACK_DELIM = '_';
  const namespace = event.autotaskName as any;
  const key = function* (name: string) {
    const arr = namespace.split(STACK_DELIM).concat(name);
    do yield arr.join(STACK_DELIM);
    while (arr.splice(-2, 2, name).length > 1);
  };
  const find = (name: any, target: any) => {
    for (const i of key(name)) if (i in target) return target[i];
  };
  //eslint-disable-next-line
  return new Proxy(event.secrets, {get: (target, name) => find(name, target)});
};
