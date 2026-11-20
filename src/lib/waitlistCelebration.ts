export function shouldCelebrateWaitlistJoin(wasJoined: boolean, saved: boolean): boolean {
  return !wasJoined && saved;
}