function handleUpdatePlan({ agent, args }) {
    const explanation = (args && typeof args.explanation === 'string') ? args.explanation : undefined;
    const plan = (args && Array.isArray(args.plan)) ? args.plan : [];
    agent.currentPlan = plan;
    agent.emit('plan_updated', { explanation, plan });
    return { handled: false };
}

module.exports = { handleUpdatePlan };
