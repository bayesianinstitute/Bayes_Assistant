import OpenAI from "openai";
import dotnet from 'dotenv';

dotnet.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 60 * 1000,
});

const assistantFunctions = {
    getAssistant: async () => {
        try {
            const respose =await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID);
            return respose;
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },
    createThread: async () => {
        try {
            return await openai.beta.threads.create();
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },

    getThread: async ({ threadId }) => {
        try {
            return await openai.beta.threads.retrieve(threadId);
        } catch (error) {
            console.log(error.name, error.message);
            return {
                error: true,
                message: error.message,
            };
        }
    },

    deleteThread: async ({ threadId }) => {
        try {
            return await openai.beta.threads.del(threadId);
        } catch (error) {
            console.log(error.name, error.message);
            return {
                error: true,
                message: error.message,
            };
        }
    },

    addMessage: async ({ threadId, message, messageId, userId, name }) => {
        try {
            let metadata = {};
            metadata['id'] = messageId;
            metadata['name'] = name;
            metadata['user_id'] = userId;

            return await openai.beta.threads.messages.create(
                threadId,
                {
                    role: 'user',
                    content: message,
                    metadata,
                }
            );
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },

    getMessages: async ({ threadId }) => {
        try {
            const messages = await openai.beta.threads.messages.list(threadId);
            return messages.data;
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },

    startRun: async ({ threadId, instructions }) => {
        try {
            const today = new Date();
            let options = {
                assistant_id: process.env.OPENAI_ASSISTANT_ID,
            };

            if (instructions) {
                options.instructions = instructions;
            }

            return await openai.beta.threads.runs.create(
                threadId,
                options
            );
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },

    getRun: async ({ threadId, runId }) => {
        try {
            return await openai.beta.threads.runs.retrieve(threadId, runId);
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },

    submitOutputs: async ({ threadId, runId, tool_outputs }) => {
        try {
          const options = {
            threadId,
            runId,
          };
      
          if (tool_outputs) {
            options.tool_outputs = tool_outputs;
          }
      
          return await openai.beta.threads.runs.submitToolOutputs(options);
        } catch (error) {
          console.log(error.name, error.message);
          throw error;
        }
      },

    chatCompletion: async ({ model = 'gpt-3.5-turbo-1106', max_tokens = 2048, temperature = 0, messages, tools }) => {
        let options = { messages, model, temperature, max_tokens };

        if (tools) {
            options.tools = tools;
        }

        try {
            const result = await openai.chat.completions.create(options);
            console.log(result);
            return result.choices[0];
        } catch (error) {
            console.log(error.name, error.message);
            throw error;
        }
    },
};

export default assistantFunctions;
