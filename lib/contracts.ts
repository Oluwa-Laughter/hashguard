import { type Address } from "viem";

export const hashGuardAddress = (process.env.NEXT_PUBLIC_HASHGUARD_ADDRESS || undefined) as Address | undefined;
export const usernameRegistryAddress = (process.env.NEXT_PUBLIC_USERNAME_REGISTRY_ADDRESS || undefined) as Address | undefined;
export const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || undefined) as Address | undefined;
export const scheduledPaymentAddress = (process.env.NEXT_PUBLIC_SCHEDULED_PAYMENT_ADDRESS || undefined) as Address | undefined;

export const contractsConfigured = Boolean(hashGuardAddress && usernameRegistryAddress);

export const hashGuardAbi = [
  { type: "function", name: "nextEscrowId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "createNativeEscrow", stateMutability: "payable", inputs: [{ name: "recipient", type: "address" }, { name: "expiry", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "createTokenEscrow", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "expiry", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "escrowId", type: "uint256" }], outputs: [] },
  { type: "function", name: "refund", stateMutability: "nonpayable", inputs: [{ name: "escrowId", type: "uint256" }], outputs: [] },
  { type: "function", name: "batchNativePayment", stateMutability: "payable", inputs: [{ name: "recipients", type: "address[]" }, { name: "amounts", type: "uint256[]" }], outputs: [] },
  { type: "function", name: "batchTokenPayment", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "recipients", type: "address[]" }, { name: "amounts", type: "uint256[]" }], outputs: [] },
  { type: "function", name: "getEscrow", stateMutability: "view", inputs: [{ name: "escrowId", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "sender", type: "address" }, { name: "recipient", type: "address" }, { name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "expiry", type: "uint256" }, { name: "status", type: "uint8" }] }] },
  { type: "event", name: "EscrowCreated", inputs: [{ indexed: true, name: "escrowId", type: "uint256" }, { indexed: true, name: "sender", type: "address" }, { indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "token", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "expiry", type: "uint256" }] },
  { type: "event", name: "EscrowClaimed", inputs: [{ indexed: true, name: "escrowId", type: "uint256" }, { indexed: true, name: "recipient", type: "address" }] },
  { type: "event", name: "EscrowRefunded", inputs: [{ indexed: true, name: "escrowId", type: "uint256" }, { indexed: true, name: "sender", type: "address" }] }
] as const;

export const usernameRegistryAbi = [
  { type: "function", name: "registerUsername", stateMutability: "nonpayable", inputs: [{ name: "username", type: "string" }], outputs: [] },
  { type: "function", name: "resolveUsername", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ type: "address" }] },
  { type: "function", name: "isUsernameAvailable", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getUsername", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "string" }] }
] as const;

export const erc20Abi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }
] as const;

export const scheduledPaymentAbi = [
  { type: "function", name: "nextScheduleId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "createSchedule", stateMutability: "payable", inputs: [{ name: "recipient", type: "address" }, { name: "token", type: "address" }, { name: "amountPerPeriod", type: "uint256" }, { name: "interval", type: "uint256" }, { name: "totalPeriods", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "executePayment", stateMutability: "nonpayable", inputs: [{ name: "scheduleId", type: "uint256" }], outputs: [] },
  { type: "function", name: "cancelSchedule", stateMutability: "nonpayable", inputs: [{ name: "scheduleId", type: "uint256" }], outputs: [] },
  { type: "function", name: "getSchedule", stateMutability: "view", inputs: [{ name: "scheduleId", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "sender", type: "address" }, { name: "recipient", type: "address" }, { name: "token", type: "address" }, { name: "amountPerPeriod", type: "uint256" }, { name: "interval", type: "uint256" }, { name: "totalPeriods", type: "uint256" }, { name: "periodsPaid", type: "uint256" }, { name: "nextPaymentTime", type: "uint256" }, { name: "status", type: "uint8" }] }] },
  { type: "function", name: "getRemainingAmount", stateMutability: "view", inputs: [{ name: "scheduleId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isPaymentDue", stateMutability: "view", inputs: [{ name: "scheduleId", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getScheduleCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getSchedulesBySender", stateMutability: "view", inputs: [{ name: "sender", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { type: "event", name: "ScheduleCreated", inputs: [{ indexed: true, name: "scheduleId", type: "uint256" }, { indexed: true, name: "sender", type: "address" }, { indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "token", type: "address" }, { indexed: false, name: "amountPerPeriod", type: "uint256" }, { indexed: false, name: "totalPeriods", type: "uint256" }, { indexed: false, name: "totalAmount", type: "uint256" }, { indexed: false, name: "nextPaymentTime", type: "uint256" }] },
  { type: "event", name: "PaymentExecuted", inputs: [{ indexed: true, name: "scheduleId", type: "uint256" }, { indexed: true, name: "periodNumber", type: "uint256" }, { indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "ScheduleCancelled", inputs: [{ indexed: true, name: "scheduleId", type: "uint256" }, { indexed: true, name: "sender", type: "address" }, { indexed: false, name: "refundedAmount", type: "uint256" }] }
] as const;
