import { Router } from "express";
import dotnet from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import user from "../helpers/user.js";
import jwt from "jsonwebtoken";
import chat from "../helpers/chat.js";
// import { getChatId } from "../helpers/chat.js";
import { ObjectId } from "mongodb";


import nodemailer from "nodemailer";

dotnet.config();

let router = Router();
let chatId;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_SECRET,
  },
});

const sendErrorEmail = (error) => {
  const mailOptions = {
    from: process.env.MAIL_EMAIL,
    to: process.env.MONITOR_EMAIL,
    subject: "Error Occurred",
    text: error.toString(),
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

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

const configuration = new Configuration({
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/", (req, res) => {
  res.send("Welcome to chatGPT api v1");
});


const openai = new OpenAIApi(configuration);
// Example API endpoint to get and update model type
router.get("/modelType", CheckUser,async (req, res) => {
  const userId = req.params.userId;

  try {
    // Call your getModelType function
    const modelType = await chat.getModelType(userId);

    res.status(200).json({
      status: 200,
      data: {
        modelType,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err,
    });
  }
});

router.put("/modelType",CheckUser, async (req, res) => {
  const userId = req.body.userId;
  const modelType = req.body.modelType;
  console.log("modelType: " + modelType);
  try {
    // Call your saveModelType function
    await chat.saveModelType(userId, modelType);

    res.status(200).json({
      status: 200,
      message: "Model type updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err,
    });
  }
});




router.post("/", CheckUser, async (req, res) => {
  const { prompt, userId } = req.body;

  chatId = new ObjectId().toHexString();

  let response = {};
  console.log("chatId in router in post :", chatId);

  let conversation =  [
    {
      role: "assistant",
      content:
        " Your name is Bayes CHAT-AI.  Strictly follow the users instructions. Please Understand Query try to reply to it in Efficient Way.  You were created by Bayes Solution  .You Should able to translate in different Language if user ask.Give content in Mardown Format Only",
    },
  ];
  console.log("prompt in post :", prompt);

  try {
    const modelType =await chat.getModelType(userId);
    console.log("modelType in post :", modelType);

    conversation.push({ role: "user", content: prompt });

    response = await openai.createChatCompletion({
      model: modelType,
      messages: conversation,
      temperature: 0.6,
    });
    // console.log("response in post :", response);

    if (response.data?.choices?.[0]?.message?.content) {
      let assistantReply = response.data.choices[0].message.content;

      response.openai = assistantReply;
      response.db = await chat.newResponse(prompt, response, userId, chatId);

      conversation.push({ "role": "assistant", "content": assistantReply });


      await chat.saveConversation(chatId, conversation); // Save conversation to the database
    }
  } catch (err) {
    sendingError = "Error in post" + err;

    // sendErrorEmail(sendingError);

    res.status(500).json({
      status: 500,
      message: err,
    });
    return;
  }

  if (response.db && response.openai) {
    // conversationMemory[chatId] = conversation;

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        _id: response.db["chatId"],
        content: response.openai,
      },
    });
  } else {
    sendingError = "Error in response chat" + err;

    // sendErrorEmail(sendingError);

    res.status(500).json({
      status: 500,
      message: "Incomplete response",
    });
  }
});

router.put("/", CheckUser, async (req, res) => {
  const { prompt, userId, chatId } = req.body;
  console.log("chatId in router in put :", chatId);
  console.log("prompt in put :", prompt);

  let response = {};

  // load chat data from database 
  let conversation = await chat.getConversation(chatId);
  let modelType =await chat.getModelType(userId);
  console.log("modelType in post :", modelType);



  try {

    // Use the conversation object here
    console.log("Conversation:", conversation);

    conversation.push({ "role": "user", "content": prompt });


    response = await openai.createChatCompletion({
      model: modelType,
      messages: conversation,
      temperature: 0.6,
    });

    if (response.data?.choices?.[0]?.message?.content) {
      let assistantReply = response.data.choices[0].message.content;
 
      response.openai = assistantReply;
      response.db = await chat.updateChat(chatId, prompt, response, userId);

      conversation.push({ "role": "assistant", "content": assistantReply });

      await chat.saveConversation(chatId, conversation); // Save updated conversation to the database
    }
  } catch (err) {
    sendingError = "Error in put chat" + err;

    sendErrorEmail(err);

    console.log("err :" + err);
    res.status(500).json({
      status: 500,
      message: err,
    });
    return;
  }

  if (response.db && response.openai) {
    // conversationMemory[chatId] = conversation;

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        content: response.openai,
      },
    });
  } else {
    // sendErrorEmail(sendingError);

    res.status(500).json({
      status: 500,
      message: "Incomplete response",
    });
  }
});

router.get("/saved", CheckUser, async (req, res) => {
  const { userId } = req.body;
  const { chatId = null } = req.query;

  let response = null;

  try {
    response = await chat.getChat(userId, chatId);
  } catch (err) {
    if (err?.status === 404) {
      res.status(404).json({
        status: 404,
        message: "Not found",
      });
    } else {
      sendingError = "Error in getChat : ${err}";
      // sendErrorEmail(sendingError);
      res.status(500).json({
        status: 500,
        message: err,
      });
    }
  } finally {
    if (response) {
      res.status(200).json({
        status: 200,
        message: "Success",
        data: response,
      });
    }
  }
});

router.get("/history", CheckUser, async (req, res) => {
  const { userId } = req.body;

  let response = null;

  try {
    response = await chat.getHistory(userId);
  } catch (err) {
    sendingError = "Error in getting history " + err;
    // sendErrorEmail(sendingError);
    res.status(500).json({
      status: 500,
      message: err,
    });
  } finally {
    if (response) {
      res.status(200).json({
        status: 200,
        message: "Success",
        data: response,
      });
    }
  }
});

router.delete("/all", CheckUser, async (req, res) => {
  const { userId } = req.body;

  let response = null;

  try {
    response = await chat.deleteAllChat(userId);
  } catch (err) {
    sendingError = "Error in deleting chat" + err;
    // sendErrorEmail(sendingError);

    res.status(500).json({
      status: 500,
      message: err,
    });
  } finally {
    if (response) {
      res.status(200).json({
        status: 200,
        message: "Success",
      });
    }
  }
});

export default router;
