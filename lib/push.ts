// Web push is not used in the CrazyGames version.
// This stub keeps all call sites compiling without importing web-push.

export async function sendPushToUser(
  _userId: string,
  _title: string,
  _body: string,
  _url = "/notifications",
): Promise<{ sent: number; failed: number; total: number }> {
  return { sent: 0, failed: 0, total: 0 };
}
