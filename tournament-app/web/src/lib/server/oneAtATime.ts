// Phone writes (sign-ins and wagers) run one at a time: PocketBase has no
// transactions over its API, so two quick taps must not both take the same
// name or spend the same gold. They're rare enough that one queue is plenty.
let queue: Promise<unknown> = Promise.resolve();

export function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => {});
  return run;
}
