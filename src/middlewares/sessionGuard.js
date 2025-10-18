export function sessionGuard() {
  return async (ctx, next) => {
    return next();
  };
}
