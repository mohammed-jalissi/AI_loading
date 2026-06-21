import { create } from 'zustand';

export const useJarvisStore = create((set) => ({
  messages: {},
  agentHistory: [],
  activeAgent: null,
  
  addMessage: (agentId, msg) => set((state) => ({
    messages: {
      ...state.messages,
      [agentId]: [...(state.messages[agentId] || []), msg]
    }
  })),

  setAgentMessages: (agentId, msgs) => set((state) => ({
    messages: {
      ...state.messages,
      [agentId]: msgs
    }
  })),

  
  setActiveAgent: (agent) => set((state) => {
    // Only update history if we're actually changing agents
    if (state.activeAgent && state.activeAgent.id !== agent.id) {
      return {
        activeAgent: agent,
        agentHistory: [...state.agentHistory, state.activeAgent]
      };
    }
    return { activeAgent: agent };
  }),
  
  goBack: () => set((state) => {
    if (state.agentHistory.length > 0) {
      const newHistory = [...state.agentHistory];
      const previousAgent = newHistory.pop();
      return {
        activeAgent: previousAgent,
        agentHistory: newHistory
      };
    }
    return state;
  }),
  
  resetJarvis: () => set({
    messages: {},
    agentHistory: [],
    activeAgent: null
  })
}));
