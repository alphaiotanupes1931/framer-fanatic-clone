const { sendTicketConfirmation } = await import("./src/lib/ticket-email.server");
const res = await sendTicketConfirmation({
  buyerId: "7cbe9710-f771-4db5-af57-4050d08f154a",
  eventId: "8b668b97-05ae-4fc5-ae01-38845ae39c66",
  ticketIds: ["add65bed-6787-4c34-b0ff-4566b1eef36f"],
  idempotencyKey: `debug-${Date.now()}`,
});
console.log("RESULT", JSON.stringify(res));
