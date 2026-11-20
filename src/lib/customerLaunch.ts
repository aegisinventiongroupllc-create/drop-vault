import { LAUNCH_AT } from "./launchCountdown";
export const customerPrelaunch = (now = Date.now()) => now < LAUNCH_AT;