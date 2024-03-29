import OpenAI from "openai";
import fs from "fs";
import dotnet from "dotenv";

dotnet.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 60 * 1000,
});

const assistantFunctions = {
  createThread: async () => {
    try {
      const response = await openai.beta.threads.create();
      if (response && response.id) {
        // Extract threadId from the response
        return response.id;
      } else {
        throw new Error("Failed to create thread");
      }
    } catch (error) {
      console.error("Error creating thread:", error);
      throw error;
    }
  },
  

  uploadFile: async (filelocation) => {
    try {

      if (!filelocation) {
        return;
      }
      const file = await openai.files.create({
        file: fs.createReadStream(filelocation.path),
        purpose: "assistants",
      });
      console.log("File in chat: ", file.id);

      // Step 3: Delete the file from file location
      fs.unlink(filelocation.path, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          return;
        }
        console.log('File deleted successfully');
      });

      return file.id; // Return the file id
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },



  addMessage: async (threadId, message,file) => {
    try {
      // Add the message to the thread using OpenAI
      // console.log(threadId, message);
      const response = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
        file_ids: file
      });
      console.log("ADD MESSAGE",response);
      return response;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  },

  getMessages: async (threadId) => {
    try {
      if (!threadId) {
        return {
          message: "Thread ID is required in the request body",
        };
      }

      const response = await openai.beta.threads.messages.list(threadId);

      const messages = response.data;
      let UserMessage = null;
      let AssistantMessage = null;

      for (const message of messages) {
        if (["user", "assistant"].includes(message.role)) {
          // Assuming you have some way to identify the content type and value
          for (const content of message.content) {
            if (content.type === "text") {
              // Assuming you have some way to display the content
              const messageText = `${content.text.value}`;

              if (message.role === "user" && !UserMessage) {
                UserMessage = messageText;
              } else if (message.role === "assistant" && !AssistantMessage) {
                AssistantMessage = messageText;
              }

              // console.log(messageText);

              if (UserMessage && AssistantMessage) {
                break;
              }
            }
          }
        }
      }

      return {
        data: {
          UserMessage,
          AssistantMessage,
        },
      };
    } catch (error) {
      console.error("Error in getMessages function:", error);
      return {
        status: 500,
        message: "Internal Server Error",
      };
    }
  },
  getAssistant: async () => {
    try {
      const respose = await openai.beta.assistants.retrieve(
        process.env.OPENAI_ASSISTANT_ID
      );
      return respose;
    } catch (error) {
      console.log(error.name, error.message);
      throw error;
    }
  },
  startRun: async (threadId) => {
    try {
      const today = new Date();
      let options = {
        assistant_id: process.env.OPENAI_ASSISTANT_ID,
      };
      const respose = await openai.beta.threads.runs.create(threadId, options);
      console.log(respose.id);
      return respose.id;
    } catch (error) {
      console.log(error.name, error.message);
      throw error;
    }
  },

  getRunStatus: async (threadId, runID) => {
    try {
      let runstatus;

      do {
        const run = await openai.beta.threads.runs.retrieve(threadId, runID);
        runstatus = run.status;
        // console.log(runstatus);

        if (runstatus !== "completed") {
          // Add a delay before retrying the function
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Adjust the delay (in milliseconds) as needed
        }
      } while (runstatus !== "completed");

      return true;
    } catch (error) {
      console.error("Error in getRunStatus function:", error);
      return {
        status: 500,
        message: "Internal Server Error",
      };
    }
  },
};

export default assistantFunctions;