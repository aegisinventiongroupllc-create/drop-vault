/** Navigation intent only. The selected account type is saved by the server RPC. */
const KEY = "dtt_choose_account_after_login";

export function requestAccountSelection(): void {
  sessionStorage.setItem(KEY, "1");
}

export function consumeAccountSelection(): boolean {
  const requested = sessionStorage.getItem(KEY) === "1";
  sessionStorage.removeItem(KEY);
  return requested;
}

export function cancelAccountSelection(): void {
  sessionStorage.removeItem(KEY);
}