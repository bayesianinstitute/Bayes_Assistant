import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import user from "./user.js";


const chatHelper = {
  newResponse: (prompt, { openai }, userId, chatId, file) => {
    return new Promise(async (resolve, reject) => {
      let res = null;
      try {
        await db.collection(collections.CHAT).createIndex({ user: 1 }, { unique: true });
        const data = {
          chatId,
          chats: [
            {
              prompt,
              content: openai,
            },
          ],
        };
        if (file !== null) {
          data.file_id = [file];
        }
        res = await db.collection(collections.CHAT).insertOne({
          user: userId.toString(),
          data: [data],
        });
      } catch (err) {
        if (err?.code === 11000) {
          const dataToUpdate = {
            chatId,
            chats: [
              {
                prompt,
                content: openai,
              },
            ],
          };
          if (file !== null) {
            dataToUpdate.file_id = [file];
          }
          res = await db
            .collection(collections.CHAT)
            .updateOne(
              {
                user: userId.toString(),
              },
              {
                $push: {
                  data: dataToUpdate,
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
          resolve(res);
        } else {
          reject({ text: "DB gets something wrong" });
        }
      }
    });
  },

  updateChat: (chatId, prompt, { openai }, userId) => {
    console.log(chatId, prompt,openai,userId);
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

  fetchFileIds: async (userId, chatId) => {
    try {
      const result = await db.collection(collections.CHAT).findOne({
        user: userId.toString(),
        "data.chatId": chatId,
      }, { "data.$": 1 });
  
      if (result && result.data && result.data.length > 0) {
        const fileIds = result.data[0].file_id;
        return fileIds ? fileIds.filter(id => id !== null).flat() : [];
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching file IDs:", error);
      throw error;
    }
  },
  

  updateOrAddFileId: async (userId, chatId, fileId) => {
    try {
      // Check if the file ID already exists for the given user and chat
      const existingChat = await db.collection(collections.CHAT).findOne({
        user: userId.toString(),
        "data.chatId": chatId,
        "data.file_id": fileId,
      });
  
      if (existingChat) {
        console.log("File already exists in updateOrAddFileId ");
        return;
      } else {
        // If the file ID does not exist, add it to the database
        const result = await db.collection(collections.CHAT).updateOne(
          {
            user: userId.toString(),
            "data.chatId": chatId,
          },
          {
            $addToSet: { "data.$.file_id": fileId },
          }
        );
  
        if (result.modifiedCount === 0) {
          // If no document is modified, it means there's no chat entry for the given user and chat ID, so we need to create a new one
          await db.collection(collections.CHAT).insertOne({
            user: userId.toString(),
            data: [{ chatId, file_id: [fileId], chats: [] }],
          });
        }
      }
    } catch (error) {
      console.error("Error updating or adding file ID:", error);
      throw error;
    }
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
  generateAndInsertInvitationCodes: (n, partner_name) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existingCodes = await db.collection(collections.INVITATION).distinct('codes');
  
        const codes = Array.from({ length: n }, () => {
          let code;
          do {
            code = Math.floor(Math.random() * 900000) + 100000;
          } while (existingCodes.includes(code.toString()));
  
          return code.toString();
        });
  
        const invitationDocument = {
          partner_name: partner_name,
          codes: codes,
        };
  
        await db.collection(collections.INVITATION).insertOne(invitationDocument);
  
        resolve({ message: `${n} unique Invitation codes generated and inserted successfully.` });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  
  
  fetchInvitationCodesByPartnerName: (partner_name) => {
    return new Promise(async (resolve, reject) => {
      try {
        const codes = await db.collection(collections.INVITATION)
          .find({ partner_name: partner_name })
          .toArray();
  
        resolve(codes);
      } catch (error) {
        console.error('Error fetching invitation codes by partner name:', error);
        reject('Error fetching invitation codes by partner name.');
      }
    });
  },
  checkCodeAvailability: (code) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await db.collection(collections.INVITATION)
          .findOne({ codes: code });
  
        if (result) {
          const partner_name = result.partner_name || null;
          resolve({
            available: true,
            partner_name: partner_name
          });
        } else {
          resolve({
            available: false,
            partner_name: null
          });
        }
      } catch (error) {
        console.error('Error checking code availability:', error);
        reject('Error checking code availability.');
      }
    });
  },
  deleteCode: (userId, code) => {
    return new Promise(async (resolve, reject) => {
      try {
        const now = new Date();
        const invitationDocument = await db.collection(collections.INVITATION)
          .findOne({ codes: code });
  
        if (!invitationDocument) {
          resolve({ message: `Code ${code} not found.` });
          return;
        }
  
        const result = await db.collection(collections.INVITATION)
          .updateOne(
            { codes: code },
            { $pull: { codes: code } }
          );
  
        if (result.modifiedCount > 0) {
          const invitationUsageDocument = {
            userId: userId,
            code: code,
            createdDate: now.toISOString(),
          };
  
          await db.collection(collections.INVITATIONUSAGE).insertOne(invitationUsageDocument);
  

          setTimeout(async () => {
            await db.collection(collections.INVITATIONUSAGE).deleteOne({ code: code });
          }, 60000); // 1 minute in milliseconds
  
          resolve({ message: `Code ${code} deleted successfully and assigned to INVITATIONUSAGE.` });
        } else {
          resolve({ message: `Code ${code} not found.` });
        }
      } catch (error) {
        console.error('Error deleting code:', error);
        reject('Error deleting code.');
      }
    });
  },

};


export default chatHelper;
