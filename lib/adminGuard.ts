export function assertAdmin(headers: Headers) {
  const token = headers.get('x-admin-token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    const e: any = new Error('unauthorized');
    e.status = 401;
    throw e;
  }
}
