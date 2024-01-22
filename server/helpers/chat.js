import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import { ObjectId } from "mongodb";

let chatId; // Declare the chatId variable outside the exported object

const chatHelper = {
  newResponse: (prompt, { openai }, userId,chatId) => {
    return new Promise(async (resolve, reject) => {
      // chatId = new ObjectId().toHexString();
      console.log("helper chatId", chatId);
      console.log("helper userId", userId);

      let res = null;
      try {
        await db
          .collection(collections.CHAT)
          .createIndex({ user: 1 }, { unique: true });
        res = await db.collection(collections.CHAT).insertOne({
          user: userId.toString(),
          data: [
            {
              chatId,
              chats: [
                {
                  prompt,
                  content: openai,
                },
              ],
            },
          ],
        });
      } catch (err) {
        if (err?.code === 11000) {
          res = await db
            .collection(collections.CHAT)
            .updateOne(
              {
                user: userId.toString(),
              },
              {
                $push: {
                  data: {
                    chatId,
                    chats: [
                      {
                        prompt,
                        content: openai,
                      },
                    ],
                  },
                },
              }
            )
            .catch((err) => {
              reject(err);
            });
        } else {
          reject(err);
        }
      } finally {
        if (res) {
          res.chatId = chatId;
          // console.log("res helpper",res.chatId)
          resolve(res);
        } else {
          reject({ text: "DB gets something wrong" });
        }
      }
    });
  },

  updateChat: (chatId, prompt, { openai }, userId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
        .collection(collections.CHAT)
        .updateOne(
          {
            user: userId.toString(),
            "data.chatId": chatId,
          },
          {
            $push: {
              "data.$.chats": {
                prompt,
                content: openai,
              },
            },
          }
        )
        .catch((err) => {
          reject(err);
        });

      if (res) {
        resolve(res);
      } else {
        reject({ text: "DB gets something wrong" });
      }
    });
  },
   getChat: (userId, chatId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
        .collection(collections.CHAT)
        .aggregate([
          {
            $match: {
              user: userId.toString(),
            },
          },
          {
            $unwind: "$data",
          },
          {
            $match: {
              "data.chatId": chatId,
            },
          },
          {
            $project: {
              _id: 0,
              chat: "$data.chats",
            },
          },
        ])
        .toArray()
        .catch((err) => [
          reject(err),
        ]);

      if (res && Array.isArray(res) && res[0]?.chat) {
        resolve(res[0].chat);
      } else {
        reject({ status: 404 });
      }
    });
  },
  getHistory: (userId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
        .collection(collections.CHAT)
        .aggregate([
          {
            $match: {
              user: userId.toString(),
            },
          },
          {
            $unwind: "$data",
          },
          {
            $project: {
              _id: 0,
              chatId: "$data.chatId",
              prompt: {
                $arrayElemAt: ["$data.chats.prompt", 0],
              },
            },
          },
          {
            $limit: 100,
          },
          {
            $sort: {
              chatId: -1,
            },
          },
        ])
        .toArray()
        .catch((err) => {
          reject(err);
        });

      if (Array.isArray(res)) {
        resolve(res);
      } else {
        reject({ text: "DB Getting Some Error" });
      }
    });
  },
  deleteAllChat: (userId) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.CHAT)
        .deleteOne({
          user: userId.toString(),
        })
        .then((res) => {
          if (res?.deletedCount > 0) {
            resolve(res);
          } else {
            reject({ text: "DB Getting Some Error" });
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  saveConversation: (chatId, conversation) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.CONVERSATION)
        .updateOne(
          { chatId },
          { $set: { conversation } },
          { upsert: true } // This will create a new document if chatId doesn't exist
        )
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },


  getConversation: (chatId) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.CONVERSATION)
        .findOne({
          chatId,
        })
        .then((res) => {
          if (res) {
            resolve(res.conversation);
          } else {
            reject({ status: 404 });
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },



  saveModelType: (userId, modelType={ defaultValue: 'gpt-3.5-turbo' }) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.SETTING)
        .updateOne(
          { userId },
          { $set: { modelType } },
          { upsert: true } // This will create a new document if userId doesn't exist
        )
        .then((res) => {
          resolve(res);
          console.log(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  getModelType: (userId, defaultValue = { defaultValue: 'gpt-3.5-turbo' }) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.SETTING)
        .findOne({
          userId,
        })
        .then((res) => {
          if (res) {
            resolve(res.modelType);
            console.log("found model type " + res.modelType);
          } else {
            // Return the default value if modelType is not found
            resolve(defaultValue);
            console.log("default model type " + res.modelType);

          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  

};


export default chatHelper;
