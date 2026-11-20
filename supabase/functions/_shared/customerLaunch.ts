export const CUSTOMER_LAUNCH_AT = Date.parse("2027-01-01T05:00:00Z");
export const customerCheckoutOpen = (now = Date.now()) => now >= CUSTOMER_LAUNCH_AT;
export async function entryPriceFor(server: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }, userId: string): Promise<number> {
  const { data, error } = await server.rpc("customer_entry_price", { _user_id: userId });
  if (error || (Number(data) !== 10 && Number(data) !== 20)) throw new Error("Entry offer could not be verified");
  return Number(data);
}