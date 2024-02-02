import { Router } from "express";
import dotnet from "dotenv";
import user from "../helpers/user.js";
import jwt from "jsonwebtoken";
import chat from "../helpers/chat.js";

import assistantFunctions from "../helpers/assistChat.js";
import { sendErrorEmail } from "../mail/send.js";



dotnet.config();

let sendingError=''
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
  res.send("Welcome to chatGPT api v1");
});


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
  let response = {};

  try{
  const { prompt, userId } = req.body;

  const chatId = await assistantFunctions.createThread()

  const addMessage=await assistantFunctions.addMessage(chatId,prompt)
  const startRun=await assistantFunctions.startRun(chatId)

  const result=await assistantFunctions.getRunStatus(chatId,startRun)

  const mess=await assistantFunctions.getMessages(chatId)
  const user=mess.data.UserMessage
  const assist=mess.data.AssistantMessage

  response.openai = assist;
  response.db = await chat.newResponse(prompt, response, userId, chatId);

    
  } catch (err) {
    sendingError = "Error in post" + err;

    sendErrorEmail(sendingError);

    res.status(500).json({
      status: 500,
      message: err,
    });
    return;
  }

  if (response.db && response.openai) {

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
  let file = null;
  let filename  = null;
  const filelocation = req.file;



  let response = {};
  try {

    if (filelocation){
        filename = await assistantFunctions.uploadFile(filelocation)
        console.log("Filename", filename)
        await chat.updateOrAddFileId(userId,chatId,filename)
        console.log("Entered File Location")
    }

    file =await chat.fetchFileIds(userId,chatId)

    console.log("File ID in PUT: ",file)
    const addMessage = await assistantFunctions.addMessage(
      chatId,
      prompt,
      file
    );
    const startRun = await assistantFunctions.startRun(chatId);

    const result = await assistantFunctions.getRunStatus(chatId, startRun);

    const mess=await assistantFunctions.getMessages(chatId)
    const user=mess.data.UserMessage
    const assist=mess.data.AssistantMessage
    response.openai = assist;

  response.db = await chat.updateChat(chatId, user, response, userId);

  } catch (err) {
    // sendingError = "Error in put chat" + err;

    // sendErrorEmail(err);

    console.log("err :" + err);
    res.status(500).json({
      status: 500,
      message: err,
    });
    return;
  }

  if (response.db && response.openai) {
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
router.post("/generateInvitationCodes", async (req, res) => {
  const { n, partner_name } = req.body; // Assuming 'n' is the number of codes to generate

  try {
    if (!n || isNaN(n) || n <= 0 || !partner_name) {
      return res.status(400).json({ error: 'Invalid or missing values for n or partner_name.' });
    }

    const result = await chat.generateAndInsertInvitationCodes(parseInt(n), partner_name);
    console.log(result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/fetchInvitationCodesByPartnerName", async (req, res) => {
  const { partner_name } = req.body;

  try {
    if (!partner_name) {
      return res.status(400).json({ error: 'Invalid or missing partner_name.' });
    }

    const codes = await chat.fetchInvitationCodesByPartnerName(partner_name);
    res.status(200).json({ codes });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/checkCodeAvailability", async (req, res) => {
  const { code } = req.body;

  try {
    if (!code) {
      return res.status(400).json({ error: 'Invalid or missing code.' });
    }

    const result = await chat.checkCodeAvailability(code);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post("/deleteCode", async (req, res) => {
  const { code,userId } = req.body;

  try {
    if (!code) {
      return res.status(400).json({ error: 'Invalid or missing code.' });
    }

    const result = await chat.deleteCode(userId,code);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
export default router;