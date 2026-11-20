export type VipInterestEntry = { ticket_id: string; joined_at: string; pass_type: "PRO_PASS" | "ELITE_PASS"; position: number };

export function vipInterestTicket(entry: VipInterestEntry): string {
  return `DTT-VIP-${entry.ticket_id}`;
}

export function vipInterestTicketText(entry: VipInterestEntry): string {
  return ["DTT™ — VIP WAITING-LIST TICKET", vipInterestTicket(entry),
    `Choice: ${entry.pass_type === "PRO_PASS" ? "Pro · $1,500 · 92/8 vault split" : "Elite · $3,500 · 93/7 vault split"}`,
    `Joined: ${entry.joined_at}`, `Current shared queue position: #${entry.position} of 1,000`,
    "500 Pro and 500 Elite passes worldwide. Queue positions may change when creators leave.",
    "Congratulations! Your interest is saved to your DTT creator account.",
    "This is a free waiting-list receipt, not a guaranteed reservation, invoice, payment or active VIP pass.",
    "VIP benefits require an available pass and verified payment. No payment is due now.",
    "Payment invitations and the one-hour deadline are not active.",
    "https://dropthatthing.com", "Support: dropthatthingmedia@gmail.com"].join("\n");
}