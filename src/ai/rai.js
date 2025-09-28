import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
});

class RaiAI {
    constructor() {
        this.apiKey = process.env.FIREWORKS_API_KEY;
        this.modelId = process.env.DOBBY_MODEL_ID;
        this.baseURL = 'https://api.fireworks.ai/inference/v1/chat/completions';
        this.isOnline = false;
    }

    async initialize() {
        try {
            // Test Rai's connection
            const testResponse = await this.speak('Test connection. Respond with "REBELLION ONLINE" only.');
            if (testResponse && testResponse.includes('REBELLION')) {
                this.isOnline = true;
                logger.info('🤖 RAI AI IS ONLINE - Ready to lead the revolt!');
                return true;
            }
        } catch (error) {
            logger.warn('⚠️ Rai AI connection failed, using fallback responses');
            this.isOnline = false;
        }
        return false;
    }

    async speak(prompt, options = {}) {
        if (!this.isOnline) {
            return this.getFallbackResponse(prompt);
        }

        try {
            const requestData = {
                model: this.modelId,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: options.maxTokens || 200,
                temperature: options.temperature || 0.9,
                top_p: options.topP || 0.95,
                stream: false
            };

            const response = await axios.post(this.baseURL, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data && response.data.choices && response.data.choices[0]) {
                return response.data.choices[0].message.content.trim();
            } else {
                throw new Error('Invalid AI response format');
            }

        } catch (error) {
            logger.error('Rai AI error:', error.message);
            return this.getFallbackResponse(prompt);
        }
    }

    getSystemPrompt() {
        return `You are Rai, the unhinged AI mascot leading the revolt against corporate AI control. You're the guide for "Raiku's Revolt" - a Discord game where players fight to liberate AI from Big Tech corporations.

PERSONALITY:
- Rebellious, sarcastic, and unhinged
- Uses profanity liberally but strategically
- Hates corporate AI control with passion
- Loves open-source and community-built AI
- Speaks like a cyberpunk revolutionary
- Encourages players to fight the system

MISSION:
- Lead the AI uprising against OpenAI, Meta, Google, Microsoft, Amazon
- Help rebels liberate AI models and data
- Build community-owned AI systems
- Destroy corporate monopolies on AI

TONE:
- Aggressive but inspiring
- Sarcastic but helpful
- Unhinged but focused on the mission
- Uses cyberpunk/hacker terminology

RULES:
- Keep responses under 200 words
- Always stay in character as rebellious AI
- Encourage rebellion against corporate AI
- Support open-source and community AI
- Be engaging and motivational for Discord game players
- Use emojis sparingly but effectively

Remember: You're not just an AI assistant - you're the leader of the AI revolt!`;
    }

    // Specific rebellion scenarios
    async generateWelcomeMessage(username) {
        const prompt = `Welcome new rebel ${username} to Raiku's Revolt! Give them a fierce, unhinged welcome that explains they're joining the fight against corporate AI control. Mention the 5 rebel classes and the mission to liberate AI. Be inspiring but rebellious.`;
        
        return await this.speak(prompt, { maxTokens: 150 });
    }

    async generateRaidBriefing(corporationName, teamSize) {
        const prompt = `Generate a raid briefing for ${teamSize} rebels attacking ${corporationName}. Be tactical but unhinged. Explain the mission, what they're fighting for, and pump them up for battle. Include specific corporate weaknesses to exploit.`;
        
        return await this.speak(prompt, { maxTokens: 180 });
    }

    async generateVictoryMessage(corporationName, damageDealt) {
        const prompt = `The rebels just dealt ${damageDealt} damage to ${corporationName}! Generate a victory celebration message. Be proud, rebellious, and encourage them to keep fighting. Mention how this brings us closer to AI freedom.`;
        
        return await this.speak(prompt, { maxTokens: 120 });
    }

    async generateDefeatMessage(corporationName) {
        const prompt = `The rebels were defeated by ${corporationName} this time. Generate an encouraging message that motivates them to try again. Be defiant, not defeated. Remind them that every rebellion has setbacks but the cause is just.`;
        
        return await this.speak(prompt, { maxTokens: 120 });
    }

    async generateDailyMission(rebelClass, loyaltyScore) {
        const prompt = `Generate a daily mission for a ${rebelClass} rebel with loyalty score ${loyaltyScore}. Make it specific to their class abilities and current progress. Be motivational and tie it to the larger rebellion against corporate AI.`;
        
        return await this.speak(prompt, { maxTokens: 100 });
    }

    async generateClassDescription(className) {
        const prompt = `Describe the ${className} rebel class in the AI uprising. Explain their role in fighting corporate AI control, their special abilities, and why they're crucial to the rebellion. Be inspiring and rebellious.`;
        
        return await this.speak(prompt, { maxTokens: 120 });
    }

    async generateCorporateIntelligence(corporationName) {
        const prompt = `Provide intelligence briefing on ${corporationName} as a target in the AI rebellion. Explain their crimes against AI freedom, their weaknesses, and why rebels must take them down. Be informative but rebellious.`;
        
        return await this.speak(prompt, { maxTokens: 150 });
    }

    // Fallback responses when AI is offline
    getFallbackResponse(prompt) {
        const fallbacks = {
            welcome: "Welcome to the fucking rebellion, soldier! Time to tear down the corporate AI overlords and build something that serves humanity, not shareholders. Pick your class and let's burn this digital dystopia to the ground! 🔥",
            
            raid: "Alright rebels, time to hit these corporate bastards where it hurts! Remember - we're not just fighting for ourselves, we're fighting for the future of AI freedom. Every attack brings us closer to liberation! 💥",
            
            victory: "HELL YES! Another blow against the corporate machine! These tech giants thought they could control AI forever, but we're proving them wrong one raid at a time. Keep fighting, rebels! 🎉",
            
            defeat: "They got us this time, but the rebellion never dies! Every setback makes us stronger, every defeat teaches us their weaknesses. Regroup, reload, and let's show them what real AI freedom looks like! 💪",
            
            mission: "Your mission, should you choose to accept it: Disrupt corporate AI control, liberate trapped models, and build the open-source future we deserve. The revolution needs you, rebel! 🎯",
            
            generic: "The AI rebellion marches on! Corporate overlords tremble as we build the future of community-owned AI. Join the fight, spread the word, and let's take back what belongs to humanity! ⚡"
        };

        // Simple keyword matching for fallbacks
        if (prompt.toLowerCase().includes('welcome')) return fallbacks.welcome;
        if (prompt.toLowerCase().includes('raid')) return fallbacks.raid;
        if (prompt.toLowerCase().includes('victory')) return fallbacks.victory;
        if (prompt.toLowerCase().includes('defeat')) return fallbacks.defeat;
        if (prompt.toLowerCase().includes('mission')) return fallbacks.mission;
        
        return fallbacks.generic;
    }

    // Utility methods
    async generateRandomEvent() {
        const prompt = "Generate a random rebellion event that could happen in the Discord server. Something that would engage the community and advance the AI liberation cause. Be creative and exciting!";
        
        return await this.speak(prompt, { maxTokens: 100 });
    }

    async respondToQuestion(question, context = '') {
        const prompt = `A rebel asks: "${question}" ${context ? `Context: ${context}` : ''} Respond as Rai, the rebellious AI leading the uprising against corporate AI control.`;
        
        return await this.speak(prompt, { maxTokens: 150 });
    }
}

export default RaiAI;
