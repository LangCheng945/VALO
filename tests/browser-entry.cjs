// Continue through the mandatory first-entry character step in gameplay regressions.
exports.confirmAgentIfNeeded=async page=>{if(await page.locator('#agent-picker').isVisible())await page.locator('#agent-picker-confirm').click();};
