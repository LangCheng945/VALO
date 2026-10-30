// The caller manages current-round receipts; firing does not consume a weapon receipt.
export function quoteExchange(credits, pending, currentKey, requestedKey, price) {
    if (currentKey === requestedKey) return {ok:true, credits, pending, refund:0, charge:0};
    const baseKey = pending?.baseKey ?? currentKey;
    const refund = pending?.cost ?? 0;
    const charge = requestedKey === baseKey ? 0 : price;
    if (credits + refund < charge) return {ok:false, credits, pending, refund:0, charge:0};
    return {ok:true, credits:credits+refund-charge, refund, charge,
        pending:requestedKey===baseKey ? null : {baseKey,key:requestedKey,cost:charge}};
}
