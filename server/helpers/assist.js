import OpenAI from "openai";
import dotnet from 'dotenv';
import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import { ObjectId } from "mongodb";

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
    saveThreadAndUser: (userId, threadId) => {
        return new Promise(async (resolve, reject) => {
          try {
            const result = await db.collection(collections.THREAD).insertOne
            ({
              userId,
              threadId,
              createdAt: new Date(),
            });
    
            console.log(result);
    
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      },


      getThread: ({ threadId }) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Fetch the thread from the database based on the provided threadId
            const thread = await db.collection(collections.THREAD).findOne({ threadId });
      
            if (!thread) {
              resolve({
                error: true,
                message: 'Thread not found in the database',
              });
            } else {
              // Return the fetched thread details
              resolve({
                thread,
              });
            }
          } catch (error) {
            console.error('Error fetching thread:', error);
            reject({
              error: true,
              message: error.message,
            });
          }
        });
      },

    deleteThread: ({ threadId }) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Check if the thread exists in the database
            const existingThread = await db.collection(collections.THREAD).findOne({ threadId });
      
            if (!existingThread) {
              resolve({
                message: 'Thread not found in the database',
              });
              return;
            }
      
            // If the thread exists in the database, delete it
            const databaseResponse = await db.collection(collections.THREAD).deleteOne({ threadId });
      
            console.log('Database response:', databaseResponse);
      
            resolve({
              database: databaseResponse,
            });
          } catch (error) {
            console.error('Error deleting thread:', error);
            reject({
              error: true,
              message: error.message,
            });
          }
        });
      },
      
      addMessage: ({ threadId, message }) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Add the message to the thread using OpenAI
            const response = await openai.beta.threads.messages.create(
              threadId,
              {
                role: 'user',
                content: message,
              }
            );
      
            // Extract user information from the OpenAI response
  
            await new Promise((resolve, reject) => {
              db.collection(collections.MESSAGE)
                .insertOne({
                  userId: "afaan",
                  threadId,
                  response,
                  createdAt: new Date(),
                })
                .then((result) => {
                  console.log(result);
                  resolve(result);
                })
                .catch((error) => {
                  console.error('Error saving message response:', error);
                  reject(error);
                });
            });
      
            resolve(response);
          } catch (error) {
            console.error('Error adding message:', error);
            reject(error);
          }
        });
      },
      
      getMessages: async ({ threadId }) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Assuming you have a collection named MESSAGE in your database
            const messages = await db.collection(collections.MESSAGE).find({ threadId }).toArray();
      
            resolve(messages);
          } catch (error) {
            console.error('Error fetching messages from the database:', error);
            reject(error);
          }
        });
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
