/** Each effect owns its channel, including during Strict Mode and exit animations. */
export function realtimeTopic(scope:string):string {
 return `${scope}:${crypto.randomUUID()}`;
}
