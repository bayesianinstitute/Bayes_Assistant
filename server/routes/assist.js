import { Router } from "express";
import dotnet from "dotenv";
import user from "../helpers/user.js";
import jwt from "jsonwebtoken";
import chat from "../helpers/chat.js";
import { ObjectId } from "mongodb";
import assistantFunctions from "../helpers/assist.js";
import OpenAI from "openai";

dotnet.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 60 * 1000,
});

let router = Router();

const CheckUser = async (req, res, next) => {
  jwt.verify(
    req.cookies?.userToken,
    process.env.JWT_PRIVATE_KEY,
    async (err, decoded) => {
      if (decoded) {
        let userData = null;

        try {
          userData = await user.checkUserFound(decoded);
        } catch (err) {
          if (err?.notExists) {
            res.clearCookie("userToken").status(405).json({
              status: 405,
              message: err?.text,
            });
          } else {
            res.status(500).json({
              status: 500,
              message: err,
            });
          }
        } finally {
          if (userData) {
            req.body.userId = userData._id;
            next();
          }
        }
      } else {
        res.status(405).json({
          status: 405,
          message: "Not Logged",
        });
      }
    }
  );
};



router.get("/", (req, res) => {
  res.send("Welcome to Assist api v1");
});

router.get("/getAssistant", async (req, res) => {
  try {
    const response = await assistantFunctions.getAssistant();
    
    // Check if response is valid or handle accordingly
    if (!response) {
      res.status(500).json({
        status: 500,
        message: 'Failed to get assistant data',
      });
    } else {
      res.status(200).json({
        status: 200,
        data: response,
      });
    }
  } catch (error) {
    console.error("Error in getAssistant route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});


router.post("/createThread", async (req, res) => {
    const response = await openai.beta.threads.create();
    // Check if response is valid or handle accordingly
    const userId = "afaan";
    if (!response) {
      res.status(500).json({
        status: 500,
        message: 'Failed to create thread',
      });
    } else {
      // Extract threadId from the response
      const threadId = response.id;

      // Save threadId and user information to the database
      await assistantFunctions.saveThreadAndUser(userId, threadId);

      res.status(200).json({
        status: 200,
        data: {
          threadId,
        },
      });
    }

});

router.post("/getThread", async (req, res) => {
  try {
    const { threadId } = req.body;

    // Check if threadId is provided
    if (!threadId) {
      return res.status(400).json({
        status: 400,
        message: 'Thread ID is required in the request body',
      });
    }

    const response = await assistantFunctions.getThread({ threadId });
    
    // Check if response is valid or handle accordingly
    if (response.error) {
      res.status(500).json({
        status: 500,
        message: response.message,
      });
    } else {
      res.status(200).json({
        status: 200,
        data: response,
      });
    }
  } catch (error) {
    console.error("Error in getThread route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});

router.post("/deleteThread", async (req, res) => {
  try {
    const { threadId } = req.body;

    // Check if threadId is provided
    if (!threadId) {
      return res.status(400).json({
        status: 400,
        message: 'Thread ID is required in the request body',
      });
    }

    const response = await assistantFunctions.deleteThread({ threadId });

    // Check if response is valid or handle accordingly
    if (response.error) {
      res.status(500).json({
        status: 500,
        message: response.message,
      });
    } else {
      res.status(200).json({
        status: 200,
        data: response,
      });
    }
  } catch (error) {
    console.error("Error in deleteThread route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});



router.post("/addMessage", async (req, res) => {
  try {
    const { threadId, message, messageId, userId, name } = req.body;

    // Check if all required parameters are provided
    if (!threadId || !message || !messageId || !userId || !name) {
      return res.status(400).json({
        status: 400,
        message: 'All parameters (threadId, message, messageId, userId, name) are required in the request body',
      });
    }

    const response = await assistantFunctions.addMessage({
      threadId,
      message,
      messageId,
      userId,
      name,
    });

    res.status(200).json({
      status: 200,
      data: response,
    });
  } catch (error) {
    console.error("Error in addMessage route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});


router.post("/getMessages", async (req, res) => {
  try {
    const { threadId } = req.body;

    // Check if threadId is provided
    if (!threadId) {
      return res.status(400).json({
        status: 400,
        message: 'Thread ID is required in the request body',
      });
    }

    const response = await assistantFunctions.getMessages({ threadId });

    res.status(200).json({
      status: 200,
      data: response,
    });
  } catch (error) {
    console.error("Error in getMessages route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});


router.post("/startRun", async (req, res) => {
  try {
    const { threadId, instructions } = req.body;

    // Check if threadId is provided
    if (!threadId) {
      return res.status(400).json({
        status: 400,
        message: 'Thread ID is required in the request body',
      });
    }

    const response = await assistantFunctions.startRun({ threadId, instructions });

    res.status(200).json({
      status: 200,
      data: response,
    });
  } catch (error) {
    console.error("Error in startRun route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});


router.post("/getRun", async (req, res) => {
  try {
    const { threadId, runId } = req.body;

    // Check if both threadId and runId are provided
    if (!threadId || !runId) {
      return res.status(400).json({
        status: 400,
        message: 'Both threadId and runId are required in the request body',
      });
    }

    const response = await assistantFunctions.getRun({ threadId, runId });

    res.status(200).json({
      status: 200,
      data: response,
    });
  } catch (error) {
    console.error("Error in getRun route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});

// router.post("/submitOutputs", async (req, res) => {
//   try {
//     const { threadId, runId, tool_outputs } = req.body;

//     // Check if both threadId and runId are provided
//     if (!threadId || !runId) {
//       return res.status(400).json({
//         status: 400,
//         message: 'Both threadId and runId are required in the request body',
//       });
//     }

//     const response = await assistantFunctions.submitOutputs({
//       threadId,
//       runId,
//       tool_outputs,
//     });

//     res.status(200).json({
//       status: 200,
//       data: response,
//     });
//   } catch (error) {
//     console.error("Error in submitOutputs route:", error);
//     res.status(500).json({
//       status: 500,
//       message: 'Internal Server Error',
//     });
//   }
// });


router.post("/chatCompletion", async (req, res) => {
  try {
    const { model, max_tokens, temperature, messages, tools } = req.body;

    // Check if required parameters are provided
    if (!model || !messages) {
      return res.status(400).json({
        status: 400,
        message: 'Both model and messages are required in the request body',
      });
    }

    const response = await assistantFunctions.chatCompletion({
      model,
      max_tokens,
      temperature,
      messages,
      tools,
    });

    res.status(200).json({
      status: 200,
      data: response,
    });
  } catch (error) {
    console.error("Error in chatCompletion route:", error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
});







export default router;
